/**
 * Embedding provider abstraction.
 *
 * Provider precedence (first configured wins):
 *   1. Voyage AI   — API-based, no local model, BEST for legal/regulatory text
 *                    (voyage-law-2 / voyage-3-lite). RECOMMENDED for production.
 *                    Requires VOYAGE_API_KEY. Default dimension: 1024.
 *   2. OpenAI      — API-based. Requires OPENAI_API_KEY.
 *   3. Local model — @xenova/transformers -> Xenova/all-MiniLM-L6-v2 (384 dims).
 *                    Runs offline, but is fragile on serverless platforms.
 *
 * IMPORTANT: every vector stored in a Pinecone index must use the SAME provider,
 * model AND dimension. Changing provider/dimension requires creating a new
 * Pinecone index and re-indexing the whole knowledge base.
 *
 * Voyage `input_type`: embeddings differ for stored documents vs search
 * queries. Pass `{ inputType: 'document' }` when indexing and leave the default
 * (`'query'`) when embedding a user's question. Mixing them up degrades recall.
 */

export type EmbeddingInputType = 'query' | 'document'

/* -------------------------------------------------------------------------- */
/*  Provider configuration                                                     */
/* -------------------------------------------------------------------------- */

// NOTE: env is read lazily (functions, not module-level consts) so that scripts
// which call dotenv.config() AFTER importing this module still pick up values,
// and so that a single long-lived process can react to config changes.
const getVoyageApiKey = () => process.env.VOYAGE_API_KEY
const getVoyageBaseUrl = () => process.env.VOYAGE_BASE_URL || 'https://api.voyageai.com/v1'
// voyage-law-2 / voyage-3 / voyage-3-lite are all 1024-dim.
const getVoyageModel = () => process.env.VOYAGE_MODEL || 'voyage-law-2'
const getVoyageDimension = () => Number(process.env.VOYAGE_DIMENSION || 1024)

const getOpenAIApiKey = () => process.env.OPENAI_API_KEY
const getOpenAIBaseUrl = () => process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
const getOpenAIModel = () => process.env.EMBEDDING_MODEL || 'text-embedding-3-small'
const getOpenAIDimension = () => Number(process.env.OPENAI_EMBEDDING_DIMENSION || 1536)

const getLocalModel = () => process.env.LOCAL_EMBEDDING_MODEL || 'all-MiniLM-L6-v2'
const LOCAL_DIMENSION = 384

export function hasVoyage(): boolean {
  const key = getVoyageApiKey()
  return typeof key === 'string' && key.length > 0
}

function hasOpenAI(): boolean {
  const key = getOpenAIApiKey()
  return typeof key === 'string' && key.length > 0
}

/** Which provider is currently active. */
export type EmbeddingProvider = 'voyage' | 'openai' | 'local'

export function getEmbeddingProvider(): EmbeddingProvider {
  if (hasVoyage()) return 'voyage'
  if (hasOpenAI()) return 'openai'
  return 'local'
}

/** Model name of the active provider (for logging / diagnostics). */
export function getEmbeddingModel(): string {
  switch (getEmbeddingProvider()) {
    case 'voyage':
      return getVoyageModel()
    case 'openai':
      return getOpenAIModel()
    default:
      return getLocalModel()
  }
}

/**
 * Dimension of the vectors produced by the ACTIVE provider. Must match the
 * Pinecone index dimension exactly. An explicit EMBEDDING_DIMENSION env var
 * always wins (so you can override without code changes).
 */
export function getEmbeddingDimension(): number {
  const explicit = process.env.EMBEDDING_DIMENSION
  if (explicit && Number(explicit) > 0) return Number(explicit)
  switch (getEmbeddingProvider()) {
    case 'voyage':
      return getVoyageDimension()
    case 'openai':
      return getOpenAIDimension()
    default:
      return LOCAL_DIMENSION
  }
}

/**
 * Eager snapshot of the active dimension (kept for backwards compatibility with
 * callers that import it as a constant). Env vars are read at module-eval time
 * here, which is correct inside Next.js; scripts should prefer the lazy
 * `getEmbeddingDimension()` and read it after dotenv has loaded.
 */
export const EMBEDDING_DIMENSION = getEmbeddingDimension()

/** Backwards-compatible alias (older code imports EMBEDDING_MODEL). */
export const EMBEDDING_MODEL = getEmbeddingModel()

/* -------------------------------------------------------------------------- */
/*  Local semantic embeddings (fallback only)                                  */
/* -------------------------------------------------------------------------- */

let extractorPromise: Promise<any> | null = null

/**
 * Thrown when an embedding provider cannot be reached/loaded. Unlike a
 * genuinely empty knowledge base, this is an *infrastructure* failure and must
 * NOT be silently converted into a "no results" answer.
 */
export class EmbeddingUnavailableError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'EmbeddingUnavailableError'
  }
}

const LOCAL_MODEL_PATH = process.env.LOCAL_EMBEDDING_MODEL_PATH
const ALLOW_REMOTE_MODELS = process.env.ALLOW_REMOTE_MODELS !== 'false'
const MODEL_LOAD_TIMEOUT_MS = Number(process.env.MODEL_LOAD_TIMEOUT_MS || 30000)

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new EmbeddingUnavailableError(`${label} timed out after ${ms}ms`)),
      ms
    )
    p.then(
      (v) => {
        clearTimeout(t)
        resolve(v)
      },
      (e) => {
        clearTimeout(t)
        reject(e)
      }
    )
  })
}

async function loadExtractor(): Promise<any> {
  const { pipeline, env } = await import('@xenova/transformers')

  env.useBrowserCache = false
  env.allowRemoteModels = ALLOW_REMOTE_MODELS

  if (LOCAL_MODEL_PATH) {
    env.allowRemoteModels = false
    env.allowLocalModels = true
    env.localModelPath = LOCAL_MODEL_PATH.endsWith('/')
      ? LOCAL_MODEL_PATH
      : `${LOCAL_MODEL_PATH}/`
    return pipeline('feature-extraction', `${LOCAL_MODEL_PATH}`)
  }

  env.allowLocalModels = true
  return pipeline('feature-extraction', `Xenova/${getLocalModel()}`)
}

function getLocalExtractor(): Promise<any> {
  if (!extractorPromise) {
    extractorPromise = withTimeout(
      loadExtractor(),
      MODEL_LOAD_TIMEOUT_MS,
      'Local embedding model load'
    ).catch((err) => {
      extractorPromise = null
      throw new EmbeddingUnavailableError(
        `Failed to initialise local embedding model "${getLocalModel()}": ${
          err instanceof Error ? err.message : String(err)
        }`,
        err
      )
    })
  }
  return extractorPromise
}

async function generateLocalEmbeddings(texts: string[]): Promise<number[][]> {
  const extractor = await getLocalExtractor()
  const clean = texts.map((t) => t.replace(/\s+/g, ' ').trim() || ' ')
  const out = await extractor(clean, { pooling: 'mean', normalize: true })
  return out.tolist() as number[][]
}

/* -------------------------------------------------------------------------- */
/*  Voyage AI embeddings                                                       */
/* -------------------------------------------------------------------------- */

const VOYAGE_MAX_RETRIES = Number(process.env.VOYAGE_MAX_RETRIES || 5)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function generateVoyageEmbeddings(
  texts: string[],
  inputType: EmbeddingInputType
): Promise<number[][]> {
  const inputs = texts.map((t) => t.replace(/\n+/g, ' ').trim() || ' ')

  // Voyage free tier is only 3 RPM / 10K TPM. Retry with exponential backoff on
  // 429 (rate limit) and 5xx so a burst of requests doesn't hard-fail retrieval.
  let lastError = ''
  for (let attempt = 0; attempt <= VOYAGE_MAX_RETRIES; attempt++) {
    const response = await fetch(`${getVoyageBaseUrl()}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getVoyageApiKey()}`,
      },
      body: JSON.stringify({
        model: getVoyageModel(),
        input: inputs,
        input_type: inputType,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      const sorted = (data.data || []).sort(
        (a: any, b: any) => (a.index ?? 0) - (b.index ?? 0)
      )
      const vectors = sorted.map((d: any) => d.embedding as number[])

      if (vectors.length !== inputs.length) {
        throw new EmbeddingUnavailableError(
          `Voyage returned ${vectors.length} vectors for ${inputs.length} inputs`
        )
      }
      return vectors
    }

    lastError = `${response.status}: ${await response.text()}`

    const retryable = response.status === 429 || response.status >= 500
    if (!retryable || attempt === VOYAGE_MAX_RETRIES) {
      throw new EmbeddingUnavailableError(
        `Voyage embeddings request failed (${lastError})`
      )
    }

    // Respect Retry-After if provided, else exponential backoff (1s,2s,4s,8s…)
    const retryAfter = Number(response.headers.get('retry-after'))
    const delay = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : Math.min(2 ** attempt * 1000, 20000)
    console.warn(
      `⏳ Voyage rate-limited (${lastError.slice(0, 80)}…). Retry ${attempt + 1}/${VOYAGE_MAX_RETRIES} in ${delay}ms`
    )
    await sleep(delay)
  }

  throw new EmbeddingUnavailableError(`Voyage embeddings failed: ${lastError}`)
}

/* -------------------------------------------------------------------------- */
/*  OpenAI embeddings                                                          */
/* -------------------------------------------------------------------------- */

async function generateOpenAIEmbeddings(texts: string[]): Promise<number[][]> {
  const inputs = texts.map((t) => t.replace(/\n+/g, ' ').trim() || ' ')

  const response = await fetch(`${getOpenAIBaseUrl()}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getOpenAIApiKey()}`,
    },
    body: JSON.stringify({
      model: getOpenAIModel(),
      input: inputs,
      dimensions: getOpenAIDimension(),
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new EmbeddingUnavailableError(`OpenAI embeddings request failed: ${error}`)
  }

  const data = await response.json()
  const sorted = (data.data || []).sort(
    (a: any, b: any) => (a.index ?? 0) - (b.index ?? 0)
  )
  return sorted.map((d: any) => d.embedding as number[])
}

/* -------------------------------------------------------------------------- */
/*  Public API                                                                 */
/* -------------------------------------------------------------------------- */

interface EmbedOptions {
  inputType?: EmbeddingInputType
}

/**
 * Generate a semantic embedding for a single string.
 * Defaults to `inputType: 'query'` (correct for user questions).
 */
export async function generateEmbedding(
  text: string,
  options: EmbedOptions = {}
): Promise<number[]> {
  return (await generateEmbeddings([text], options))[0]
}

/**
 * Batch-embed an array of strings.
 *
 * For indexing/storing documents pass `{ inputType: 'document' }` (Voyage
 * distinguishes document vs query embeddings for better retrieval).
 */
export async function generateEmbeddings(
  texts: string[],
  options: EmbedOptions = {}
): Promise<number[][]> {
  if (texts.length === 0) return []

  const inputType: EmbeddingInputType = options.inputType || 'query'

  switch (getEmbeddingProvider()) {
    case 'voyage':
      return generateVoyageEmbeddings(texts, inputType)
    case 'openai':
      return generateOpenAIEmbeddings(texts)
    default:
      return generateLocalEmbeddings(texts)
  }
}

/**
 * Whether real (semantic) embeddings are enabled. True for every provider
 * (Voyage/OpenAI via API, or the local model).
 */
export function isSemanticEmbeddingEnabled(): boolean {
  return true
}

/** Human-readable summary of the active embedding configuration. */
export function getEmbeddingInfo() {
  return {
    provider: getEmbeddingProvider(),
    model: getEmbeddingModel(),
    dimension: EMBEDDING_DIMENSION,
  }
}
