import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { SESSION_COOKIE_NAME } from '@/lib/auth-constants'

function isProtectedAdminPage(pathname: string) {
  return pathname.startsWith('/admin') && pathname !== '/admin/login'
}

function isProtectedAdminApi(pathname: string) {
  return pathname.startsWith('/api/admin') && !pathname.startsWith('/api/admin/auth')
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value)

  if (!hasSessionCookie && isProtectedAdminPage(pathname)) {
    const loginUrl = new URL('/admin/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  if (!hasSessionCookie && isProtectedAdminApi(pathname)) {
    return NextResponse.json({ message: 'Nao autenticado.' }, { status: 401 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
