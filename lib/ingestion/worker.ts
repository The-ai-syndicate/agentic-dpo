import {
  ensureIngestionTables,
  getJob,
  getDocument,
  updateJob,
  checkpointJob,
  listInterruptedJobs,
  updateDocumentStats,
} from './document-service'
import { readFile } from './storage'
import { splitDocument } from './extractors'
import { chunkSections } from './splitter'
import { embedAndStoreBatch, deleteVectorsByDocId } from './pinecone-writer'
import type { JobRow } from './types'

/**
 * In-process background worker.
 *
 * Chosen because the project has no Redis/BullMQ/etc. and runs as a single
 * Next.js server process. The DATABASE is the source of truth:
 *   - the upload route only enqueues (returns in <2s),
 *   - this worker drains the queue,
 *   - every stage + every batch is checkpointed to the `jobs` row,
 *   - on boot, interrupted jobs are resumed from `last_chunk_idx`.
 *
 * This survives within one server process (acceptable for low volume). The DB
 * checkpointing means a crash/restart resumes rather than re-embedding.
 */

const EMBED_BATCH = Number(process.env.INGESTION_BATCH || 100)

type QueueItem = { jobId: string; requeued?: boolean }

class IngestionQueue {
  private queue: QueueItem[] = []
  private running = false
  private draining = false

  enqueue(jobId: string, requeued = false) {
    this.queue.push({ jobId, requeued })
    // Kick the drain loop (fire-and-forget).
    void this.drain()
  }

  private async drain() {
    if (this.draining) return
    this.draining = true
    try {
      while (this.queue.length > 0) {
        const item = this.queue.shift()!
        this.running = true
        try {
          await processJob(item.jobId)
        } catch (err) {
          console.error(`[ingestion] job ${item.jobId} crashed:`, err)
          await updateJob(item.jobId, {
            status: 'failed',
            error_msg: err instanceof Error ? err.message : String(err),
            finished_at: new Date().toISOString(),
          }).catch(() => {})
        } finally {
          this.running = false
        }
      }
    } finally {
      this.draining = false
    }
  }

  get size() {
    return this.queue.length
  }
  get isRunning() {
    return this.running
  }
}

// Persist the singleton across hot reloads in dev.
const globalForQueue = globalThis as unknown as { __ingestionQueue?: IngestionQueue }
export const ingestionQueue =
  globalForQueue.__ingestionQueue || (globalForQueue.__ingestionQueue = new IngestionQueue())

let recoveryRan = false

/**
 * Called lazily on first enqueue. Resumes any jobs left mid-flight by a
 * previous process (or an earlier boot of this one).
 */
export async function recoverInterruptedJobs(): Promise<void> {
  if (recoveryRan) return
  recoveryRan = true
  try {
    await ensureIngestionTables()
    const jobs = await listInterruptedJobs()
    if (jobs.length === 0) return
    console.log(`[ingestion] resuming ${jobs.length} interrupted job(s)`)
    for (const job of jobs) {
      ingestionQueue.enqueue(job.id, true)
    }
  } catch (e) {
    console.warn('[ingestion] recovery skipped:', e)
  }
}

/* -------------------------------------------------------------------------- */
/*  Job processing                                                             */
/* -------------------------------------------------------------------------- */

async function isCancelled(jobId: string): Promise<boolean> {
  const job = await getJob(jobId)
  return !!job?.cancel_flag
}

async function processJob(jobId: string): Promise<void> {
  const job = await getJob(jobId)
  if (!job) {
    console.warn(`[ingestion] job ${jobId} not found`)
    return
  }
  if (job.status === 'done' || job.status === 'cancelled' || job.status === 'failed') {
    return
  }
  const doc = await getDocument(job.document_id)
  if (!doc) {
    await updateJob(jobId, {
      status: 'failed',
      error_msg: 'Document row missing',
      finished_at: new Date().toISOString(),
    })
    return
  }

  const startedAt = job.started_at ? new Date(job.started_at).getTime() : Date.now()
  if (!job.started_at) {
    await updateJob(jobId, { started_at: new Date().toISOString() })
  }

  try {
    // -------- 1. VALIDATE --------
    await updateJob(jobId, { status: 'validating', progress: 1 })
    if (!doc.storage_path) throw new Error('Missing stored file path')
    const buffer = await readFile(doc.storage_path)
    if (buffer.length === 0) throw new Error('Stored file is empty')

    if (await isCancelled(jobId)) return finalizeCancelled(jobId)

    // -------- 2. SPLIT --------
    await updateJob(jobId, { status: 'splitting', progress: 3 })
    const { sections, pageCount } = await splitDocument(doc.filename, buffer)
    if (sections.length === 0) throw new Error('No extractable text found in file')
    await updateDocumentStats(doc.id, { pageCount })

    if (await isCancelled(jobId)) return finalizeCancelled(jobId)

    // -------- 3. CHUNK --------
    await updateJob(jobId, { status: 'chunking', progress: 6 })
    const chunks = chunkSections(sections)
    if (chunks.length === 0) throw new Error('Chunking produced no chunks')
    await updateJob(jobId, { total: chunks.length })
    await updateDocumentStats(doc.id, { chunkCount: chunks.length })

    if (await isCancelled(jobId)) return finalizeCancelled(jobId)

    // -------- 4 + 5. EMBED + STORE (batched, checkpointed) --------
    // Resume from the checkpoint: everything before last_chunk_idx is stored.
    let cursor = Math.max(0, job.last_chunk_idx || 0)
    await updateJob(jobId, { status: 'embedding' })

    while (cursor < chunks.length) {
      // Re-read the cancel flag between batches (source of truth = DB).
      if (await isCancelled(jobId)) {
        await cleanupVectors(job.document_id)
        return finalizeCancelled(jobId)
      }

      const batch = chunks.slice(cursor, cursor + EMBED_BATCH)
      await updateJob(jobId, { status: 'storing' })
      await embedAndStoreBatch(batch, {
        documentId: doc.id,
        userId: doc.user_id,
        filename: doc.filename,
        totalChunks: chunks.length,
        sourceType: (doc.filename.split('.').pop() || 'text').toLowerCase(),
      })
      await updateJob(jobId, { status: 'embedding' })

      cursor += batch.length
      // Progress: 6% base for prep, 94% for embedding/storing.
      const progress = 6 + (cursor / chunks.length) * 94
      await checkpointJob(jobId, { progress, lastChunkIdx: cursor })
    }

    // -------- 6. DONE --------
    await updateJob(jobId, {
      status: 'done',
      progress: 100,
      finished_at: new Date().toISOString(),
      error_msg: null,
    })
    console.log(
      `[ingestion] job ${jobId} done — ${chunks.length} chunks in ${Date.now() - startedAt}ms`
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[ingestion] job ${jobId} failed:`, message)
    await updateJob(jobId, {
      status: 'failed',
      error_msg: message,
      finished_at: new Date().toISOString(),
    })
    // Best-effort: drop partial vectors so retry starts clean.
    await cleanupVectors(job.document_id)
  }
}

async function finalizeCancelled(jobId: string): Promise<void> {
  await updateJob(jobId, {
    status: 'cancelled',
    finished_at: new Date().toISOString(),
    error_msg: null,
  })
  console.log(`[ingestion] job ${jobId} cancelled`)
}

async function cleanupVectors(documentId: string): Promise<void> {
  try {
    await deleteVectorsByDocId(documentId)
  } catch (e) {
    console.warn('[ingestion] cleanup of partial vectors failed (non-fatal):', e)
  }
}
