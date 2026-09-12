import * as fs from 'fs'
const p = '.env.local'
let s = fs.readFileSync(p, 'utf8')

// Normalize the dimension/model lines regardless of line endings
s = s.replace(/OPENAI_API_KEY=.*/m, 'OPENAI_API_KEY=')
s = s.replace(/EMBEDDING_MODEL=.*/m, 'EMBEDDING_MODEL=all-MiniLM-L6-v2')
s = s.replace(/EMBEDDING_DIMENSION=.*/m, 'EMBEDDING_DIMENSION=384')

fs.writeFileSync(p, s)
console.log('Updated env lines:')
for (const line of s.split(/\r?\n/)) {
  if (/OPENAI_API_KEY|EMBEDDING_|PINECONE_INDEX/.test(line)) console.log('  ' + line)
}
