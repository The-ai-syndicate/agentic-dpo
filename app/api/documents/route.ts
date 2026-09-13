import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest, attachUserCookie } from '@/lib/ingestion/identity'
import { ensureIngestionTables, listDocuments } from '@/lib/ingestion/document-service'
import { getJob } from '@/lib/ingestion/document-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * List the current user's ingested documents, each with its latest job status
 * so the UI can show progress bars next to previously uploaded files.
 */
export async function GET(request: NextRequest) {
  try {
    await ensureIngestionTables()
    const { userId, isNew } = getUserIdFromRequest(request)

    const docs = await listDocuments(userId)

    const withJobs = await Promise.all(
      docs.map(async (doc) => {
        // Latest job for status display (list is small; sequential is fine).
        const { supabase } = await import('@/lib/supabase')
        const { data } = await supabase
          .from('jobs')
          .select('id,status,progress,total,last_chunk_idx,error_msg')
          .eq('document_id', doc.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        return { ...doc, job: data || null }
      })
    )

    const res = NextResponse.json({ documents: withJobs })
    return attachUserCookie(res, userId, isNew)
  } catch (err) {
    console.error('[/api/documents] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to list documents' },
      { status: 500 }
    )
  }
}
