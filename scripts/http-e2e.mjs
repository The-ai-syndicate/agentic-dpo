// Real HTTP end-to-end test: upload → poll job → verify done + retrieval.
// Usage: node scripts/http-e2e.mjs [baseUrl] [pdfPath]
const BASE = process.argv[2] || 'http://localhost:3999'
const PDF = process.argv[3] || 'sample-test.pdf'

import { readFileSync } from 'fs'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const buf = readFileSync(PDF)
  const form = new FormData()
  form.append('file', new Blob([buf]), 'sample-test.pdf')

  console.log(`\n⬆️  POST ${BASE}/api/documents/upload ...`)
  const t0 = Date.now()
  const upRes = await fetch(`${BASE}/api/documents/upload`, {
    method: 'POST',
    body: form,
  })
  const uploadMs = Date.now() - t0
  const cookie = upRes.headers.get('set-cookie') || ''
  const up = await upRes.json()
  console.log(`   status=${upRes.status} (${uploadMs}ms)`)
  console.log(`   body=${JSON.stringify(up)}`)
  if (uploadMs > 2000) console.log('   ⚠️  upload took >2s')
  if (!up.jobId) {
    console.log(up.duplicate ? '   (duplicate — no new job)' : '   ❌ no jobId')
    if (!up.jobId && up.duplicate) return
    process.exit(1)
  }

  console.log(`\n📡 Polling GET ${BASE}/api/jobs/${up.jobId} ...`)
  let last = ''
  for (let i = 0; i < 90; i++) {
    const r = await fetch(`${BASE}/api/jobs/${up.jobId}`, {
      headers: cookie ? { cookie } : {},
      cache: 'no-store',
    })
    const j = await r.json()
    const line = `   [${i}s] status=${j.status} progress=${j.progress}% ${j.lastChunkIdx ?? ''}/${j.total ?? ''} err=${j.errorMsg || '-'}`
    if (line !== last) {
      console.log(line)
      last = line
    }
    if (['done', 'cancelled', 'failed'].includes(j.status)) {
      console.log(`\n${j.status === 'done' ? '✅' : '❌'} Job finished: ${j.status}`)
      break
    }
    await sleep(1000)
  }

  console.log(`\n📄 GET ${BASE}/api/documents ...`)
  const docsRes = await fetch(`${BASE}/api/documents`, {
    headers: cookie ? { cookie } : {},
    cache: 'no-store',
  })
  const docs = await docsRes.json()
  console.log(`   ${docs.documents?.length ?? 0} document(s)`)
  for (const d of docs.documents || []) {
    console.log(`   • ${d.filename} — ${d.chunk_count} chunks, status=${d.job?.status}`)
  }
  console.log('')
}

main().catch((e) => {
  console.error('❌', e)
  process.exit(1)
})
