import { supabase } from '../supabase'
import type { DocumentRow, JobRow, JobStatus } from './types'

/**
 * All DB access for the ingestion feature lives here. Uses the SAME Supabase
 * service-role client as the rest of the app (lib/supabase.ts).
 */

let dbReady = false

/**
 * Verify the ingestion tables exist, creating them via exec_sql if the helper
 * is available. Mirrors the pattern in lib/supabase.ts / api/chat/route.ts.
 */
export async function ensureIngestionTables(): Promise<void> {
  if (dbReady) return
  const { error } = await supabase.from('documents').select('id').limit(1)
  if (!error) {
    dbReady = true
    return
  }

  // Fall back to exec_sql (may not exist on all Supabase projects).
  try {
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT NOT NULL,
          filename TEXT NOT NULL,
          file_hash TEXT NOT NULL,
          size_bytes BIGINT NOT NULL DEFAULT 0,
          page_count INTEGER NOT NULL DEFAULT 0,
          chunk_count INTEGER NOT NULL DEFAULT 0,
          storage_path TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_user_hash ON documents(user_id, file_hash);
        CREATE TABLE IF NOT EXISTS jobs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
          status TEXT NOT NULL DEFAULT 'queued',
          progress NUMERIC NOT NULL DEFAULT 0,
          total INTEGER NOT NULL DEFAULT 0,
          last_chunk_idx INTEGER NOT NULL DEFAULT 0,
          cancel_flag BOOLEAN NOT NULL DEFAULT FALSE,
          error_msg TEXT,
          started_at TIMESTAMPTZ,
          finished_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `,
    })
  } catch {
    console.warn(
      '⚠️ Could not auto-create ingestion tables. Run supabase/migrations/003_create_document_ingestion_tables.sql'
    )
  }
  dbReady = true
}

/* -------------------------------------------------------------------------- */
/*  Documents                                                                  */
/* -------------------------------------------------------------------------- */

export async function findDocumentByHash(
  userId: string,
  fileHash: string
): Promise<DocumentRow | null> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId)
    .eq('file_hash', fileHash)
    .maybeSingle()
  if (error) throw new Error(`findDocumentByHash failed: ${error.message}`)
  return (data as DocumentRow) || null
}

export async function createDocument(input: {
  userId: string
  filename: string
  fileHash: string
  sizeBytes: number
  storagePath: string | null
}): Promise<DocumentRow> {
  const { data, error } = await supabase
    .from('documents')
    .insert({
      user_id: input.userId,
      filename: input.filename,
      file_hash: input.fileHash,
      size_bytes: input.sizeBytes,
      storage_path: input.storagePath,
    })
    .select()
    .single()
  if (error) throw new Error(`createDocument failed: ${error.message}`)
  return data as DocumentRow
}

export async function getDocument(docId: string): Promise<DocumentRow | null> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', docId)
    .maybeSingle()
  if (error) throw new Error(`getDocument failed: ${error.message}`)
  return (data as DocumentRow) || null
}

export async function listDocuments(userId: string): Promise<DocumentRow[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw new Error(`listDocuments failed: ${error.message}`)
  return (data as DocumentRow[]) || []
}

export async function updateDocumentStats(
  docId: string,
  patch: { pageCount?: number; chunkCount?: number }
): Promise<void> {
  const update: Record<string, unknown> = {}
  if (patch.pageCount !== undefined) update.page_count = patch.pageCount
  if (patch.chunkCount !== undefined) update.chunk_count = patch.chunkCount
  if (Object.keys(update).length === 0) return
  const { error } = await supabase.from('documents').update(update).eq('id', docId)
  if (error) throw new Error(`updateDocumentStats failed: ${error.message}`)
}

export async function deleteDocument(docId: string): Promise<void> {
  const { error } = await supabase.from('documents').delete().eq('id', docId)
  if (error) throw new Error(`deleteDocument failed: ${error.message}`)
}

/* -------------------------------------------------------------------------- */
/*  Jobs                                                                       */
/* -------------------------------------------------------------------------- */

export async function createJob(documentId: string): Promise<JobRow> {
  const { data, error } = await supabase
    .from('jobs')
    .insert({ document_id: documentId, status: 'queued' })
    .select()
    .single()
  if (error) throw new Error(`createJob failed: ${error.message}`)
  return data as JobRow
}

export async function getJob(jobId: string): Promise<JobRow | null> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle()
  if (error) throw new Error(`getJob failed: ${error.message}`)
  return (data as JobRow) || null
}

export async function getActiveJobForDocument(
  documentId: string
): Promise<JobRow | null> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('document_id', documentId)
    .in('status', ['queued', 'validating', 'splitting', 'chunking', 'embedding', 'storing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`getActiveJobForDocument failed: ${error.message}`)
  return (data as JobRow) || null
}

/**
 * Most recent job for a document, regardless of status. Used to decide whether
 * a re-upload of identical content should be re-processed (retry) or reported
 * as an in-flight duplicate.
 */
export async function getLatestJobForDocument(
  documentId: string
): Promise<JobRow | null> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`getLatestJobForDocument failed: ${error.message}`)
  return (data as JobRow) || null
}

export async function updateJob(
  jobId: string,
  patch: Partial<{
    status: JobStatus
    progress: number
    total: number
    last_chunk_idx: number
    cancel_flag: boolean
    error_msg: string | null
    started_at: string | null
    finished_at: string | null
  }>
): Promise<void> {
  const { error } = await supabase.from('jobs').update(patch).eq('id', jobId)
  if (error) throw new Error(`updateJob failed: ${error.message}`)
}

/**
 * Atomic-ish checkpoint after each batch: progress + lastChunkIdx + status.
 * Single UPDATE statement → both columns move together (the resume anchor).
 */
export async function checkpointJob(
  jobId: string,
  patch: { progress: number; lastChunkIdx: number; status?: JobStatus }
): Promise<void> {
  const update: Record<string, unknown> = {
    progress: Math.max(0, Math.min(100, Math.round(patch.progress))),
    last_chunk_idx: patch.lastChunkIdx,
  }
  if (patch.status) update.status = patch.status
  const { error } = await supabase.from('jobs').update(update).eq('id', jobId)
  if (error) throw new Error(`checkpointJob failed: ${error.message}`)
}

export async function setCancelFlag(jobId: string): Promise<void> {
  const { error } = await supabase
    .from('jobs')
    .update({ cancel_flag: true })
    .eq('id', jobId)
  if (error) throw new Error(`setCancelFlag failed: ${error.message}`)
}

export async function listJobsForDocument(documentId: string): Promise<JobRow[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`listJobsForDocument failed: ${error.message}`)
  return (data as JobRow[]) || []
}

/**
 * Jobs that were mid-flight when the server last stopped. Used by the worker
 * to resume from `last_chunk_idx` instead of re-embedding everything.
 */
export async function listInterruptedJobs(): Promise<JobRow[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .in('status', ['validating', 'splitting', 'chunking', 'embedding', 'storing'])
    .order('created_at', { ascending: true })
  if (error) throw new Error(`listInterruptedJobs failed: ${error.message}`)
  return (data as JobRow[]) || []
}
