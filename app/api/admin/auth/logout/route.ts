import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { SESSION_COOKIE_NAME, destroySession } from '@/lib/server/auth'

function shouldUseSecureCookie(request: Request) {
  return (
    request.headers.get('x-forwarded-proto') === 'https' ||
    request.url.startsWith('https://')
  )
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (token) {
    await destroySession(token)
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'strict',
    secure: shouldUseSecureCookie(request),
    path: '/',
    expires: new Date(0),
  })
  return response
}
