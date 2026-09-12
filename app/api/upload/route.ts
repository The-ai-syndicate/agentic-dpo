import { NextRequest, NextResponse } from 'next/server'
import { createRequire } from 'module'
import { upsertToPinecone } from '@/lib/pinecone'
import { uploadConcurrentLimiter, getClientIP } from '@/lib/rate-limit'
import { z } from 'zod'

const require = createRequire(import.meta.url)

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024
const MAX_TEXT_LENGTH = 500000
const ALLOWED_EXTENSIONS = [
  'pdf', 'txt', 'md', 'csv', 'json', 'html', 'xml', 'yaml', 'yml', 'log',
  'docx', 'doc', 'rtf', 'odt',
]
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const UploadMetaSchema = z.object({
  title: z.string().max(500).optional(),
  source: z.string().max(200).optional(),
  category: z.string().max(200).optional(),
  text: z.string().max(MAX_TEXT_LENGTH).optional(),
})

async function extractPDFText(buffer: Buffer): Promise<string> {
  console.log(`extractPDFText: starting extraction for buffer of size ${buffer.length}`)
  try {
    let pdf;
    const searchPaths = [
      'pdf-parse',
      'pdf-parse/lib/pdf-parse.js',
      'pdf-parse/dist/pdf-parse/cjs/index.cjs'
    ];

    for (const path of searchPaths) {
      try {
        console.log(`extractPDFText: trying require('${path}')`)
        pdf = require(path)
        if (pdf) {
          console.log(`extractPDFText: successfully loaded from ${path}`)
          break
        }
      } catch (e) {
        console.log(`extractPDFText: require('${path}') failed`)
      }
    }

    if (!pdf) {
      throw new Error('Could not load pdf-parse from any known path.')
    }

    let text = ''

    if (typeof pdf === 'function') {
      const data = await pdf(buffer)
      text = data.text || ''
    } else if (pdf && pdf.PDFParse) {
      const parser = new pdf.PDFParse({ data: new Uint8Array(buffer), verbosity: 0 })
      const data = await parser.getText()
      text = data.text || ''
      await parser.destroy().catch(() => {})
    } else if (pdf && typeof pdf.default === 'function') {
      const data = await pdf.default(buffer)
      text = data.text || ''
    } else {
      const keys = pdf ? Object.keys(pdf) : []
      throw new Error(`Unsupported pdf-parse API. Available keys: ${keys.join(', ')}`)
    }

    return text.substring(0, MAX_TEXT_LENGTH)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    throw new Error(`Failed to extract text from PDF: ${message}`)
  }
}

async function processFile(file: File): Promise<{
  content: string
  fileType: string
  fileSize: number
  extractionMethod: string
  extractedTextLength: number
  wordCount: number
  lineCount: number
}> {
  const fileName = file.name.toLowerCase()
  const fileSize = file.size
  const ext = fileName.split('.').pop() || 'unknown'

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`File type .${ext} is not allowed.`)
  }

  if (fileSize > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB.`)
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  let content = ''
  let extractionMethod = ''

  if (ext === 'pdf') {
    extractionMethod = 'pdf-parse (text extraction)'
    content = await extractPDFText(buffer)

    if (content.trim().length < 50) {
      extractionMethod += ' - Minimal text extracted (PDF may be scan/image-based)'
    }
  } else if (['txt', 'md', 'csv', 'json', 'html', 'xml', 'yaml', 'yml', 'log'].includes(ext)) {
    extractionMethod = 'direct UTF-8 read'
    content = buffer.toString('utf-8')
  } else {
    extractionMethod = 'fallback UTF-8 read'
    content = buffer.toString('utf-8')
  }

  const extractedTextLength = content.length
  const words = content.trim() ? content.trim().split(/\s+/).length : 0
  const lines = content ? content.split('\n').length : 0

  return {
    content,
    fileType: ext,
    fileSize,
    extractionMethod,
    extractedTextLength,
    wordCount: words,
    lineCount: lines,
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    limits: {
      maxFileSizeMB: MAX_FILE_SIZE_BYTES / 1024 / 1024,
      maxTextLength: MAX_TEXT_LENGTH,
      allowedExtensions: ALLOWED_EXTENSIONS,
    }
  })
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request)
  const acquireKey = `upload:${ip}`

  if (!uploadConcurrentLimiter.tryAcquire(acquireKey)) {
    return NextResponse.json(
      {
        error: 'Too Many Concurrent Uploads',
        message: 'Please wait for current uploads to complete.',
      },
      { status: 429 }
    )
  }

  try {
    const contentType = request.headers.get('content-type') || ''

    if (!contentType.includes('multipart/form-data') && !contentType.includes('application/json')) {
      uploadConcurrentLimiter.release(acquireKey)
      return NextResponse.json(
        { error: 'Invalid Content-Type. Use multipart/form-data or application/json.' },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    let title = formData.get('title') as string || ''
    const source = formData.get('source') as string || 'manual-upload'
    const category = formData.get('category') as string || 'general'
    const text = formData.get('text') as string | null

    const metaParsed = UploadMetaSchema.safeParse({ title, source, category, text: text || undefined })
    if (!metaParsed.success) {
      uploadConcurrentLimiter.release(acquireKey)
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: metaParsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    let content = metaParsed.data.text || ''
    let fileType = 'text'
    let fileSize = 0
    let extractionMethod = 'direct-input'
    let wordCount = 0
    let lineCount = 0

    if (file) {
      try {
        const processed = await processFile(file)
        content = processed.content
        fileType = processed.fileType
        fileSize = processed.fileSize
        extractionMethod = processed.extractionMethod
        wordCount = processed.wordCount
        lineCount = processed.lineCount
      } catch (procErr) {
        uploadConcurrentLimiter.release(acquireKey)
        const msg = procErr instanceof Error ? procErr.message : 'Upload processing failed'
        return NextResponse.json({ error: msg }, { status: 400 })
      }

      if (!metaParsed.data.title || metaParsed.data.title === 'Untitled Document') {
        title = file.name.replace(/\.[^/.]+$/, '')
      } else {
        title = metaParsed.data.title
      }
    } else if (metaParsed.data.text) {
      wordCount = metaParsed.data.text.trim() ? metaParsed.data.text.trim().split(/\s+/).length : 0
      lineCount = metaParsed.data.text ? metaParsed.data.text.split('\n').length : 0
      fileSize = metaParsed.data.text.length
      extractionMethod = 'pasted-text'
      title = metaParsed.data.title || title
    }

    if (!title) {
      title = 'Untitled Document'
    }

    if (!content || content.trim().length === 0) {
      uploadConcurrentLimiter.release(acquireKey)
      return NextResponse.json(
        { error: 'No content provided. Upload a file or paste text.' },
        { status: 400 }
      )
    }

    let id: string;
    try {
      id = crypto.randomUUID()
    } catch (e) {
      id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    try {
      await upsertToPinecone({
        id,
        title,
        text: content,
        source: metaParsed.data.source || source,
        category: metaParsed.data.category || category,
        fileType,
        wordCount,
        extractionMethod
      })
    } catch (pineconeErr) {
      uploadConcurrentLimiter.release(acquireKey)
      console.error('Pinecone Error:', pineconeErr)
      return NextResponse.json(
        { error: 'Failed to index document. Please try again later.' },
        { status: 500 }
      )
    }

    uploadConcurrentLimiter.release(acquireKey)
    return NextResponse.json({
      success: true,
      message: 'Document uploaded successfully',
      id,
      title,
      fileType,
      size: content.length,
      fileSize,
      wordCount,
      lineCount,
      extractionMethod,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    uploadConcurrentLimiter.release(acquireKey)
    console.error('UPLOAD ERROR:', error)
    const msg = error instanceof Error ? error.message : 'Upload failed'
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    )
  }
}
