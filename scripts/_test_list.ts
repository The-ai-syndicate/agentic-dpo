import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const KEY = process.env.PINECONE_API_KEY!
const INDEX = process.env.PINECONE_INDEX || 'knowledge-base'

async function main() {
  const info = await fetch(`https://api.pinecone.io/indexes/${INDEX}`, {
    headers: { 'Api-Key': KEY, Accept: 'application/json' },
  })
  const meta = await info.json()
  const host = meta.host
  console.log('host:', host)

  const listRes = await fetch(`https://${host}/vectors/list?limit=100`, {
    method: 'GET',
    headers: { 'Api-Key': KEY, 'Content-Type': 'application/json' },
  })
  const listText = await listRes.text()
  console.log('\nLIST status:', listRes.status)
  console.log('LIST body:', listText)

  const ids = JSON.parse(listText).vectors.map((v: any) => v.id)
  console.log('\nids:', ids)

  const fetchRes = await fetch(`https://${host}/vectors/fetch`, {
    method: 'POST',
    headers: { 'Api-Key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  })
  const fetchText = await fetchRes.text()
  console.log('\nFETCH status:', fetchRes.status)
  console.log('FETCH body (first 500):', fetchText.slice(0, 500))
}

main().catch((e) => console.error('ERR', e))
