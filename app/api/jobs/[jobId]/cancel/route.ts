import { NextRequest, NextResponse } from 'next/server'
import {
  ensureIngestionTables,
  getJob,
  setCancelFlag,
} from '@/lib/ingestion/document-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Request cancellation of a running job. Sets `cancel_flag = true`; the worker
 * checks this between batches and cleans up partial vectors.
 * POST /api/jobs/:jobId/cancel
 */
export async function POST(
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

    if (job.status === 'done' || job.status === 'cancelled' || job.status === 'failed') {
      return NextResponse.json({ success: true, status: job.status, alreadyFinal: true })
    }

    await setCancelFlag(jobId)
    return NextResponse.json({ success: true, status: 'cancelling' })
  } catch (err) {
    console.error('[POST /api/jobs/:jobId/cancel] error:', err)
    return NextResponse.json({ error: 'Failed to cancel job' }, { status: 500 })
  }
}
