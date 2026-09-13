'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import ContentLayout from '../content-layout'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  UploadCloud,
  FileText,
  FileType,
  FileCode,
  File as FileIcon,
  X,
  RotateCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Loader2,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type JobStatus =
  | 'queued'
  | 'validating'
  | 'splitting'
  | 'chunking'
  | 'embedding'
  | 'storing'
  | 'done'
  | 'cancelled'
  | 'failed'

interface UploadCard {
  /** Local-only id for React keys. */
  localId: string
  filename: string
  sizeBytes: number
  file?: File
  documentId?: string
  jobId?: string
  status: JobStatus | 'uploading'
  progress: number
  total: number
  lastChunkIdx: number
  errorMsg?: string | null
  duplicate?: boolean
  startedAt: number
  elapsedMs: number
  /** Snapshot of File for retry. */
  retryable?: boolean
}

interface DocumentListItem {
  id: string
  filename: string
  size_bytes: number
  chunk_count: number
  page_count: number
  created_at: string
  job?: {
    id: string
    status: JobStatus
    progress: number
    total: number
    last_chunk_idx: number
    error_msg: string | null
  } | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MAX_BYTES = 100 * 1024 * 1024

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(s / 60)
  const rem = s % 60
  return m > 0 ? `${m}m ${rem}s` : `${rem}s`
}

function fileIconFor(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  if (ext === 'pdf') return FileType
  if (ext === 'docx' || ext === 'doc') return FileText
  if (ext === 'md' || ext === 'markdown') return FileCode
  return FileIcon
}

const STATUS_LABEL: Record<UploadCard['status'], string> = {
  uploading: 'Uploading…',
  queued: 'Queued',
  validating: 'Validating',
  splitting: 'Splitting',
  chunking: 'Chunking',
  embedding: 'Embedding',
  storing: 'Storing',
  done: 'Done',
  cancelled: 'Cancelled',
  failed: 'Failed',
}

const STATUS_STEPS: JobStatus[] = [
  'queued',
  'splitting',
  'chunking',
  'embedding',
  'storing',
  'done',
]

function statusIndex(status: UploadCard['status']): number {
  if (status === 'uploading') return 0
  const i = STATUS_STEPS.indexOf(status as JobStatus)
  return i < 0 ? 0 : i
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function UploadPage() {
  const [cards, setCards] = useState<UploadCard[]>([])
  const [documents, setDocuments] = useState<DocumentListItem[]>([])
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [dragging, setDragging] = useState(false)
  const [limitMsg, setLimitMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Guard so React Strict Mode double-mount does not double-subscribe.
  const streamsRef = useRef<Map<string, EventSource>>(new Map())

  // ---- Documents list -----------------------------------------------------
  const loadDocuments = useCallback(async () => {
    try {
      const res = await fetch('/api/documents', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load documents')
      const data = await res.json()
      setDocuments(data.documents || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingDocs(false)
    }
  }, [])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  // ---- Update one card ----------------------------------------------------
  const patchCard = useCallback((localId: string, patch: Partial<UploadCard>) => {
    setCards((prev) =>
      prev.map((c) => (c.localId === localId ? { ...c, ...patch } : c))
    )
  }, [])

  // ---- Polling fallback ---------------------------------------------------
  const startPolling = useCallback(
    (localId: string, jobId: string) => {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/jobs/${jobId}`, { cache: 'no-store' })
          if (!res.ok) return
          const job = await res.json()
          patchCard(localId, {
            status: job.status,
            progress: job.progress,
            total: job.total,
            lastChunkIdx: job.lastChunkIdx,
            errorMsg: job.errorMsg,
            elapsedMs: job.elapsedMs,
          })
          if (['done', 'cancelled', 'failed'].includes(job.status)) {
            clearInterval(interval)
            loadDocuments()
          }
        } catch {
          /* keep trying */
        }
      }, 2000)
      return interval
    },
    [patchCard, loadDocuments]
  )

  // ---- SSE stream ---------------------------------------------------------
  const subscribe = useCallback(
    (localId: string, jobId: string) => {
      // Already subscribed?
      if (streamsRef.current.has(localId)) return

      let es: EventSource | null = null
      let pollInterval: ReturnType<typeof setInterval> | null = null
      let fellBack = false

      const close = () => {
        if (es) {
          es.close()
          es = null
        }
        if (pollInterval) {
          clearInterval(pollInterval)
          pollInterval = null
        }
        streamsRef.current.delete(localId)
      }

      const onProgress = (payload: any) => {
        patchCard(localId, {
          status: payload.status,
          progress: payload.progress ?? 0,
          total: payload.total ?? 0,
          lastChunkIdx: payload.lastChunkIdx ?? 0,
          errorMsg: payload.errorMsg ?? null,
          elapsedMs: payload.elapsedMs ?? 0,
        })
        if (['done', 'cancelled', 'failed'].includes(payload.status)) {
          close()
          loadDocuments()
        }
      }

      try {
        es = new EventSource(`/api/jobs/${jobId}/stream`)
        streamsRef.current.set(localId, es)

        es.addEventListener('progress', (e) => {
          try {
            onProgress(JSON.parse((e as MessageEvent).data))
          } catch {
            /* ignore */
          }
        })
        es.addEventListener('done', (e) => {
          try {
            onProgress(JSON.parse((e as MessageEvent).data))
          } catch {
            /* ignore */
          }
        })
        es.addEventListener('error', () => {
          // If the connection fails before any bytes, fall back to polling once.
          if (!fellBack && es && es.readyState === EventSource.CLOSED) {
            fellBack = true
            close()
            pollInterval = startPolling(localId, jobId)
          }
        })
      } catch {
        fellBack = true
        pollInterval = startPolling(localId, jobId)
      }
    },
    [patchCard, loadDocuments, startPolling]
  )

  // Clean up all streams on unmount.
  useEffect(() => {
    const streams = streamsRef.current
    return () => {
      streams.forEach((es) => es.close())
      streams.clear()
    }
  }, [])

  // ---- Upload a single file ----------------------------------------------
  const uploadFile = useCallback(
    async (card: UploadCard, file: File) => {
      patchCard(card.localId, {
        status: 'uploading',
        startedAt: Date.now(),
        progress: 0,
        errorMsg: null,
      })

      try {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch('/api/documents/upload', { method: 'POST', body: form })
        const data = await res.json()

        if (!res.ok) {
          patchCard(card.localId, {
            status: 'failed',
            errorMsg: data.message || data.error || 'Upload failed',
            retryable: true,
          })
          return
        }

        if (data.duplicate) {
          patchCard(card.localId, {
            status: data.jobId ? 'queued' : 'done',
            duplicate: true,
            documentId: data.documentId,
            jobId: data.jobId ?? undefined,
            errorMsg: data.message || 'Already uploaded',
          })
          if (data.jobId) subscribe(card.localId, data.jobId)
          else loadDocuments()
          return
        }

        patchCard(card.localId, {
          status: data.status || 'queued',
          documentId: data.documentId,
          jobId: data.jobId,
          startedAt: Date.now(),
        })
        if (data.jobId) subscribe(card.localId, data.jobId)
      } catch (e) {
        patchCard(card.localId, {
          status: 'failed',
          errorMsg: e instanceof Error ? e.message : 'Network error',
          retryable: true,
        })
      }
    },
    [patchCard, subscribe, loadDocuments]
  )

  // ---- Handle newly selected files ---------------------------------------
  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList)
      if (!files.length) return
      setLimitMsg(null)

      const accepted: File[] = []
      const rejected: string[] = []
      for (const f of files) {
        if (f.size > MAX_BYTES) rejected.push(f.name)
        else accepted.push(f)
      }
      if (rejected.length) {
        setLimitMsg(`Skipped (over 100MB): ${rejected.join(', ')}`)
      }

      const newCards = accepted.map<UploadCard>((file) => ({
        localId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        filename: file.name,
        sizeBytes: file.size,
        file,
        status: 'uploading',
        progress: 0,
        total: 0,
        lastChunkIdx: 0,
        startedAt: Date.now(),
        elapsedMs: 0,
        retryable: false,
      }))
      if (!newCards.length) return
      setCards((prev) => [...newCards, ...prev])
      // Kick off uploads immediately (server does the heavy work in background).
      newCards.forEach((card) => uploadFile(card, card.file!))
    },
    [uploadFile]
  )

  // ---- Drag & drop --------------------------------------------------------
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files)
    },
    [handleFiles]
  )

  // ---- Cancel / retry / delete -------------------------------------------
  const cancelJob = async (card: UploadCard) => {
    if (!card.jobId) {
      // Nothing on the server yet — just drop the card locally.
      setCards((prev) => prev.filter((c) => c.localId !== card.localId))
      return
    }
    try {
      await fetch(`/api/jobs/${card.jobId}/cancel`, { method: 'POST' })
      // The worker will flip the job to `cancelled` after the current batch;
      // the SSE stream (or polling) picks that up and updates the card.
      patchCard(card.localId, { errorMsg: 'Cancelling…' })
    } catch (e) {
      console.error(e)
    }
  }

  const retryJob = (card: UploadCard) => {
    if (!card.file) return
    uploadFile(card, card.file)
  }

  const removeCard = (localId: string) => {
    const es = streamsRef.current.get(localId)
    if (es) {
      es.close()
      streamsRef.current.delete(localId)
    }
    setCards((prev) => prev.filter((c) => c.localId !== localId))
  }

  const deleteDocument = async (docId: string) => {
    if (!confirm('Delete this document and all its vectors from the knowledge base?')) return
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.message || data.error || 'Delete failed')
        return
      }
      setDocuments((prev) => prev.filter((d) => d.id !== docId))
    } catch (e) {
      console.error(e)
      alert('Delete failed')
    }
  }

  // =========================================================================
  // Render
  // =========================================================================
  return (
    <ContentLayout>
      <div className="mb-8">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1 text-xs font-medium text-teal-300">
          <Sparkles className="h-3.5 w-3.5" />
          Knowledge Base
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
          Upload documents
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/50">
          Add PDFs, DOCX, Markdown, or text files to your knowledge base. Each file is
          chunked, embedded, and stored so the chatbot can answer questions about it.
        </p>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
        }}
        className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all duration-200 md:py-14 ${
          dragging
            ? 'border-teal-400/60 bg-teal-500/10'
            : 'border-white/10 bg-white/[0.02] hover:border-teal-500/40 hover:bg-white/[0.04]'
        }`}
      >
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-700 shadow-lg shadow-teal-500/20">
          <UploadCloud className="h-7 w-7 text-white" />
        </div>
        <p className="text-sm font-medium text-white">
          Drag &amp; drop files here, or{' '}
          <span className="text-teal-400 underline underline-offset-2">browse</span>
        </p>
        <p className="mt-1 text-xs text-white/40">
          PDF, DOCX, TXT, MD, and more — up to 100MB each
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.docx,.doc,.txt,.md,.markdown,.rtf,.csv"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {limitMsg && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{limitMsg}</span>
        </div>
      )}

      {/* Active upload cards */}
      {cards.length > 0 && (
        <div className="mt-8 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-white/30">
            Processing
          </h2>
          {cards.map((card) => (
            <UploadCardView
              key={card.localId}
              card={card}
              onCancel={() => cancelJob(card)}
              onRetry={() => retryJob(card)}
              onRemove={() => removeCard(card.localId)}
            />
          ))}
        </div>
      )}

      {/* Documents list */}
      <div className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-white/30">
            Ingested documents
          </h2>
          {documents.length > 0 && (
            <span className="text-xs text-white/30">{documents.length} total</span>
          )}
        </div>

        {loadingDocs ? (
          <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-6 text-sm text-white/40">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading documents…
          </div>
        ) : documents.length === 0 ? (
          <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-8 text-center text-sm text-white/40">
            No documents yet. Upload your first file above.
          </div>
        ) : (
          <ul className="space-y-2">
            {documents.map((doc) => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                onDelete={() => deleteDocument(doc.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </ContentLayout>
  )
}

// ---------------------------------------------------------------------------
// Upload card
// ---------------------------------------------------------------------------

function UploadCardView({
  card,
  onCancel,
  onRetry,
  onRemove,
}: {
  card: UploadCard
  onCancel: () => void
  onRetry: () => void
  onRemove: () => void
}) {
  const Icon = fileIconFor(card.filename)
  const isTerminal = ['done', 'cancelled', 'failed'].includes(card.status)
  const isFailed = card.status === 'failed'
  const isDone = card.status === 'done'
  const isActive = !isTerminal

  // Smooth "0-100" bar: while embedding we show chunk progress; otherwise a
  // gentle indeterminate-ish ramp so the UI feels alive.
  const pct = (() => {
    if (isDone) return 100
    if (card.status === 'cancelled') return card.progress || 0
    if (card.total > 0) return Math.min(100, Math.round(card.progress))
    const si = statusIndex(card.status)
    return Math.min(95, Math.round(((si + 0.5) / STATUS_STEPS.length) * 100))
  })()

  const eta = (() => {
    if (!isActive || card.progress <= 0 || card.elapsedMs <= 0) return null
    const rate = card.progress / card.elapsedMs // %/ms
    if (rate <= 0) return null
    const remaining = (100 - card.progress) / rate
    return remaining
  })()

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 text-teal-400">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium text-white">{card.filename}</p>
            <div className="flex shrink-0 items-center gap-1">
              {isActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCancel}
                  className="h-7 px-2 text-xs text-white/50 hover:bg-white/10 hover:text-white"
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Cancel
                </Button>
              )}
              {isFailed && card.file && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRetry}
                  className="h-7 px-2 text-xs text-teal-300 hover:bg-teal-500/10 hover:text-teal-200"
                >
                  <RotateCw className="mr-1 h-3.5 w-3.5" />
                  Retry
                </Button>
              )}
              {isTerminal && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onRemove}
                  className="h-7 w-7 text-white/40 hover:bg-white/10 hover:text-white"
                  aria-label="Dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/40">
            <span>{formatBytes(card.sizeBytes)}</span>
            <StatusBadge status={card.status} />
            {card.duplicate && (
              <span className="text-amber-300/80">Already in knowledge base</span>
            )}
            {isActive && card.total > 0 && (
              <span className="tabular-nums">
                {card.lastChunkIdx} / {card.total} chunks
              </span>
            )}
            {(card.elapsedMs > 0 || isActive) && (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Clock className="h-3 w-3" />
                {formatElapsed(
                  card.elapsedMs || (isActive ? Date.now() - card.startedAt : 0)
                )}
                {eta != null && isActive && ` · ~${formatElapsed(eta)} left`}
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <Progress
              value={pct}
              className={`h-1.5 ${
                isFailed ? 'bg-red-500/20' : isDone ? 'bg-teal-500/20' : 'bg-white/10'
              }`}
            />
            <div className="mt-1 flex justify-between text-[10px] text-white/30">
              <span>{pct}%</span>
              {!isTerminal && <span>{STATUS_LABEL[card.status]}</span>}
            </div>
          </div>

          {isFailed && card.errorMsg && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-red-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {card.errorMsg}
            </p>
          )}
          {isDone && card.duplicate && card.errorMsg && (
            <p className="mt-2 text-xs text-amber-300/80">{card.errorMsg}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: UploadCard['status'] }) {
  if (status === 'done') {
    return (
      <span className="inline-flex items-center gap-1 text-teal-400">
        <CheckCircle2 className="h-3 w-3" /> Done
      </span>
    )
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 text-red-400">
        <AlertTriangle className="h-3 w-3" /> Failed
      </span>
    )
  }
  if (status === 'cancelled') {
    return <span className="text-white/40">Cancelled</span>
  }
  return (
    <span className="inline-flex items-center gap-1 text-white/60">
      <Loader2 className="h-3 w-3 animate-spin" />
      {STATUS_LABEL[status]}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Document row
// ---------------------------------------------------------------------------

function DocumentRow({
  doc,
  onDelete,
}: {
  doc: DocumentListItem
  onDelete: () => void
}) {
  const Icon = fileIconFor(doc.filename)
  const job = doc.job
  const processing =
    job && !['done', 'cancelled', 'failed'].includes(job.status)

  return (
    <li className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 transition-colors hover:bg-white/[0.04]">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-teal-400">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white/90">{doc.filename}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-white/35">
          <span>{formatBytes(doc.size_bytes)}</span>
          <span>·</span>
          <span>{doc.chunk_count} chunks</span>
          {doc.page_count > 1 && (
            <>
              <span>·</span>
              <span>{doc.page_count} pages</span>
            </>
          )}
          <span>·</span>
          <span>{new Date(doc.created_at).toLocaleDateString()}</span>
        </div>
      </div>
      {processing ? (
        <Badge
          variant="outline"
          className="shrink-0 border-teal-500/30 bg-teal-500/10 text-[10px] text-teal-300"
        >
          {job!.status}
        </Badge>
      ) : job?.status === 'failed' ? (
        <Badge
          variant="outline"
          className="shrink-0 border-red-500/30 bg-red-500/10 text-[10px] text-red-300"
        >
          failed
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className="shrink-0 border-white/10 bg-white/5 text-[10px] text-white/40"
        >
          indexed
        </Badge>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        className="h-8 w-8 shrink-0 text-white/30 hover:bg-red-500/10 hover:text-red-400"
        aria-label={`Delete ${doc.filename}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  )
}
