import type { Chunk, Section } from './types'

/**
 * Token estimation. We avoid pulling a tokenizer into the hot path: ~4 chars
 * per token is a close, conservative approximation for English/legal text.
 * 500 tokens ≈ 2000 chars, 50 tokens ≈ 200 chars overlap.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

const CHARS_PER_TOKEN = 4
const CHUNK_TOKENS = Number(process.env.INGESTION_CHUNK_TOKENS || 500)
const OVERLAP_TOKENS = Number(process.env.INGESTION_OVERLAP_TOKENS || 50)

const CHUNK_CHARS = CHUNK_TOKENS * CHARS_PER_TOKEN
const OVERLAP_CHARS = OVERLAP_TOKENS * CHARS_PER_TOKEN

// Order matters: try paragraph, then line, then sentence, then word, then char.
const SEPARATORS = ['\n\n', '\n', '. ', '! ', '? ', ' ', '']

/**
 * Recursive character splitter. Prefers the highest-level separators first so
 * chunks break on natural boundaries; falls back to hard character splits for
 * pathological input (e.g. a wall of text with no spaces).
 */
function recursiveSplit(text: string, maxChars: number, seps: string[]): string[] {
  if (text.length <= maxChars) return [text]

  const [sep, ...rest] = seps.length ? seps : ['']
  if (sep === '') {
    // Hard split.
    const out: string[] = []
    for (let i = 0; i < text.length; i += maxChars) {
      out.push(text.slice(i, i + maxChars))
    }
    return out
  }

  const parts = text.split(sep)
  const out: string[] = []
  let buf = ''

  for (const part of parts) {
    const piece = buf ? buf + sep + part : part
    if (piece.length <= maxChars) {
      buf = piece
    } else {
      if (buf) out.push(buf)
      if (part.length > maxChars) {
        out.push(...recursiveSplit(part, maxChars, rest))
        buf = ''
      } else {
        buf = part
      }
    }
  }
  if (buf) out.push(buf)
  return out
}

/** Apply overlap by prepending the tail of the previous chunk. */
function applyOverlap(pieces: string[], overlapChars: number): string[] {
  if (overlapChars <= 0 || pieces.length <= 1) return pieces
  const out: string[] = []
  for (let i = 0; i < pieces.length; i++) {
    if (i === 0) {
      out.push(pieces[i])
      continue
    }
    const prev = pieces[i - 1]
    const tail = prev.slice(Math.max(0, prev.length - overlapChars))
    out.push(`${tail}\n${pieces[i]}`)
  }
  return out
}

/**
 * Split a document's sections into ~500-token overlapping chunks.
 * Each chunk remembers the page/section it came from for metadata.
 */
export function chunkSections(sections: Section[]): Chunk[] {
  const chunks: Chunk[] = []
  let index = 0

  for (const section of sections) {
    const headingPrefix = section.heading ? `${section.heading}\n\n` : ''
    const body = `${headingPrefix}${section.text}`.trim()
    if (!body) continue

    const pieces = recursiveSplit(body, CHUNK_CHARS, SEPARATORS).filter(
      (p) => p.trim().length > 0
    )
    const overlapped = applyOverlap(pieces, OVERLAP_CHARS)

    for (const piece of overlapped) {
      const text = piece.trim()
      if (!text) continue
      chunks.push({ index: index++, text, page: section.page })
    }
  }

  return chunks
}
