import { NextResponse } from 'next/server'

import { SESSION_COOKIE_NAME, authenticateUser, createSession } from '@/lib/server/auth'
import { parseJsonBody } from '@/lib/server/request'

function shouldUseSecureCookie(request: Request) {
  return (
    request.headers.get('x-forwarded-proto') === 'https' ||
    request.url.startsWith('https://')
  )
}

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<{ email?: string; password?: string }>(request)
    if (!body.email || !body.password) {
      return NextResponse.json({ message: 'Informe e-mail e senha.' }, { status: 400 })
    }

    const user = await authenticateUser(body.email, body.password)
    if (!user) {
      return NextResponse.json({ message: 'Credenciais invalidas.' }, { status: 401 })
    }

    const session = await createSession(user.id)
    const response = NextResponse.json({ user })
    response.cookies.set(SESSION_COOKIE_NAME, session.token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: shouldUseSecureCookie(request),
      path: '/',
      expires: new Date(session.expiresAt),
    })
    return response
  } catch (error) {
    console.error('[admin-auth-login]', error)

    const message =
      error instanceof Error && error.message === 'ACCOUNT_LOCKED'
        ? 'Conta temporariamente bloqueada por tentativas invalidas. Tente novamente mais tarde.'
        : error instanceof Error && error.message === 'INVALID_JSON'
          ? 'Corpo da requisicao invalido.'
          : 'Nao foi possivel realizar o login.'

    const status =
      error instanceof Error && error.message === 'ACCOUNT_LOCKED'
        ? 423
        : 400

    return NextResponse.json({ message }, { status })
  }
}
