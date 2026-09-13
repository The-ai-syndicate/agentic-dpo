import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

/**
 * Anonymous, stable per-browser identity.
 *
 * The app has NO account system (middleware.ts only does IP rate limiting), so
 * we scope document idempotency ("same SHA-256 → same doc") to a device cookie.
 * An httpOnly cookie is set on first use and reused thereafter.
 *
 * If you later add real auth, replace this with the authenticated user id —
 * every caller already receives a plain string `userId`.
 */
export const USER_COOKIE = 'adpo_uid'

export function getUserIdFromRequest(request: NextRequest): {
  userId: string
  isNew: boolean
} {
  const existing = request.cookies.get(USER_COOKIE)?.value
  if (existing && existing.length >= 8 && existing.length <= 100) {
    return { userId: existing, isNew: false }
  }
  return { userId: `anon_${randomUUID()}`, isNew: true }
}

/** Attach the identity cookie to an outgoing response when newly minted. */
export function attachUserCookie(
  response: NextResponse,
  userId: string,
  isNew: boolean
): NextResponse {
  if (isNew) {
    response.cookies.set(USER_COOKIE, userId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    })
  }
  return response
}
