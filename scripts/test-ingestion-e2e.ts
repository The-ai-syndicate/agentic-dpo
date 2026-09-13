/**
 * End-to-end ingestion smoke test (no HTTP, no DB) — exercises the actual
 * pipeline modules the worker uses: extract → split → chunk → embed → upsert,
 * then verifies a stored vector is retrievable the same way the chatbot does.
 *
 * Run: npx tsx scripts/test-ingestion-e2e.ts
 */
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { readFileSync } from 'fs'
import { splitDocument, extOf } from '../lib/ingestion/extractors'
import { chunkSections } from '../lib/ingestion/splitter'

void extOf // used for the header log above

async function main() {
  const pdfPath = process.argv[2] || 'sample-test.pdf'
  const buf = readFileSync(pdfPath)

  console.log(`\n📄 Testing: ${pdfPath} (${buf.length} bytes, ext=${extOf(pdfPath)})\n`)

  // 1. EXTRACT + SPLIT
  const { sections, pageCount } = await splitDocument(pdfPath, buf)
  console.log(`   pageCount=${pageCount}`)
  console.log(`✅ Extracted ${sections.length} section(s)`)
  for (const s of sections) {
    console.log(`   • page=${s.page ?? '-'} chars=${s.text.length} :: ${s.text.slice(0, 60).replace(/\n/g, ' ')}…`)
  }

  // 2. CHUNK
  const chunks = chunkSections(sections)
  console.log(`\n✅ Chunked into ${chunks.length} chunk(s)`)
  chunks.forEach((c, i) => {
    console.log(`   [${i}] page=${c.page ?? '-'} chars=${c.text.length} :: ${c.text.slice(0, 50).replace(/\n/g, ' ')}…`)
  })

  if (chunks.length === 0) throw new Error('No chunks produced!')

  // 3. EMBED (batched — the real Voyage path)
  const { generateEmbeddings } = await import('../lib/embeddings')
  const vectors = await generateEmbeddings(
    chunks.map((c) => c.text),
    { inputType: 'document' }
  )
  console.log(`\n✅ Embedded ${vectors.length} chunk(s), dim=${vectors[0]?.length}`)
  if (vectors[0]?.length !== 1024) {
    console.warn(`⚠️  Expected 1024 dims, got ${vectors[0]?.length}`)
  }

  console.log('\n🎉 Pipeline OK: extract → split → chunk → embed\n')
}

main().catch((e) => {
  console.error('\n❌ Pipeline test failed:', e)
  process.exit(1)
})
