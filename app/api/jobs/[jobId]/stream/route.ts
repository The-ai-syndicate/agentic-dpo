import { NextRequest } from 'next/server'
import { ensureIngestionTables, getJob } from '@/lib/ingestion/document-service'
import type { JobProgress } from '@/lib/ingestion/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Server-Sent Events stream of job progress.
 *
 * Emits one JSON event per second: { status, progress, total, errorMsg,
 * elapsedMs }. Closes when the job reaches a terminal status. The DB row is
 * the single source of truth — no Redis, no in-memory pub/sub.
 *
 * GET /api/jobs/:jobId/stream
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  if (!UUID_REGEX.test(jobId)) {
    return new Response(JSON.stringify({ error: 'Invalid job id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  await ensureIngestionTables()

  const encoder = new TextEncoder()
  const TERMINAL = new Set(['done', 'cancelled', 'failed'])

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      let timer: ReturnType<typeof setInterval> | null = null

      const send = (event: string, data: unknown) => {
        if (closed) return
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          )
        } catch {
          closed = true
        }
      }

      const finish = () => {
        if (closed) return
        closed = true
        if (timer) clearInterval(timer)
        try {
          controller.close()
        } catch {
          /* already closed */
        }
      }

      const tick = async () => {
        if (closed) return
        try {
          const job = await getJob(jobId)
          if (!job) {
            send('error', { error: 'Job not found' })
            finish()
            return
          }
          const elapsedMs = job.started_at
            ? (job.finished_at ? new Date(job.finished_at).getTime() : Date.now()) -
              new Date(job.started_at).getTime()
            : 0

          const payload: JobProgress = {
            jobId: job.id,
            status: job.status,
            progress: Math.round(job.progress),
            total: job.total,
            lastChunkIdx: job.last_chunk_idx,
            errorMsg: job.error_msg,
            elapsedMs: Math.max(0, elapsedMs),
          }
          send('progress', payload)

          if (TERMINAL.has(job.status)) {
            send('done', payload)
            finish()
          }
        } catch (err) {
          send('error', { error: err instanceof Error ? err.message : 'stream error' })
          finish()
        }
      }

      // Initial emit immediately, then every 1s.
      await tick()
      if (!closed) timer = setInterval(tick, 1000)

      // Clean up if the client disconnects.
      request.signal.addEventListener('abort', finish)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
