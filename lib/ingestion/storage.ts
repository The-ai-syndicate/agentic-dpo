import { createHash } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'
import { supabase } from '../supabase'

const BUCKET = process.env.INGESTION_BUCKET || 'ingested-documents'
const LOCAL_DIR = path.join(process.cwd(), '.ingested-documents')
const USE_LOCAL = process.env.INGESTION_STORAGE === 'local'

/** SHA-256 of a buffer, hex-encoded (idempotency key). */
export function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

/**
 * Persist the raw file so the worker can re-read it (and so we keep an audit
 * copy). Prefers the Supabase Storage bucket; falls back to local disk in dev.
 * Returns a storage_path (bucket key or local file path).
 */
export async function saveFile(
  userId: string,
  filename: string,
  buffer: Buffer
): Promise<string> {
  const safeName = filename.replace(/[^\w.\-]+/g, '_').slice(0, 120)
  const key = `${userId}/${Date.now()}-${safeName}`

  if (!USE_LOCAL) {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(key, buffer, {
        contentType: 'application/octet-stream',
        upsert: false,
      })
    if (!error) return `supabase://${BUCKET}/${key}`
    console.warn(
      `⚠️ Supabase storage upload failed (${error.message}); falling back to local disk.`
    )
  }

  await fs.mkdir(LOCAL_DIR, { recursive: true })
  const localPath = path.join(LOCAL_DIR, path.basename(key))
  await fs.mkdir(path.dirname(localPath), { recursive: true })
  await fs.writeFile(localPath, buffer)
  return `file://${localPath}`
}

/** Read a previously saved file back as a Buffer. */
export async function readFile(storagePath: string): Promise<Buffer> {
  if (storagePath.startsWith('supabase://')) {
    const key = storagePath.replace(`supabase://${BUCKET}/`, '')
    const { data, error } = await supabase.storage.from(BUCKET).download(key)
    if (error || !data) {
      throw new Error(`Failed to download stored file: ${error?.message}`)
    }
    return Buffer.from(await data.arrayBuffer())
  }
  if (storagePath.startsWith('file://')) {
    return fs.readFile(storagePath.replace('file://', ''))
  }
  throw new Error(`Unrecognized storage path: ${storagePath}`)
}

/** Delete a stored file (best-effort). */
export async function removeFile(storagePath: string): Promise<void> {
  try {
    if (storagePath.startsWith('supabase://')) {
      const key = storagePath.replace(`supabase://${BUCKET}/`, '')
      await supabase.storage.from(BUCKET).remove([key])
    } else if (storagePath.startsWith('file://')) {
      await fs.unlink(storagePath.replace('file://', '')).catch(() => {})
    }
  } catch (e) {
    console.warn('removeFile (non-fatal):', e)
  }
}
