import { NextRequest, NextResponse } from 'next/server'
import { ensureIngestionTables, getJob } from '@/lib/ingestion/document-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Polling fallback for job progress (the SSE endpoint is preferred).
 * GET /api/jobs/:jobId
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    await ensureIngestionTables()
    const { jobId } = await params
    if (!UUID_REGEX.test(jobId)) {
      return NextResponse.json({ error: 'Invalid job id' }, { status: 400 })
    }

    const job = await getJob(jobId)
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const elapsedMs = job.started_at
      ? (job.finished_at ? new Date(job.finished_at).getTime() : Date.now()) -
        new Date(job.started_at).getTime()
      : 0

    return NextResponse.json({
      jobId: job.id,
      documentId: job.document_id,
      status: job.status,
      progress: job.progress,
      total: job.total,
      lastChunkIdx: job.last_chunk_idx,
      errorMsg: job.error_msg,
      elapsedMs: Math.max(0, elapsedMs),
    })
  } catch (err) {
    console.error('[GET /api/jobs/:jobId] error:', err)
    return NextResponse.json({ error: 'Failed to read job' }, { status: 500 })
  }
}
