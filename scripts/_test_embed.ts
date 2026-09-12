import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const KEY = process.env.AI_GATEWAY_API_KEY!

async function testModel(model: string) {
  try {
    const res = await fetch('https://ai-gateway.vercel.sh/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, input: ['hello world'] }),
    })
    const text = await res.text()
    if (!res.ok) {
      console.log(`❌ ${model}: ${res.status} ${text.slice(0, 200)}`)
      return
    }
    const data = JSON.parse(text)
    const dim = data.data?.[0]?.embedding?.length
    console.log(`✅ ${model}: dim=${dim}`)
  } catch (e) {
    console.log(`❌ ${model}: ${(e as Error).message}`)
  }
}

async function main() {
  const models = [
    'openai/text-embedding-3-small',
    'openai/text-embedding-3-large',
    'cohere/embed-english-v3.0',
    'cohere/embed-multilingual-v3.0',
  ]
  for (const m of models) await testModel(m)
}

main()
