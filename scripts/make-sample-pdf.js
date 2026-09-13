// Generates a tiny valid single-page PDF for testing the ingestion pipeline.
const fs = require('fs')

const text = [
  'Botswana Data Protection Act 2018',
  'Section 1: Definitions and scope.',
  'A data subject means an individual who is the subject of personal data.',
  'The Commissioner is responsible for enforcing this Act.',
]

const contentStream = [
  'BT /F1 16 Tf 72 720 Td',
  `(${text[0]}) Tj`,
  ...text.slice(1).flatMap((line) => ['0 -28 Td', `(${line}) Tj`]),
  'ET',
].join('\n')

const objects = {
  1: '<< /Type /Catalog /Pages 2 0 R >>',
  2: '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  3: '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
  4: `<< /Length ${Buffer.byteLength(contentStream)} >>\nstream\n${contentStream}\nendstream`,
  5: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
}

let pdf = '%PDF-1.4\n'
const offsets = {}
for (const [num, body] of Object.entries(objects)) {
  offsets[num] = Buffer.byteLength(pdf)
  pdf += `${num} 0 obj\n${body}\nendobj\n`
}
const xrefOffset = Buffer.byteLength(pdf)
const maxNum = Object.keys(objects).length
pdf += `xref\n0 ${maxNum + 1}\n0000000000 65535 f \n`
for (let i = 1; i <= maxNum; i++) {
  pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
}
pdf += `trailer\n<< /Size ${maxNum + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`

const out = process.argv[2] || 'sample-test.pdf'
fs.writeFileSync(out, pdf, 'binary')
console.log(`Wrote ${out} (${Buffer.byteLength(pdf)} bytes)`)
