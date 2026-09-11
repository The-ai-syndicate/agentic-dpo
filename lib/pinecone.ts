import { generateSimpleEmbedding } from './embeddings'

const PINECONE_API_KEY = process.env.PINECONE_API_KEY
const PINECONE_INDEX = process.env.PINECONE_INDEX || 'knowledge-base'

let cachedHost: string | null = null

/**
 * Get the host URL for the Pinecone index
 */
async function getIndexHost() {
  if (cachedHost) return cachedHost

  const response = await fetch(`https://api.pinecone.io/indexes/${PINECONE_INDEX}`, {
    headers: {
      'Api-Key': PINECONE_API_KEY!,
      'Accept': 'application/json'
    }
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Pinecone index "${PINECONE_INDEX}" not found. Please wait for initialization or create it in the dashboard.`)
    }
    const error = await response.text()
    throw new Error(`Failed to get Pinecone index info: ${error}`)
  }

  const data = await response.json()

  if (!data.host) {
    throw new Error(`Pinecone index "${PINECONE_INDEX}" is still initializing. Please try again in a minute.`)
  }

  cachedHost = data.host
  return cachedHost
}

/**
 * Simple text chunking function to stay within Pinecone metadata limits (40KB)
 * and improve retrieval relevance.
 */
function chunkText(text: string, maxLength: number = 30000): string[] {
  const chunks: string[] = []
  let currentPos = 0

  while (currentPos < text.length) {
    let endPos = currentPos + maxLength

    if (endPos < text.length) {
      // Try to find a good breaking point (newline or space)
      const lastNewline = text.lastIndexOf('\n', endPos)
      if (lastNewline > currentPos + maxLength / 2) {
        endPos = lastNewline
      } else {
        const lastSpace = text.lastIndexOf(' ', endPos)
        if (lastSpace > currentPos + maxLength / 2) {
          endPos = lastSpace
        }
      }
    }

    chunks.push(text.substring(currentPos, endPos).trim())
    currentPos = endPos
  }

  return chunks.filter(c => c.length > 0)
}

export async function upsertToPinecone(doc: {
  id: string
  title: string
  text: string
  source?: string
  category?: string
  fileType?: string
  wordCount?: number
  extractionMethod?: string
}) {
  const host = await getIndexHost()

  // Break the text into chunks to avoid the 40KB metadata limit
  const chunks = chunkText(doc.text)
  console.log(`upsertToPinecone: Splitting document into ${chunks.length} chunks.`)

  const vectors = chunks.map((chunk, i) => {
    const embedding = generateSimpleEmbedding(chunk)
    return {
      id: chunks.length === 1 ? doc.id : `${doc.id}#chunk-${i}`,
      values: embedding,
      metadata: {
        title: doc.title,
        text: chunk,
        source: doc.source || 'manual-upload',
        category: doc.category || 'general',
        fileType: doc.fileType || 'text',
        wordCount: doc.wordCount || 0,
        extractionMethod: doc.extractionMethod || 'direct-input',
        timestamp: new Date().toISOString(),
        chunkIndex: i,
        totalChunks: chunks.length
      }
    }
  })

  // Upsert in batches if there are many chunks (Pinecone recommends batches < 100)
  const batchSize = 50
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize)
    const response = await fetch(`https://${host}/vectors/upsert`, {
      method: 'POST',
      headers: {
        'Api-Key': PINECONE_API_KEY!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ vectors: batch })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Pinecone upsert failed (batch ${i/batchSize}): ${error}`)
    }
  }

  return { success: true, chunksProcessed: chunks.length }
}

export async function searchPinecone(query: string, limit: number = 5) {
  try {
    const host = await getIndexHost()
    const vector = generateSimpleEmbedding(query)

    const response = await fetch(`https://${host}/query`, {
      method: 'POST',
      headers: {
        'Api-Key': PINECONE_API_KEY!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        vector: vector,
        topK: limit,
        includeMetadata: true
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`Pinecone search failed: ${error}`)
      return []
    }

    const data = await response.json()
    // Map Pinecone response format to match what the chat API expects
    return (data.matches || []).map((match: any) => ({
      id: match.id,
      score: match.score,
      payload: match.metadata // Pinecone uses 'metadata' instead of 'payload'
    }))
  } catch (error) {
    console.error('Pinecone search error:', error)
    return []
  }
}

/**
 * Grounded context built from Pinecone search results.
 *
 * `context` is the combined text of the matched chunks. `sources`, `bestScore`
 * and `matchCount` let callers decide whether the knowledge base actually
 * contains a relevant answer (e.g. refuse when there are zero matches).
 */
export interface GroundedContext {
  context: string
  sources: string[]
  bestScore: number
  matchCount: number
  raw: any[]
}

export async function getGroundedContext(
  query: string,
  limit: number = 5
): Promise<GroundedContext> {
  const results = await searchPinecone(query, limit)

  const usable = (results || []).filter(
    (r: any) =>
      r &&
      r.payload &&
      typeof r.payload.text === 'string' &&
      r.payload.text.trim().length > 0
  )

  const bestScore = usable.reduce(
    (max: number, r: any) =>
      typeof r.score === 'number' && r.score > max ? r.score : max,
    -Infinity
  )

  const sources = Array.from(
    new Set(
      usable
        .map((r: any) => r.payload?.title)
        .filter((t: any) => typeof t === 'string' && t.length > 0)
    )
  ) as string[]

  const context = usable
    .map((r: any) => {
      const title = r.payload?.title ? `Source: ${r.payload.title}\n` : ''
      return `${title}${r.payload.text}`
    })
    .join('\n\n---\n\n')

  return {
    context,
    sources,
    bestScore: Number.isFinite(bestScore) ? bestScore : 0,
    matchCount: usable.length,
    raw: usable,
  }
}
