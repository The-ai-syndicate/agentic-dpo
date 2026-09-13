import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const KEY = process.env.PINECONE_API_KEY!
const name = process.argv[2] || 'knowledge-base-voyage'
const H = { 'Api-Key': KEY, 'Accept': 'application/json' }
;(async () => {
  const res = await fetch(`https://api.pinecone.io/indexes/${name}`, { headers: H })
  const data = await res.json()
  const host = data.host
  const s = await fetch(`https://${host}/describe_index_stats`, {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'application/json' },
    body: '{}',
  })
  console.log(name, '->', host)
  console.log(JSON.stringify(await s.json(), null, 2))
})()
