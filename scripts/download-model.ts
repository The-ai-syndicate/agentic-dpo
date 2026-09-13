/**
 * Pre-download the local embedding model into ./models so it can be bundled
 * with the app and loaded at runtime WITHOUT any network access.
 *
 * Run this once locally (and in your build/CI step before deploying):
 *   npm run download-model
 *
 * Then set the env var:
 *   LOCAL_EMBEDDING_MODEL_PATH=./models/Xenova/all-MiniLM-L6-v2
 *
 * Why: serverless platforms (Vercel) run from a read-only filesystem and may
 * throttle/block outbound requests. Downloading the ~90MB model on every cold
 * start is unreliable and was the reason retrieval silently failed in
 * production (returning "I couldn't find anything…").
 */
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { pipeline, env } from '@xenova/transformers'

const MODEL = process.env.EMBEDDING_MODEL || 'all-MiniLM-L6-v2'
const OUT_DIR = process.env.LOCAL_EMBEDDING_MODEL_PATH || './models/Xenova/all-MiniLM-L6-v2'

async function main() {
  // Force everything to be cached under OUT_DIR.
  env.allowRemoteModels = true
  env.allowLocalModels = true
  env.useBrowserCache = false
  env.cacheDir = OUT_DIR

  console.log(`⬇️  Downloading Xenova/${MODEL} into ${OUT_DIR} ...`)
  const extractor = await pipeline('feature-extraction', `Xenova/${MODEL}`)

  // Sanity check: produce one embedding.
  const out = await extractor(['hello world'], { pooling: 'mean', normalize: true })
  console.log(`✅ Model ready. Embedding dims: ${out.dims}`)
  console.log(`\nSet this env var on your host:\n  LOCAL_EMBEDDING_MODEL_PATH=${OUT_DIR}`)
}

main().catch((err) => {
  console.error('❌ Model download failed:', err)
  process.exit(1)
})
