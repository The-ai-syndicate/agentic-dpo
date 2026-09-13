import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/ingestion/identity'
import {
  ensureIngestionTables,
  getDocument,
  deleteDocument,
} from '@/lib/ingestion/document-service'
import { deleteVectorsByDocId } from '@/lib/ingestion/pinecone-writer'
import { removeFile } from '@/lib/ingestion/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Delete a document: its vectors from Pinecone (metadata filter on doc_id),
 * its stored raw file, and its `documents` row (jobs cascade via FK).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  try {
    await ensureIngestionTables()
    const { docId } = await params
    if (!UUID_REGEX.test(docId)) {
      return NextResponse.json({ error: 'Invalid document id' }, { status: 400 })
    }

    const { userId } = getUserIdFromRequest(request)
    const doc = await getDocument(docId)
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }
    // Scope deletion to the owner (cookie-based identity).
    if (doc.user_id !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // 1. Remove vectors from Pinecone.
    try {
      await deleteVectorsByDocId(docId)
    } catch (e) {
      console.error(`[delete] Pinecone vector deletion failed for ${docId}:`, e)
      return NextResponse.json(
        {
          error: 'Failed to remove vectors from the knowledge base',
          message: e instanceof Error ? e.message : String(e),
        },
        { status: 502 }
      )
    }

    // 2. Remove the raw stored file (best-effort).
    if (doc.storage_path) await removeFile(doc.storage_path)

    // 3. Remove the document row (jobs cascade).
    await deleteDocument(docId)

    return NextResponse.json({ success: true, documentId: docId })
  } catch (err) {
    console.error('[DELETE /api/documents/:docId] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Delete failed' },
      { status: 500 }
    )
  }
}
