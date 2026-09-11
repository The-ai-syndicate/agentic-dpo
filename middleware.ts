import { NextRequest, NextResponse } from 'next/server'
import {
  rateLimiter,
  getClientIP,
  RATE_LIMIT_CONFIGS,
  RateLimitConfig,
} from '@/lib/rate-limit'

const ADMIN_TOKEN = process.env.ADMIN_API_TOKEN || ''

function getRateLimitConfig(pathname: string): RateLimitConfig {
  if (pathname.startsWith('/api/chat')) return RATE_LIMIT_CONFIGS.chat
  if (pathname.startsWith('/api/upload')) return RATE_LIMIT_CONFIGS.upload
  if (pathname.startsWith('/api/history')) return RATE_LIMIT_CONFIGS.history
  if (pathname.startsWith('/api/setup')) return RATE_LIMIT_CONFIGS.setup
  if (pathname.startsWith('/api/admin')) return RATE_LIMIT_CONFIGS.admin
  return RATE_LIMIT_CONFIGS.default
}

function addRateLimitHeaders(
  response: NextResponse,
  result: { remaining: number; resetTime: number; limit: number }
) {
  const now = Date.now()
  const retryAfter = Math.max(0, Math.ceil((result.resetTime - now) / 1000))
  response.headers.set('X-RateLimit-Limit', String(result.limit))
  response.headers.set('X-RateLimit-Remaining', String(result.remaining))
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetTime / 1000)))
  if (retryAfter > 0) {
    response.headers.set('Retry-After', String(retryAfter))
  }
  return response
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/admin/')) {
    const providedToken =
      request.headers.get('x-admin-token') ||
      request.nextUrl.searchParams.get('admin_token')

    if (!ADMIN_TOKEN) {
      console.warn('⚠️ ADMIN_API_TOKEN not set - admin endpoints are unprotected!')
    } else if (providedToken !== ADMIN_TOKEN) {
      const res = NextResponse.json(
        { error: 'Unauthorized', message: 'Admin access required' },
        { status: 401 }
      )
      return res
    }
  }

  const ip = getClientIP(request)
  const config = getRateLimitConfig(pathname)
  const key = `${ip}:${pathname}`
  const result = rateLimiter.check(key, config.maxRequests)

  if (pathname === '/api/upload') {
    const contentLength = request.headers.get('content-length')
    if (contentLength) {
      const sizeMb = parseInt(contentLength, 10) / (1024 * 1024)
      if (sizeMb > 25) {
        const res = NextResponse.json(
          { error: 'Payload Too Large', message: 'File size must be under 25MB' },
          { status: 413 }
        )
        return addRateLimitHeaders(res, result)
      }
    }
  }

  if (pathname === '/api/chat' || pathname === '/api/upload') {
    const userAgent = request.headers.get('user-agent') || ''
    const suspiciousUAs = [
      'curl', 'wget', 'python-requests', 'python-urllib', 'httplib',
      'scrapy', 'bot', 'spider', 'crawler', 'go-http-client', 'java/',
    ]
    const hasOrigin = !!request.headers.get('origin') || !!request.headers.get('referer')
    if (!hasOrigin && suspiciousUAs.some(ua => userAgent.toLowerCase().includes(ua.toLowerCase()))) {
      console.warn(`⚠️ Suspicious request blocked: ${ip} UA=${userAgent}`)
    }
  }

  if (!result.allowed) {
    console.warn(`🚫 Rate limit exceeded: ${ip} on ${pathname}`)
    const res = NextResponse.json(
      {
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${Math.max(1, Math.ceil((result.resetTime - Date.now()) / 1000))} seconds.`,
      },
      { status: 429 }
    )
    return addRateLimitHeaders(res, result)
  }

  const response = NextResponse.next()
  return addRateLimitHeaders(response, result)
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
}
