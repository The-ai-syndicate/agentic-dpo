/**
 * Embedding provider abstraction.
 *
 * Default (no API key required): a LOCAL semantic model
 *   @xenova/transformers -> Xenova/all-MiniLM-L6-v2  (384 dims)
 * It runs entirely offline/in-process, is fast, and produces TRUE semantic
 * embeddings (meaning-based similarity), unlike the old hash fallback.
 *
 * Optional override: if OPENAI_API_KEY is set, we use OpenAI embeddings instead
 * (dimension controlled by EMBEDDING_DIMENSION).
 *
 * IMPORTANT: every vector stored in a Pinecone index must use the SAME model
 * and dimension. Changing the provider/dimension requires re-indexing.
 */

export const EMBEDDING_MODEL =
  process.env.EMBEDDING_MODEL || 'all-MiniLM-L6-v2'

/** Dimension of the vectors. Must match the Pinecone index dimension. */
export const EMBEDDING_DIMENSION = Number(process.env.EMBEDDING_DIMENSION || 384)

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'

function hasOpenAI(): boolean {
  return typeof OPENAI_API_KEY === 'string' && OPENAI_API_KEY.length > 0
}

/* -------------------------------------------------------------------------- */
/*  Local semantic embeddings (default)                                        */
/* -------------------------------------------------------------------------- */

let extractorPromise: Promise<any> | null = null

async function getLocalExtractor(): Promise<any> {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline, env } = await import('@xenova/transformers')
      // Allow the model to download once, then cache locally.
      env.allowLocalModels = true
      env.useBrowserCache = false
      return pipeline('feature-extraction', `Xenova/${EMBEDDING_MODEL}`)
    })()
  }
  return extractorPromise
}

async function generateLocalEmbeddings(texts: string[]): Promise<number[][]> {
  const extractor = await getLocalExtractor()
  const clean = texts.map((t) => t.replace(/\s+/g, ' ').trim() || ' ')
  const out = await extractor(clean, { pooling: 'mean', normalize: true })
  // out.dims => [n, dim]; tolist() => number[][]
  return out.tolist() as number[][]
}

/* -------------------------------------------------------------------------- */
/*  Public API                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Generate a semantic embedding for a single string.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  return (await generateEmbeddings([text]))[0]
}

/**
 * Batch-embed an array of strings.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  if (hasOpenAI()) {
    const inputs = texts.map((t) => t.replace(/\n+/g, ' ').trim() || ' ')
    const response = await fetch(`${OPENAI_BASE_URL}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: inputs,
        dimensions: EMBEDDING_DIMENSION,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI embeddings request failed: ${error}`)
    }

    const data = await response.json()
    const sorted = (data.data || []).sort(
      (a: any, b: any) => (a.index ?? 0) - (b.index ?? 0)
    )
    return sorted.map((d: any) => d.embedding as number[])
  }

  return generateLocalEmbeddings(texts)
}

/**
 * Whether real (semantic) embeddings are enabled. With the local model this is
 * always true — no external key required.
 */
export function isSemanticEmbeddingEnabled(): boolean {
  return true
}
