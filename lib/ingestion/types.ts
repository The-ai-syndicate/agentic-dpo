/**
 * Shared types for the document ingestion pipeline.
 * Additive only — nothing here is imported by the existing chat flow.
 */

export type JobStatus =
  | 'queued'
  | 'validating'
  | 'splitting'
  | 'chunking'
  | 'embedding'
  | 'storing'
  | 'done'
  | 'cancelled'
  | 'failed'

/** A row in the `documents` table. */
export interface DocumentRow {
  id: string
  user_id: string
  filename: string
  file_hash: string
  size_bytes: number
  page_count: number
  chunk_count: number
  storage_path: string | null
  created_at: string
}

/** A row in the `jobs` table. */
export interface JobRow {
  id: string
  document_id: string
  status: JobStatus
  progress: number
  total: number
  last_chunk_idx: number
  cancel_flag: boolean
  error_msg: string | null
  started_at: string | null
  finished_at: string | null
  created_at: string
  updated_at: string
}

/** A logical section produced by the SPLIT stage. */
export interface Section {
  /** Page number (PDF) or 1-based section index for other formats. */
  page: number
  /** Heading/label detected for this section, if any. */
  heading?: string
  text: string
}

/** A chunk ready to be embedded, with the metadata the pipeline tracks. */
export interface Chunk {
  index: number
  text: string
  page: number
}

/** Shape emitted over the SSE / polling endpoint. */
export interface JobProgress {
  jobId: string
  status: JobStatus
  progress: number
  total: number
  lastChunkIdx: number
  errorMsg: string | null
  elapsedMs: number
}
