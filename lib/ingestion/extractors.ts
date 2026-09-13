import type { Section } from './types'

/**
 * Opaque Node `require`, obtained via `eval` and resolved LAZILY.
 *
 * Webpack flags any `require()` whose argument is not a string literal (and any
 * use of `createRequire().resolve`) with a "Critical dependency" warning. We
 * must load pdf-parse / mammoth dynamically (pdf-parse v2 has a strict `exports`
 * map that blocks deep subpath requires; mammoth is optional), so we grab the
 * real Node `require` through `eval` — invisible to the bundler.
 *
 * Resolution is deferred to first use: during `next build`'s page-data
 * collection webpack evaluates this module in an ESM scope where neither `eval`
 * nor a top-level `require` is guaranteed, so we must not touch `require` at
 * module-eval time. `createRequire` is imported dynamically as a last resort.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedRequire: NodeRequire | null = null

function getRequire(): NodeRequire {
  if (cachedRequire) return cachedRequire

  // 1. The genuine CommonJS require, if we're running in a CJS-ish context.
  try {
    // eslint-disable-next-line no-eval
    const r = (0, eval)('require') as NodeRequire
    if (typeof r === 'function') {
      cachedRequire = r
      return r
    }
  } catch {
    /* not available (e.g. pure ESM) — fall through */
  }

  // 2. Fallback: build a require bound to this module's URL. Referenced
  //    dynamically so webpack never statically links `createRequire().resolve`.
  //    Prefer `process.getBuiltinModule` (Node >=20.16, no global require
  //    needed); otherwise reach `node:module` through the CJS require.
  type CreateRequire = (p: string) => NodeRequire
  let createRequireFn: CreateRequire | undefined

  const getBuiltin = (process as unknown as {
    getBuiltinModule?: (id: string) => { createRequire: CreateRequire }
  }).getBuiltinModule
  if (typeof getBuiltin === 'function') {
    createRequireFn = getBuiltin.call(process, 'node:module')?.createRequire
  }
  if (!createRequireFn) {
    // eslint-disable-next-line no-eval
    const mod = (0, eval)('require')('node:module') as { createRequire: CreateRequire }
    createRequireFn = mod.createRequire
  }

  const r = createRequireFn(import.meta.url)
  cachedRequire = r
  return r
}

/** Opaque `require.resolve` (reached via the lazily-resolved `require`). */
type SafeResolve = (request: string, options?: { paths?: string[] }) => string
function safeResolve(request: string, options?: { paths?: string[] }): string {
  const req = getRequire() as unknown as Record<string, SafeResolve>
  return req['resolve'](request, options)
}

/** Opaque require call (lazily resolved). */
function safeRequire(request: string): unknown {
  return getRequire()(request)
}

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

/**
 * Load the pdf-parse module in a bundler-proof way.
 *
 * pdf-parse v2 is an ESM-first package with a strict `exports` map that blocks
 * deep subpath requires, and Next.js/webpack rewrites plain `require('pdf-parse')`
 * calls inside server chunks. To stay reliable in BOTH `tsx` (raw Node) and the
 * compiled Next.js server, we resolve the package's real entry file to an
 * ABSOLUTE path via `require.resolve` (against the project cwd + this module),
 * then `require()` that absolute file — which webpack cannot statically analyse.
 */
function loadPdfParse(): any {
  const attempts: Array<() => any> = [
    // 1. Resolve the package entry to an absolute path, then require it.
    () => {
      const abs = safeResolve('pdf-parse', { paths: [process.cwd()] })
      return safeRequire(abs)
    },
    // 2. Same, but resolved relative to this module's location.
    () => {
      const abs = safeResolve('pdf-parse')
      return safeRequire(abs)
    },
    // 3. Bare specifier (works in raw Node / when externalised correctly).
    () => safeRequire('pdf-parse'),
  ]

  for (const attempt of attempts) {
    try {
      const mod = attempt()
      if (mod && (mod.PDFParse || typeof mod === 'function' || typeof mod.default === 'function')) {
        return mod
      }
    } catch {
      /* try next strategy */
    }
  }
  return null
}

async function extractPdf(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  const pdf = loadPdfParse()
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
    const mammoth = safeRequire('mammoth')
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
    const zlib = safeRequire('zlib')
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
  const { inflateRawSync } = safeRequire('zlib')
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
