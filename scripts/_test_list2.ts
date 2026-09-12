import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const KEY = process.env.PINECONE_API_KEY!
const INDEX = process.env.PINECONE_INDEX || 'knowledge-base'

async function main() {
  const info = await fetch(`https://api.pinecone.io/indexes/${INDEX}`, {
    headers: { 'Api-Key': KEY, Accept: 'application/json' },
  })
  const host = (await info.json()).host
  const ids = [
    '37e42396-75ef-4e53-ac30-69c02a44b223#chunk-0',
    '37e42396-75ef-4e53-ac30-69c02a44b223#chunk-1',
  ]

  // GET fetch form
  const url = `https://${host}/vectors/fetch?` + ids.map((i) => `ids=${encodeURIComponent(i)}`).join('&')
  const r = await fetch(url, { headers: { 'Api-Key': KEY, Accept: 'application/json' } })
  const t = await r.text()
  console.log('GET fetch status:', r.status)
  console.log('body (first 300):', t.slice(0, 300))
}

main().catch((e) => console.error('ERR', e))
