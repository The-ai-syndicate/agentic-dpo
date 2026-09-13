/**
 * One-off Pinecone admin script: inspect existing indexes and create the new
 * 1024-dim index for Voyage embeddings.
 *
 * Usage:
 *   npx tsx scripts/_pinecone-admin.ts inspect
 *   npx tsx scripts/_pinecone-admin.ts create knowledge-base-v2
 *   npx tsx scripts/_pinecone-admin.ts describe knowledge-base-v2
 */
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const KEY = process.env.PINECONE_API_KEY!
if (!KEY) {
  console.error('❌ PINECONE_API_KEY not set')
  process.exit(1)
}

const H = { 'Api-Key': KEY, 'Accept': 'application/json', 'Content-Type': 'application/json' }

async function listIndexes() {
  const res = await fetch('https://api.pinecone.io/indexes', { headers: H })
  const data = await res.json()
  console.log(JSON.stringify(data, null, 2))
}

async function describe(name: string) {
  const res = await fetch(`https://api.pinecone.io/indexes/${name}`, { headers: H })
  console.log(res.status)
  console.log(JSON.stringify(await res.json(), null, 2))
}

async function create(name: string) {
  const body = {
    name,
    dimension: 1024,
    metric: 'cosine',
    spec: { serverless: { cloud: 'aws', region: 'us-east-1' } },
  }
  const res = await fetch('https://api.pinecone.io/indexes', {
    method: 'POST',
    headers: H,
    body: JSON.stringify(body),
  })
  console.log('status', res.status)
  console.log(JSON.stringify(await res.json(), null, 2))
}

const [cmd, arg] = process.argv.slice(2)
;(async () => {
  if (cmd === 'inspect') return listIndexes()
  if (cmd === 'describe' && arg) return describe(arg)
  if (cmd === 'create' && arg) return create(arg)
  console.error('Usage: inspect | describe <name> | create <name>')
  process.exit(1)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
