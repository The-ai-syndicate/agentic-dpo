/**
 * Migrate the Pinecone knowledge base from the 384-dim local model to
 * 1024-dim Voyage AI embeddings.
 *
 * Steps:
 *   1. Create a new 1024-dim cosine index (if it doesn't already exist).
 *   2. Read all vectors + metadata from the OLD index.
 *   3. Re-embed each chunk's `text` with Voyage (input_type: 'document').
 *   4. Upsert the new vectors into the NEW index.
 *
 * Usage:
 *   OLD_HOST=...        npx tsx scripts/migrate-to-voyage.ts
 *
 * Env:
 *   PINECONE_API_KEY   (required)
 *   PINECONE_INDEX     (old index name, default 'knowledge-base')
 *   VOYAGE_TARGET_INDEX (new index name, default 'knowledge-base-voyage')
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const KEY = process.env.PINECONE_API_KEY!
const OLD_INDEX = process.env.PINECONE_INDEX || 'knowledge-base'
const NEW_INDEX = process.env.VOYAGE_TARGET_INDEX || 'knowledge-base-voyage'
const OLD_HOST = process.env.OLD_HOST || 'knowledge-base-fz87jn0.svc.aped-4627-b74a.pinecone.io'

const pineconeHeaders = { 'Api-Key': KEY, 'Content-Type': 'application/json' }

async function indexExists(name: string): Promise<boolean> {
  const res = await fetch(`https://api.pinecone.io/indexes/${name}`, {
    headers: { 'Api-Key': KEY, Accept: 'application/json' },
  })
  return res.status === 200
}

async function createIndex(name: string, dimension: number) {
  if (await indexExists(name)) {
    console.log(`Index "${name}" already exists.`)
    return
  }
  console.log(`Creating index "${name}" (dim=${dimension}, cosine)...`)
  const res = await fetch('https://api.pinecone.io/indexes', {
    method: 'POST',
    headers: pineconeHeaders,
    body: JSON.stringify({
      name,
      dimension,
      metric: 'cosine',
      spec: { serverless: { cloud: 'aws', region: 'us-east-1' } },
    }),
  })
  if (!res.ok) {
    throw new Error(`Create index failed (${res.status}): ${await res.text()}`)
  }
  console.log('Created:', JSON.stringify(await res.json()))
}

async function waitForReady(name: string): Promise<string> {
  for (let i = 0; i < 60; i++) {
    const res = await fetch(`https://api.pinecone.io/indexes/${name}`, {
      headers: { 'Api-Key': KEY, Accept: 'application/json' },
    })
    const data = await res.json()
    if (data.status?.ready && data.host) {
      console.log(`Index "${name}" is ready.`)
      return data.host
    }
    console.log(`  waiting for "${name}"... (${data.status?.state})`)
    await new Promise((r) => setTimeout(r, 3000))
  }
  throw new Error(`Index "${name}" did not become ready in time.`)
}

async function fetchFromOld(): Promise<any[]> {
  const listRes = await fetch(`https://${OLD_HOST}/vectors/list?limit=100`, {
    headers: { 'Api-Key': KEY, Accept: 'application/json' },
  })
  const listData = await listRes.json()
  const ids = (listData.vectors || []).map((v: any) => v.id)
  console.log(`Found ${ids.length} vectors in old index.`)

  // Fetch with metadata via /vectors/fetch using the `ids` query param.
  // Pinecone expects repeated `ids=` params (no empty value).
  const qs = new URLSearchParams()
  for (const id of ids) qs.append('ids', id)
  const fetchRes = await fetch(`https://${OLD_HOST}/vectors/fetch?${qs.toString()}`, {
    headers: { 'Api-Key': KEY, Accept: 'application/json' },
  })
  const fetchData = await fetchRes.json()
  if (!fetchRes.ok) {
    throw new Error(`Fetch failed (${fetchRes.status}): ${JSON.stringify(fetchData)}`)
  }
  const vectors = Object.values(fetchData.vectors || {}) as any[]
  console.log(`Fetched ${vectors.length} vectors with metadata.`)
  return vectors
}

async function main() {
  const emb = await import('../lib/embeddings')
  const info = emb.getEmbeddingInfo()
  console.log('Embedding config:', info)
  if (info.provider !== 'voyage') {
    throw new Error(`Refusing to migrate: provider is "${info.provider}", expected "voyage".`)
  }
  const dimension = info.dimension

  await createIndex(NEW_INDEX, dimension)
  const newHost = await waitForReady(NEW_INDEX)

  const oldVectors = await fetchFromOld()

  const texts = oldVectors.map((v: any) => v.metadata?.text || '')
  const embeddings = await emb.generateEmbeddings(texts, { inputType: 'document' })

  const newVectors = oldVectors.map((v: any, i: number) => ({
    id: v.id,
    values: embeddings[i],
    metadata: v.metadata,
  }))

  const res = await fetch(`https://${newHost}/vectors/upsert`, {
    method: 'POST',
    headers: pineconeHeaders,
    body: JSON.stringify({ vectors: newVectors }),
  })
  if (!res.ok) {
    throw new Error(`Upsert failed (${res.status}): ${await res.text()}`)
  }
  const upsertData = await res.json()
  console.log(`Upserted ${upsertData.upsertedCount} vectors into "${NEW_INDEX}".`)

  // Verify
  const stats = await fetch(`https://${newHost}/describe_index_stats`, {
    method: 'POST',
    headers: pineconeHeaders,
    body: JSON.stringify({}),
  })
  console.log('NEW INDEX STATS:', JSON.stringify(await stats.json(), null, 2))

  console.log(`\n✅ Migration complete. Set PINECONE_INDEX=${NEW_INDEX} in .env.local and Vercel.`)
}

main().catch((e) => {
  console.error('❌ Migration failed:', e)
  process.exit(1)
})
