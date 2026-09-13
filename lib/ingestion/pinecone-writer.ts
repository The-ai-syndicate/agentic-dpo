import { generateEmbeddings } from '../embeddings'
import type { Chunk } from './types'

/**
 * Pinecone writer for ingested documents.
 *
 * IMPORTANT — metadata schema MUST match what lib/pinecone.ts writes and what
 * getGroundedContext() reads back, otherwise the existing chatbot can't see
 * these vectors. The existing schema is:
 *   { title, text, source, category, fileType, wordCount, extractionMethod,
 *     timestamp, chunkIndex, totalChunks }
 * and retrieval reads `payload.title` + `payload.text`. We reuse those exact
 * keys (title = filename, source = docId) and are free to ADD extra keys
 * (`doc_id`, `user_id`, `page`, `source_type`) which retrieval ignores.
 */

const PINECONE_API_KEY = process.env.PINECONE_API_KEY
const PINECONE_INDEX = process.env.PINECONE_INDEX || 'knowledge-base'

let cachedHost: string | null = null

async function getIndexHost(): Promise<string> {
  if (cachedHost) return cachedHost
  const res = await fetch(`https://api.pinecone.io/indexes/${PINECONE_INDEX}`, {
    headers: { 'Api-Key': PINECONE_API_KEY!, Accept: 'application/json' },
  })
  if (!res.ok) {
    throw new Error(`Failed to get Pinecone index "${PINECONE_INDEX}": ${await res.text()}`)
  }
  const data = await res.json()
  if (!data.host) throw new Error('Pinecone index is still initializing.')
  cachedHost = data.host as string
  return cachedHost!
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Upsert one batch of vectors with exponential backoff on 429 / 5xx.
 * No fixed sleeps — only retry on rate limiting.
 */
export async function upsertVectors(
  vectors: Array<{ id: string; values: number[]; metadata: Record<string, unknown> }>
): Promise<void> {
  if (vectors.length === 0) return
  const host = await getIndexHost()

  const MAX_RETRIES = Number(process.env.PINECONE_MAX_RETRIES || 5)
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(`https://${host}/vectors/upsert`, {
      method: 'POST',
      headers: { 'Api-Key': PINECONE_API_KEY!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ vectors }),
    })
    if (res.ok) return

    const body = await res.text()
    const retryable = res.status === 429 || res.status >= 500
    if (!retryable || attempt === MAX_RETRIES) {
      throw new Error(`Pinecone upsert failed (${res.status}): ${body}`)
    }
    const retryAfter = Number(res.headers.get('retry-after'))
    const delay =
      Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : Math.min(2 ** attempt * 1000, 20000)
    console.warn(`⏳ Pinecone rate-limited, retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms`)
    await sleep(delay)
  }
}

/**
 * Embed + upsert one batch of chunks. Batched (bounded by caller to 100) so a
 * single Voyage call and a single Pinecone call handle the whole batch.
 * Writes EXACTLY the metadata keys the existing retrieval expects.
 */
export async function embedAndStoreBatch(
  chunks: Chunk[],
  ctx: { documentId: string; userId: string; filename: string; totalChunks: number; sourceType: string }
): Promise<void> {
  if (chunks.length === 0) return

  const texts = chunks.map((c) => c.text)
  const embeddings = await generateEmbeddings(texts, { inputType: 'document' })

  const now = new Date().toISOString()
  const vectors = chunks.map((c, i) => ({
    id: `${ctx.documentId}#chunk-${c.index}`,
    values: embeddings[i],
    metadata: {
      // --- keys the existing chatbot reads ---
      title: ctx.filename,
      text: c.text,
      source: ctx.documentId,
      category: 'ingested',
      fileType: ctx.sourceType,
      wordCount: c.text.trim() ? c.text.trim().split(/\s+/).length : 0,
      extractionMethod: 'ingestion-pipeline',
      timestamp: now,
      chunkIndex: c.index,
      totalChunks: ctx.totalChunks,
      // --- extra keys for lifecycle management (delete-by-doc_id) ---
      doc_id: ctx.documentId,
      user_id: ctx.userId,
      page: c.page,
      source_type: ctx.sourceType,
    },
  }))

  await upsertVectors(vectors)
}

/**
 * Delete every vector belonging to a document, using the `doc_id` metadata
 * filter. Pinecone's delete-by-filter API is on the data plane.
 */
export async function deleteVectorsByDocId(docId: string): Promise<void> {
  const host = await getIndexHost()
  const res = await fetch(`https://${host}/vectors/delete`, {
    method: 'POST',
    headers: { 'Api-Key': PINECONE_API_KEY!, 'Content-Type': 'application/json' },
    body: JSON.stringify({ filter: { doc_id: { $eq: docId } } }),
  })
  if (!res.ok) {
    throw new Error(`Pinecone delete-by-filter failed (${res.status}): ${await res.text()}`)
  }
}
