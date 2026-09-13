# Document Ingestion (Upload → Chunk → Embed → Pinecone)

Additive feature: upload PDFs / DOCX / TXT / MD (and more) at **`/upload`**;
the system chunks, embeds, and stores them in Pinecone so the **existing
chatbot answers questions about them with no changes to the query flow.**

> This feature never touches the chat query/answer flow. It reuses the existing
> Pinecone client, Voyage AI client, Supabase DB, and middleware/rate-limiting.

---

## 1. File tree (new files)

```
supabase/migrations/
  003_create_document_ingestion_tables.sql   # documents + jobs + storage bucket

lib/ingestion/
  types.ts              # shared types (DocumentRow, JobRow, Chunk, Section)
  identity.ts           # anonymous per-device user id (cookie) — reuse later w/ real auth
  document-service.ts   # Supabase reads/writes + ensureIngestionTables()
  storage.ts            # Supabase Storage bucket (local-disk fallback in dev)
  extractors.ts         # VALIDATE + SPLIT (PDF by page, DOCX by heading, MD by heading, TXT by paragraph)
  splitter.ts           # recursive ~500-token chunks, ~50-token overlap
  pinecone-writer.ts    # Voyage embed (batched) + Pinecone upsert, SAME metadata schema
  worker.ts             # in-process async queue + DB checkpointing + resume

app/api/documents/
  upload/route.ts       # POST multipart → { jobId, documentId } in <2s (no inline work)
  route.ts              # GET  list documents (+ latest job status)
  [docId]/route.ts      # DELETE document row + its Pinecone vectors (filter on doc_id)

app/api/jobs/[jobId]/
  stream/route.ts       # GET  SSE progress (1s cadence, closes on terminal status)
  route.ts              # GET  polling fallback (every 2s from the frontend)
  cancel/route.ts       # POST sets cancel_flag = true

app/upload/page.tsx     # the upload UI (drag-drop, live progress cards, docs list)
docs/DOCUMENT_INGESTION.md  # this file
```

## 2. Existing files touched (and why)

| File | Change | Why |
|------|--------|-----|
| `app/components/app-menu.tsx` | Added an **Upload Documents** nav item | Reachability only |
| `middleware.ts` | *(unchanged)* existing IP rate-limiter already covers `/api/documents/*` and `/api/jobs/*` | Reuse existing auth/limiting |

Nothing else in the chatbot was modified.

---

## 3. How it respects your existing retrieval

`lib/pinecone.ts` `getGroundedContext()` reads `payload.title` and
`payload.text`. The ingestion writer (`lib/ingestion/pinecone-writer.ts`) writes
**the exact same metadata keys** the existing pipeline writes:

```
{ title, text, source, category, fileType, wordCount,
  extractionMethod, timestamp, chunkIndex, totalChunks }
```

(`title` = filename, `source` = docId) **plus** additive keys used only for
lifecycle management: `doc_id`, `user_id`, `page`, `source_type`. Vector IDs
use the existing `"{docId}#chunk-{i}"` format. **No namespace is used** (matches
your current setup), and the embedding model is the same Voyage `voyage-law-2`
(1024-dim) via `generateEmbeddings(..., { inputType: 'document' })`.

---

## 4. Environment variables

All of these already exist in your `.env.local` except the optional ones:

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `PINECONE_API_KEY` | yes | — | Pinecone (existing) |
| `PINECONE_INDEX` | no | `knowledge-base` | Pinecone index name (existing) |
| `VOYAGE_API_KEY` | yes | — | Voyage embeddings (existing) |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | — | Supabase (existing) |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | — | Supabase service role (existing) |
| `INGESTION_MAX_BYTES` | no | `104857600` | Max upload size (100MB) |
| `INGESTION_BATCH` | no | `100` | Chunks per Voyage/Pinecone batch |
| `INGESTION_BUCKET` | no | `ingested-documents` | Supabase Storage bucket |
| `INGESTION_STORAGE` | no | `supabase` | Set to `local` to force local-disk storage in dev |
| `INGESTION_MAX_RETRIES` / `PINECONE_MAX_RETRIES` | no | `5` | 429 / 5xx retry budget |

**API keys are never exposed to the frontend** — all Voyage/Pinecone calls run
in Node route handlers and the worker.

---

## 5. Setup

1. **Run the migration** in the Supabase SQL editor:

   ```
   supabase/migrations/003_create_document_ingestion_tables.sql
   ```

   It creates `documents`, `jobs`, the `updated_at` trigger, RLS policies, and
   the private `ingested-documents` storage bucket. (Tables are also
   auto-created on first use via `ensureIngestionTables()` as a safety net.)

2. **Run the app** (dev):

   ```bash
   pnpm dev
   ```

   The worker is **in-process** — there is no separate worker process or queue
   daemon to start. It runs inside the Next.js server. On boot / first upload it
   resumes any interrupted jobs from `jobs.last_chunk_idx`.

   > Production note: the in-process queue lives in a single server instance.
   > For multiple instances, the DB is already the source of truth — you'd just
   > add a small poller that calls `recoverInterruptedJobs()`.

---

## 6. Testing with a sample PDF

1. Open **http://localhost:3000/upload**.
2. Drag a PDF onto the dropzone (or click to browse). The card appears with:
   - filename + size,
   - stage (`queued → splitting → chunking → embedding → storing → done`),
   - a 0–100% progress bar,
   - a live `lastChunkIdx / total` chunk counter (`340 / 1000 chunks`),
   - elapsed time + ETA, with **Cancel** / **Retry**.
3. Progress streams over **SSE** (`GET /api/jobs/:jobId/stream`, 1/s). If SSE is
   unavailable the UI automatically falls back to **polling**
   (`GET /api/jobs/:jobId`, 2/s).
4. When done, ask the chatbot a question whose answer is only in that PDF — it
   should cite the file (via the unchanged retrieval path).
5. Click the trash icon on a document to delete it → removes the row **and** its
   vectors (Pinecone delete-by-filter on `doc_id`).

Quick API smoke test:

```bash
# upload
curl -F "file=@sample.pdf" http://localhost:3000/api/documents/upload
# → { "documentId": "...", "jobId": "...", "status": "queued" }

# stream progress
curl -N http://localhost:3000/api/jobs/<jobId>/stream

# or poll
curl http://localhost:3000/api/jobs/<jobId>

# list / delete
curl http://localhost:3000/api/documents
curl -X DELETE http://localhost:3000/api/documents/<docId>
```

---

## 7. Behaviour guarantees

- **Fast upload** — the HTTP request only hashes, stores the file, and inserts
  `documents` + `jobs` rows, then enqueues. It never embeds inline.
- **Idempotency** — re-uploading the same file (SHA-256) for the same user
  returns the existing `doc_id` (and any still-active `jobId`).
- **Resume** — each batch checkpoints `progress` + `last_chunk_idx`; a crashed
  job resumes from `last_chunk_idx` instead of re-embedding.
- **Cancellation** — `cancel_flag` is checked between batches; partial vectors
  are deleted on cancel/failure.
- **Batching only** — one Voyage call + one Pinecone upsert per ≤100-chunk
  batch. No per-chunk embedding, no fixed sleeps — only exponential backoff on
  429 / 5xx.
- **No new infra** — no Redis/BullMQ/Kafka. Postgres (Supabase) is the source of
  truth.
