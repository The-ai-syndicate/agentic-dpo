import { NextRequest, NextResponse } from 'next/server'
import { getClientIP, uploadConcurrentLimiter } from '@/lib/rate-limit'
import {
  getUserIdFromRequest,
  attachUserCookie,
} from '@/lib/ingestion/identity'
import { sha256, saveFile } from '@/lib/ingestion/storage'
import { ALLOWED_EXTENSIONS, extOf } from '@/lib/ingestion/extractors'
import {
  ensureIngestionTables,
  findDocumentByHash,
  createDocument,
  createJob,
  getActiveJobForDocument,
} from '@/lib/ingestion/document-service'
import { ingestionQueue, recoverInterruptedJobs } from '@/lib/ingestion/worker'

// Node runtime: needs pdf-parse / native libs and the crypto module.
export const runtime = 'nodejs'
export const maxDuration = 30
export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE_BYTES = Number(process.env.INGESTION_MAX_BYTES || 100 * 1024 * 1024)

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    limits: {
      maxFileSizeMB: MAX_FILE_SIZE_BYTES / 1024 / 1024,
      allowedExtensions: ALLOWED_EXTENSIONS,
    },
  })
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request)
  const acquireKey = `ingest-upload:${ip}`

  if (!uploadConcurrentLimiter.tryAcquire(acquireKey)) {
    return NextResponse.json(
      { error: 'Too many concurrent uploads', message: 'Please wait for current uploads.' },
      { status: 429 }
    )
  }

  try {
    await ensureIngestionTables()
    // Resume any jobs interrupted by a prior process (idempotent, once).
    void recoverInterruptedJobs()

    const { userId, isNew } = getUserIdFromRequest(request)

    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Content-Type must be multipart/form-data' },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: 'File too large',
          message: `Maximum size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`,
        },
        { status: 413 }
      )
    }
    const ext = extOf(file.name)
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: 'Unsupported file type', message: `.${ext} is not supported` },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileHash = sha256(buffer)

    // -------- Idempotency: same SHA-256 for this user → existing doc --------
    const existing = await findDocumentByHash(userId, fileHash)
    if (existing) {
      const activeJob = await getActiveJobForDocument(existing.id)
      const res = NextResponse.json(
        {
          duplicate: true,
          documentId: existing.id,
          jobId: activeJob?.id ?? null,
          filename: existing.filename,
          message: 'This file has already been uploaded.',
        },
        { status: 200 }
      )
      return attachUserCookie(res, userId, isNew)
    }

    // -------- Persist file + create Document + Job (fast; no inline work) --
    const storagePath = await saveFile(userId, file.name, buffer)
    const doc = await createDocument({
      userId,
      filename: file.name,
      fileHash,
      sizeBytes: buffer.length,
      storagePath,
    })
    const job = await createJob(doc.id)

    // Hand off to the in-process worker. The HTTP request returns immediately.
    ingestionQueue.enqueue(job.id)

    const res = NextResponse.json(
      {
        duplicate: false,
        documentId: doc.id,
        jobId: job.id,
        filename: doc.filename,
        status: job.status,
      },
      { status: 202 }
    )
    return attachUserCookie(res, userId, isNew)
  } catch (err) {
    console.error('[/api/documents/upload] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    )
  } finally {
    uploadConcurrentLimiter.release(acquireKey)
  }
}
