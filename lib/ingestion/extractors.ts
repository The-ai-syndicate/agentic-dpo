import { createRequire } from 'module'
import type { Section } from './types'

const require = createRequire(import.meta.url)

/** Extensions we accept. */
export const ALLOWED_EXTENSIONS = [
  'pdf', 'docx', 'txt', 'md', 'markdown', 'csv', 'json', 'html', 'htm',
  'xml', 'yaml', 'yml', 'log', 'rtf',
]

export function extOf(filename: string): string {
  return (filename.toLowerCase().split('.').pop() || '').trim()
}

/* -------------------------------------------------------------------------- */
/*  Splitting (per format)                                                     */
/* -------------------------------------------------------------------------- */

/** Markdown heading regex: lines starting with 1-6 #'s. */
const MD_HEADING = /^#{1,6}\s+/

/** Split plain text into paragraph sections. */
function splitByParagraph(text: string): Section[] {
  const paras = text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (paras.length === 0) return [{ page: 1, text: text.trim() }].filter((s) => s.text)
  return paras.map((p, i) => ({ page: i + 1, text: p }))
}

/** Split markdown by headings (keeping the heading with its body). */
function splitByMarkdownHeading(text: string): Section[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const sections: Section[] = []
  let heading: string | undefined
  let buf: string[] = []

  const flush = () => {
    const body = buf.join('\n').trim()
    if (body) sections.push({ page: sections.length + 1, heading, text: body })
    buf = []
  }

  for (const line of lines) {
    if (MD_HEADING.test(line)) {
      flush()
      heading = line.replace(MD_HEADING, '').trim()
    } else {
      buf.push(line)
    }
  }
  flush()
  return sections.length ? sections : splitByParagraph(text)
}

/** Split DOCX text by heading level (extractor inserts "HEADING:" markers). */
function splitByDocxHeading(text: string): Section[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const sections: Section[] = []
  let heading: string | undefined
  let buf: string[] = []

  const flush = () => {
    const body = buf.join('\n').trim()
    if (body) sections.push({ page: sections.length + 1, heading, text: body })
    buf = []
  }

  for (const line of lines) {
    if (line.startsWith('HEADING:')) {
      flush()
      heading = line.replace('HEADING:', '').trim()
    } else {
      buf.push(line)
    }
  }
  flush()
  return sections.length ? sections : splitByParagraph(text)
}

/** Split PDF text by page — extractor inserts "\f" (form feed) between pages. */
function splitByPage(text: string): Section[] {
  const pages = text.replace(/\r\n/g, '\n').split('\f')
  return pages
    .map((p, i) => ({ page: i + 1, text: p.trim() }))
    .filter((s) => s.text.length > 0)
}

/* -------------------------------------------------------------------------- */
/*  Extractors                                                                 */
/* -------------------------------------------------------------------------- */

async function extractPdf(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  let pdf: any
  const searchPaths = [
    'pdf-parse',
    'pdf-parse/lib/pdf-parse.js',
    'pdf-parse/dist/pdf-parse/cjs/index.cjs',
  ]
  for (const p of searchPaths) {
    try {
      pdf = require(p)
      if (pdf) break
    } catch {
      /* try next */
    }
  }
  if (!pdf) throw new Error('Could not load pdf-parse.')

  let text = ''
  let pageCount = 0

  // Prefer the class API which exposes per-page text so we can split by page.
  if (pdf.PDFParse) {
    const parser = new pdf.PDFParse({ data: new Uint8Array(buffer), verbosity: 0 })
    try {
      const result = await parser.getText()
      text = result?.text || ''
      // `result.pages` is an array of { text } when available.
      if (Array.isArray(result?.pages) && result.pages.length) {
        text = result.pages
          .map((pg: any) => (pg?.text || '').trim())
          .join('\n\f\n')
        pageCount = result.pages.length
      }
    } finally {
      await parser.destroy().catch(() => {})
    }
  } else if (typeof pdf === 'function') {
    const data = await pdf(buffer)
    text = data.text || ''
    pageCount = data.numpages || 0
  } else if (typeof pdf.default === 'function') {
    const data = await pdf.default(buffer)
    text = data.text || ''
    pageCount = data.numpages || 0
  } else {
    throw new Error('Unsupported pdf-parse API.')
  }

  return { text, pageCount }
}

async function extractDocx(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  // mammoth is OPTIONAL; if unavailable we fall back to a built-in XML unzip.
  // Loaded via an indirect specifier so the bundler can't statically resolve it
  // (avoids a "Can't resolve 'mammoth'" build warning when it isn't installed).
  try {
    const mammothName = ['mammoth'].join('')
    const mammoth = require(mammothName)
    const result = await mammoth.convertToHtml({ buffer })
    const html: string = result.value || ''
    // Convert <hN>...</hN> to HEADING markers so we can split by heading level.
    const text = html
      .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_m: string, _lvl: string, body: string) =>
        `\nHEADING: ${stripTags(body)}\n`
      )
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
    return { text, pageCount: 0 }
  } catch {
    // Crude fallback: unzip word/document.xml and strip tags.
    const zlib = require('zlib')
    let xml = ''
    try {
      xml = extractDocxXml(buffer, zlib)
    } catch {
      throw new Error('DOCX extraction failed — install "mammoth" for full support.')
    }
    const text = xml
      .replace(/<w:p[ >]/g, '\n<w:p ')
      .replace(/<\/w:p>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim()
    return { text, pageCount: 0 }
  }
}

/** Minimal ZIP entry reader for word/document.xml (no external deps). */
function extractDocxXml(buffer: Buffer, _zlib: unknown): string {
  // Locate the central directory entry for word/document.xml and inflate it.
  const { inflateRawSync } = require('zlib')
  const sig = Buffer.from([0x50, 0x4b, 0x01, 0x02]) // central dir header
  let idx = 0
  while (idx >= 0) {
    idx = buffer.indexOf(sig, idx)
    if (idx < 0) break
    const nameLen = buffer.readUInt16LE(idx + 28)
    const extraLen = buffer.readUInt16LE(idx + 30)
    const commentLen = buffer.readUInt16LE(idx + 32)
    const localOffset = buffer.readUInt32LE(idx + 42)
    const name = buffer
      .slice(idx + 46, idx + 46 + nameLen)
      .toString('utf-8')
    if (name === 'word/document.xml') {
      const localNameLen = buffer.readUInt16LE(localOffset + 26)
      const localExtraLen = buffer.readUInt16LE(localOffset + 28)
      const dataStart = localOffset + 30 + localNameLen + localExtraLen
      const compSize = buffer.readUInt32LE(idx + 20)
      const comp = buffer.slice(dataStart, dataStart + compSize)
      try {
        return inflateRawSync(comp).toString('utf-8')
      } catch {
        return comp.toString('utf-8')
      }
    }
    idx += 46 + nameLen + extraLen + commentLen
  }
  throw new Error('word/document.xml not found in DOCX')
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

/* -------------------------------------------------------------------------- */
/*  Public API                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Validate + extract + SPLIT a file into logical sections.
 *  - PDF  → by page (then paragraph-split within the page if huge)
 *  - DOCX → by heading level
 *  - MD   → by markdown heading
 *  - TXT  → by paragraph
 */
export async function splitDocument(
  filename: string,
  buffer: Buffer
): Promise<{ sections: Section[]; pageCount: number; textLength: number }> {
  const ext = extOf(filename)

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`File type .${ext} is not supported.`)
  }
  if (buffer.length === 0) {
    throw new Error('File is empty.')
  }

  let sections: Section[] = []
  let pageCount = 0
  let fullText = ''

  if (ext === 'pdf') {
    const { text, pageCount: pc } = await extractPdf(buffer)
    fullText = text
    pageCount = pc
    sections = splitByPage(text)
  } else if (ext === 'docx') {
    const { text } = await extractDocx(buffer)
    fullText = text
    sections = splitByDocxHeading(text)
  } else if (ext === 'md' || ext === 'markdown') {
    fullText = buffer.toString('utf-8')
    sections = splitByMarkdownHeading(fullText)
  } else if (['html', 'htm', 'xml', 'rtf'].includes(ext)) {
    fullText = buffer.toString('utf-8')
    sections = splitByParagraph(stripTags(fullText))
  } else {
    // txt, csv, json, yaml, log…
    fullText = buffer.toString('utf-8')
    sections = splitByParagraph(fullText)
  }

  return { sections, pageCount, textLength: fullText.length }
}
