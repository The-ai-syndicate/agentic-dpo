import 'dotenv/config'
import {
  EMBEDDING_DIMENSION,
  EMBEDDING_MODEL,
  isSemanticEmbeddingEnabled,
  generateEmbedding,
  generateEmbeddings,
} from '../lib/embeddings'

async function main() {
  console.log('dimension:', EMBEDDING_DIMENSION)
  console.log('model:', EMBEDDING_MODEL)
  console.log('semantic enabled:', isSemanticEmbeddingEnabled())

  const batch = await generateEmbeddings(['data protection rights', 'personal data definition'])
  console.log('batch size:', batch.length)
  console.log('vector length:', batch[0].length)

  const one = await generateEmbedding('hello')
  console.log('single vector length:', one.length)
}

main().catch((e) => {
  console.error('ERR', e)
  process.exit(1)
})
