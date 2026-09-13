import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const { data: docs, error: dErr } = await sb
  .from('documents')
  .select('id, filename, file_hash, size_bytes, chunk_count, created_at')
  .order('created_at', { ascending: false })
  .limit(5)
console.log('=== DOCUMENTS ===')
console.log(JSON.stringify(docs, null, 2))
if (dErr) console.log('doc error:', dErr)

const { data: jobs, error: jErr } = await sb
  .from('jobs')
  .select('id, document_id, status, progress, total, last_chunk_idx, error_msg, created_at, updated_at')
  .order('created_at', { ascending: false })
  .limit(5)
console.log('=== JOBS ===')
console.log(JSON.stringify(jobs, null, 2))
if (jErr) console.log('job error:', jErr)
