import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function main() {
  const m = await import('../lib/pinecone')
  const queries = [
    'What does the Act say about data security?',
    'data security safeguards',
    'penalties for non-compliance',
  ]
  for (const q of queries) {
    console.log('\n=== QUERY:', q, '===')
    try {
      const r = await m.getGroundedContext(q, 5)
      console.log('matchCount:', r.matchCount)
      console.log('bestScore:', r.bestScore)
      console.log('sources:', r.sources)
      console.log('contextLen:', r.context.length)
      console.log('preview:', r.context.slice(0, 200).replace(/\n/g, ' '))
    } catch (e) {
      console.error('ERR', e)
    }
  }
  console.log('\nOPENAI key set:', !!process.env.OPENAI_API_KEY)
  console.log('PINECONE_INDEX:', process.env.PINECONE_INDEX)
  console.log('EMBEDDING_DIMENSION:', process.env.EMBEDDING_DIMENSION)
}

main().catch(console.error)
