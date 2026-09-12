import { pipeline } from '@xenova/transformers'

async function main() {
  const extractor = await pipeline(
    'feature-extraction',
    'Xenova/all-MiniLM-L6-v2'
  )
  const texts = [
    'What does the Act say about data security?',
    'security safeguards technical organisational measures',
    'transborder transfer of personal data',
  ]
  const out = await extractor(texts, { pooling: 'mean', normalize: true })
  console.log('dims:', out.dims)
  const arr = out.tolist()
  // cosine similarity of query vs the two docs
  const cos = (a: number[], b: number[]) =>
    a.reduce((s, v, i) => s + v * b[i], 0)
  console.log('query~security:', cos(arr[0], arr[1]).toFixed(4))
  console.log('query~transborder:', cos(arr[0], arr[2]).toFixed(4))
}

main().catch((e) => console.error(e))
