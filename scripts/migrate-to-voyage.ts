/**
 * Migrate the Pinecone knowledge base from the 384-dim index (`knowledge-base`)
 * to the 1024-dim Voyage index (`knowledge-base-voyage`).
 *
 * It does NOT delete anything from the source index (safe / reversible).
 *
 * Steps:
 *   1. List + fetch every vector from SOURCE (384-dim).
 *   2. Group chunks back into whole documents.
 *   3. Re-chunk + re-embed with the configured provider (Voyage, 1024-dim).
 *   4. Upsert into DEST for DEST is dimension-compatible.
 *
 * Usage:
 *   npx tsx scripts/migrate-to-voyage.ts
 */
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import {
  generateEmbeddings,
  getEmbeddingDimension,
  isSemanticEmbeddingEnabled,
} from '../lib/embeddings'

const KEY = process.env.PINECONE_API_KEY!
if (!KEY) {
  console.error('❌ PINECONE_API_KEY not set')
  process.exit(1)
}

const SOURCE = 'knowledge-base' // old 384-dim
const DEST = 'knowledge-base-voyage' // new 1024-dim

const CHUNK_CHARS = 1200
const CHUNK_OVERLAP = 200
const BATCH = 50

const H = { 'Api-Key': KEY, 'Accept': 'application/json', 'Content-Type': 'application/json' }

async function hostOf(name: string): Promise<string> {
  const res = await fetch(`https://api.pinecone.io/indexes/${name}`, { headers: H })
  if (!res.ok) throw new Error(`describe ${name}: ${await res.text()}`)
  const d = await res.json()
  if (!d.host) throw new Error(`no host for ${name}`)
  return d.host
}

async function listIds(host: string): Promise<string[]> {
  const ids: string[] = []
  let token: string | undefined
  do {
    // GET with no body: do NOT send Content-Type (some gateways 4xx/empty on it).
    const headers: Record<string, string> = { 'Api-Key': KEY, Accept: 'application/json' }
    if (token) headers['X-Pinecone-Pagination-Token'] = token
    const res = await fetch(`https://${host}/vectors/list?limit=100`, { headers })
    const raw = await res.text()
    if (!res.ok) throw new Error(`list (${res.status}): ${raw}`)
    if (!raw.trim()) break // no more pages
    let d: any
    try {
      d = JSON.parse(raw)
    } catch {
      throw new Error(`list returned non-JSON: ${raw.slice(0, 200)}`)
    }
    for (const v of d.vectors || []) ids.push(v.id)
    token = d.pagination?.next
  } while (token)
  return ids
}

async function fetchVectors(host: string, ids: string[]): Promise<Record<string, any>> {
  const out: Record<string, any> = {}
  for (let i = 0; i < ids.length; i += 100) {
    const slice = ids.slice(i, i + 100)
    // NOTE: on some Pinecone data-plane hosts POST /vectors/fetch responds with
    // content-type application/grpc and an EMPTY body (HTTP 200). The GET form
    // reliably returns JSON, so use it here.
    const qs = slice.map((id) => `ids=${encodeURIComponent(id)}`).join('&')
    const res = await fetch(`https://${host}/vectors/fetch?${qs}`, {
      method: 'GET',
      headers: { 'Api-Key': KEY, Accept: 'application/json' },
    })
    const raw = await res.text()
    if (!res.ok) throw new Error(`fetch (${res.status}): ${raw}`)
    if (!raw.trim()) throw new Error(`fetch returned empty body for ${slice.length} id(s)`)
    let d: any
    try {
      d = JSON.parse(raw)
    } catch {
      throw new Error(`fetch returned non-JSON: ${raw.slice(0, 200)}`)
    }
    Object.assign(out, d.vectors || {})
  }
  return out
}

async function upsert(host: string, vectors: any[]) {
  for (let i = 0; i < vectors.length; i += BATCH) {
    const slice = vectors.slice(i, i + BATCH)
    const res = await fetch(`https://${host}/vectors/upsert`, {
      method: 'POST',
      headers: H,
      body: JSON.stringify({ vectors: slice }),
    })
    if (!res.ok) throw new Error(`upsert: ${await res.text()}`)
  }
}

function chunkText(text: string): string[] {
  const clean = text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim()
  const chunks: string[] = []
  let start = 0
  while (start < clean.length) {
    let end = Math.min(start + CHUNK_CHARS, clean.length)
    if (end < clean.length) {
      const w = clean.slice(start, end)
      const p = w.lastIndexOf('\n\n')
      const l = w.lastIndexOf('\n')
      const s = w.lastIndexOf(' ')
      if (p > CHUNK_CHARS * 0.5) end = start + p
      else if (l > CHUNK_CHARS * 0.5) end = start + l
      else if (s > CHUNK_CHARS * 0.5) end = start + s
    }
    chunks.push(clean.slice(start, end).trim())
    if (end >= clean.length) break
    start = Math.max(end - CHUNK_OVERLAP, start + 1)
  }
  return chunks.filter((c) => c.length > 0)
}

async function main() {
  console.log('🔁 Migrating 384-dim → 1024-dim Voyage index...')
  console.log(`   Source:    ${SOURCE}`)
  console.log(`   Dest:      ${DEST}`)
  console.log(`   Dim:       ${getEmbeddingDimension()}`)
  console.log(`   Semantic:  ${isSemanticEmbeddingEnabled() ? 'YES ✅' : 'NO ❌'}\n`)

  const srcHost = await hostOf(SOURCE)
  const dstHost = await hostOf(DEST)

  const ids = await listIds(srcHost)
  console.log(`📥 Found ${ids.length} vector(s) in SOURCE.`)
  if (ids.length === 0) {
    console.log('   Nothing to migrate.')
    return
  }

  const fetched = await fetchVectors(srcHost, ids)

  // Group by title + source.
  const docs = new Map<string, { meta: any; parts: { idx: number; text: string }[] }>()
  for (const id of ids) {
    const v = fetched[id]
    if (!v) continue
    const m = v.metadata || {}
    const key = `${m.title || 'untitled'}::${m.source || 'unknown'}`
    if (!docs.has(key)) docs.set(key, { meta: m, parts: [] })
    docs.get(key)!.parts.push({ idx: m.chunkIndex ?? 0, text: String(m.text || '') })
  }

  console.log(`📄 Reconstructing ${docs.size} document(s)...`)
  const vectors: any[] = []

  for (const [, doc] of docs) {
    const fullText = doc.parts
      .sort((a, b) => a.idx - b.idx)
      .map((p) => p.text)
      .join('\n\n')
    const chunks = chunkText(fullText)
    console.log(`   "${doc.meta.title}": ${fullText.length} chars -> ${chunks.length} chunk(s)`)

    const embs = await generateEmbeddings(chunks, { inputType: 'document' })
    const baseId = String(doc.meta.title || 'doc')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .toLowerCase()
      .slice(0, 40)

    chunks.forEach((chunk, i) => {
      vectors.push({
        id: `${baseId}#c${i}`,
        values: embs[i],
        metadata: {
          title: doc.meta.title || 'untitled',
          text: chunk,
          source: doc.meta.source || 'manual-upload',
          category: doc.meta.category || 'general',
          fileType: doc.meta.fileType || 'text',
          wordCount: doc.meta.wordCount || 0,
          extractionMethod: doc.meta.extractionMethod || 'reindex',
          timestamp: new Date().toISOString(),
          chunkIndex: i,
          totalChunks: chunks.length,
        },
      })
    })
  }

  console.log(`\n⬆️  Upserting ${vectors.length} vector(s) into ${DEST}...`)
  await upsert(dstHost, vectors)

  await new Promise((r) => setTimeout(r, 3000))

  console.log('\n📊 Verify:')
  const stats = await fetch(`https://${dstHost}/describe_index_stats`, {
    method: 'POST',
    headers: H,
    body: '{}',
  })
  console.log(JSON.stringify(await stats.json(), null, 2))

  console.log('\n✅ Migration complete. SOURCE index left untouched as backup.')
  console.log(`   Set PINECONE_INDEX=${DEST} (already done in .env.local).`)
}

main().catch((e) => {
  console.error('❌ Migration failed:', e?.message || e)
  process.exit(1)
})
