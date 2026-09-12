/**
 * Re-index script (in-place, semantic).
 *
 * What it does:
 *   1. Reads every document currently in the Pinecone index.
 *   2. Reconstructs each document's full text from its chunks.
 *   3. Re-chunks it into smaller, overlapping chunks (better retrieval).
 *   4. Re-embeds with the configured semantic model.
 *   5. Deletes the old vectors and upserts the new ones (same index, same dim).
 *
 * This works because the local model (all-MiniLM-L6-v2) produces 384-dim
 * vectors — the same dimension as the existing index — so NO new index or
 * dimension change is required. Re-run this any time you change the model.
 *
 * Usage:
 *   npm run reindex
 *
 * Environment (from .env.local):
 *   PINECONE_API_KEY   - required
 *   PINECONE_INDEX     - index name (default: knowledge-base)
 *   EMBEDDING_MODEL    - default: all-MiniLM-L6-v2
 *   EMBEDDING_DIMENSION- default: 384
 */
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import {
  generateEmbeddings,
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSION,
  isSemanticEmbeddingEnabled,
} from '../lib/embeddings'

const PINECONE_API_KEY = process.env.PINECONE_API_KEY
const INDEX = process.env.PINECONE_INDEX || 'knowledge-base'

// Chunking config — smaller chunks give more precise retrieval.
const CHUNK_CHARS = 1200
const CHUNK_OVERLAP = 200
const BATCH = 50

if (!PINECONE_API_KEY) {
  console.error('❌ PINECONE_API_KEY is not set.')
  process.exit(1)
}

async function getIndexHost(name: string): Promise<string | null> {
  const res = await fetch(`https://api.pinecone.io/indexes/${name}`, {
    headers: { 'Api-Key': PINECONE_API_KEY!, Accept: 'application/json' },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Failed to get index "${name}": ${await res.text()}`)
  const data = await res.json()
  return data.host || null
}

/** List every vector id in the index. */
async function listAllIds(host: string): Promise<string[]> {
  const ids: string[] = []
  let token: string | undefined
  do {
    const headers: Record<string, string> = {
      'Api-Key': PINECONE_API_KEY!,
      'Content-Type': 'application/json',
    }
    if (token) headers['X-Pinecone-Pagination-Token'] = token

    const res = await fetch(`https://${host}/vectors/list?limit=100`, {
      method: 'GET',
      headers,
    })
    if (!res.ok) throw new Error(`List vectors failed: ${await res.text()}`)
    const data = await res.json()
    for (const v of data.vectors || []) ids.push(v.id)
    token = data.pagination?.next
  } while (token)
  return ids
}

/** Fetch full metadata for the given ids. */
async function fetchVectors(host: string, ids: string[]): Promise<Record<string, any>> {
  const out: Record<string, any> = {}
  for (let i = 0; i < ids.length; i += 100) {
    const slice = ids.slice(i, i + 100)
    const res = await fetch(`https://${host}/vectors/fetch`, {
      method: 'POST',
      headers: { 'Api-Key': PINECONE_API_KEY!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: slice }),
    })
    if (!res.ok) throw new Error(`Fetch vectors failed: ${await res.text()}`)
    const data = await res.json()
    Object.assign(out, data.vectors || {})
  }
  return out
}

async function deleteIds(host: string, ids: string[]): Promise<void> {
  for (let i = 0; i < ids.length; i += 1000) {
    const slice = ids.slice(i, i + 1000)
    const res = await fetch(`https://${host}/vectors/delete`, {
      method: 'POST',
      headers: { 'Api-Key': PINECONE_API_KEY!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: slice }),
    })
    if (!res.ok) throw new Error(`Delete failed: ${await res.text()}`)
  }
}

async function upsert(host: string, vectors: any[]): Promise<void> {
  for (let i = 0; i < vectors.length; i += BATCH) {
    const slice = vectors.slice(i, i + BATCH)
    const res = await fetch(`https://${host}/vectors/upsert`, {
      method: 'POST',
      headers: { 'Api-Key': PINECONE_API_KEY!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ vectors: slice }),
    })
    if (!res.ok) throw new Error(`Upsert failed: ${await res.text()}`)
  }
}

/** Split text into overlapping chunks, preferring paragraph/word boundaries. */
function chunkText(text: string): string[] {
  const clean = text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim()
  const chunks: string[] = []
  let start = 0

  while (start < clean.length) {
    let end = Math.min(start + CHUNK_CHARS, clean.length)

    if (end < clean.length) {
      // Prefer to break at a paragraph, then newline, then space.
      const window = clean.slice(start, end)
      const paraBreak = window.lastIndexOf('\n\n')
      const lineBreak = window.lastIndexOf('\n')
      const spaceBreak = window.lastIndexOf(' ')
      if (paraBreak > CHUNK_CHARS * 0.5) end = start + paraBreak
      else if (lineBreak > CHUNK_CHARS * 0.5) end = start + lineBreak
      else if (spaceBreak > CHUNK_CHARS * 0.5) end = start + spaceBreak
    }

    chunks.push(clean.slice(start, end).trim())
    if (end >= clean.length) break
    start = Math.max(end - CHUNK_OVERLAP, start + 1)
  }

  return chunks.filter((c) => c.length > 0)
}

async function main() {
  console.log('🔁 Re-index (in-place, semantic) starting...')
  console.log(`   Index:     ${INDEX}`)
  console.log(`   Model:     ${EMBEDDING_MODEL}`)
  console.log(`   Dimension: ${EMBEDDING_DIMENSION}`)
  console.log(`   Semantic:  ${isSemanticEmbeddingEnabled() ? 'YES ✅' : 'NO ❌'}`)
  console.log(`   Chunk:     ${CHUNK_CHARS} chars, ${CHUNK_OVERLAP} overlap\n`)

  const host = await getIndexHost(INDEX)
  if (!host) throw new Error(`Index "${INDEX}" not found.`)

  const oldIds = await listAllIds(host)
  console.log(`📥 Found ${oldIds.length} existing vectors.`)
  if (oldIds.length === 0) {
    console.log('   Nothing to re-index.')
    return
  }

  const fetched = await fetchVectors(host, oldIds)

  // Group chunks back into documents by title + source.
  const docs = new Map<string, { title: string; meta: any; parts: { idx: number; text: string }[] }>()
  for (const id of oldIds) {
    const v = fetched[id]
    if (!v) continue
    const m = v.metadata || {}
    const key = `${m.title || 'untitled'}::${m.source || 'unknown'}`
    if (!docs.has(key)) {
      docs.set(key, { title: m.title || 'untitled', meta: m, parts: [] })
    }
    docs.get(key)!.parts.push({ idx: m.chunkIndex ?? 0, text: String(m.text || '') })
  }

  console.log(`📄 Reconstructing ${docs.size} document(s)...`)
  const newVectors: any[] = []

  for (const [, doc] of docs) {
    const fullText = doc.parts
      .sort((a, b) => a.idx - b.idx)
      .map((p) => p.text)
      .join('\n\n')
    const chunks = chunkText(fullText)
    console.log(`   "${doc.title}": ${fullText.length} chars -> ${chunks.length} chunks`)

    const embeddings = await generateEmbeddings(chunks)
    const baseId = `${doc.meta.title || 'doc'}`
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .toLowerCase()
      .slice(0, 40)

    chunks.forEach((chunk, i) => {
      newVectors.push({
        id: `${baseId}#c${i}`,
        values: embeddings[i],
        metadata: {
          title: doc.meta.title || 'untitled',
          text: chunk,
          source: doc.meta.source || 'manual-upload',
          category: doc.meta.category || 'general',
          fileType: doc.meta.fileType || 'text',
          extractionMethod: doc.meta.extractionMethod || 'reindex',
          timestamp: new Date().toISOString(),
          chunkIndex: i,
          totalChunks: chunks.length,
        },
      })
    })
  }

  console.log(`\n🗑️  Deleting ${oldIds.length} old vectors...`)
  await deleteIds(host, oldIds)

  console.log(`⬆️  Upserting ${newVectors.length} new semantic vectors...`)
  await upsert(host, newVectors)

  // Give Pinecone a moment to make writes visible.
  await new Promise((r) => setTimeout(r, 5000))

  console.log('\n✅ Re-index complete.')
  console.log(`   ${newVectors.length} vectors now stored with semantic embeddings.`)
  console.log('   No env changes needed — same index, same dimension.')
}

main().catch((err) => {
  console.error('❌ Re-index failed:', err.message || err)
  process.exit(1)
})
