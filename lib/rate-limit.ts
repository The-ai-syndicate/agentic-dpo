const WINDOW_MS = 60 * 1000
const MAX_REQUESTS_PER_WINDOW = 60

interface RateLimitEntry {
  timestamps: number[]
}

class InMemoryRateLimiter {
  private store: Map<string, RateLimitEntry> = new Map()

  private cleanup(key: string, now: number) {
    const entry = this.store.get(key)
    if (!entry) return
    entry.timestamps = entry.timestamps.filter(t => now - t < WINDOW_MS)
    if (entry.timestamps.length === 0) {
      this.store.delete(key)
    }
  }

  check(key: string, maxRequests: number = MAX_REQUESTS_PER_WINDOW): {
    allowed: boolean
    remaining: number
    resetTime: number
    limit: number
  } {
    const now = Date.now()
    this.cleanup(key, now)

    const entry = this.store.get(key) || { timestamps: [] }
    const requestCount = entry.timestamps.length

    if (requestCount >= maxRequests) {
      const oldestInWindow = entry.timestamps[0]
      return {
        allowed: false,
        remaining: 0,
        resetTime: oldestInWindow + WINDOW_MS,
        limit: maxRequests,
      }
    }

    entry.timestamps.push(now)
    this.store.set(key, entry)

    return {
      allowed: true,
      remaining: maxRequests - entry.timestamps.length,
      resetTime: now + WINDOW_MS,
      limit: maxRequests,
    }
  }
}

export const rateLimiter = new InMemoryRateLimiter()

export interface RateLimitConfig {
  maxRequests: number
  windowMs?: number
}

export const RATE_LIMIT_CONFIGS = {
  chat: { maxRequests: 30, windowMs: 60 * 1000 },
  upload: { maxRequests: 10, windowMs: 60 * 1000 },
  history: { maxRequests: 60, windowMs: 60 * 1000 },
  setup: { maxRequests: 5, windowMs: 60 * 1000 },
  admin: { maxRequests: 30, windowMs: 60 * 1000 },
  default: { maxRequests: 60, windowMs: 60 * 1000 },
}

export function getClientIP(request: Request): string {
  const xForwardedFor = request.headers.get('x-forwarded-for')
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim()
  }
  const xRealIP = request.headers.get('x-real-ip')
  if (xRealIP) return xRealIP.trim()
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  if (cfConnectingIP) return cfConnectingIP.trim()
  return 'unknown-ip'
}

export function applyRateLimit(
  request: Request,
  config: RateLimitConfig = RATE_LIMIT_CONFIGS.default
): { allowed: boolean; remaining: number; resetTime: number; limit: number } {
  const ip = getClientIP(request)
  const routeKey = new URL(request.url).pathname
  const key = `${ip}:${routeKey}`
  return rateLimiter.check(key, config.maxRequests)
}

export class ConcurrentRequestLimiter {
  private active: Map<string, number> = new Map()
  private maxConcurrent: number

  constructor(maxConcurrent: number = 5) {
    this.maxConcurrent = maxConcurrent
  }

  tryAcquire(key: string): boolean {
    const count = this.active.get(key) || 0
    if (count >= this.maxConcurrent) return false
    this.active.set(key, count + 1)
    return true
  }

  release(key: string) {
    const count = this.active.get(key) || 0
    if (count <= 1) {
      this.active.delete(key)
    } else {
      this.active.set(key, count - 1)
    }
  }
}

export const chatConcurrentLimiter = new ConcurrentRequestLimiter(3)
export const uploadConcurrentLimiter = new ConcurrentRequestLimiter(2)
