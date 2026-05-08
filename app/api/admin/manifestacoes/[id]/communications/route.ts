import { NextResponse } from 'next/server'

import { hasAnyAdminCapability } from '@/lib/admin-access'
import { requireAuthenticatedUser } from '@/lib/server/auth'
import { addCommunication } from '@/lib/server/manifestations'
import { parseJsonBody } from '@/lib/server/request'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser()
    if (!hasAnyAdminCapability(user.perfil, ['manifestacoes', 'denuncias'], user.capabilities)) {
      return NextResponse.json({ message: 'Acesso negado.' }, { status: 403 })
    }

    const { id } = await context.params
    const body = await parseJsonBody<{
      tipo?: 'inicial' | 'intermediaria' | 'conclusiva' | 'esclarecimento'
      assunto?: string
      corpo?: string
    }>(request)
    const manifestation = await addCommunication(
      id,
      {
        tipo: body.tipo || 'intermediaria',
        assunto: body.assunto || '',
        corpo: body.corpo || '',
      },
      user,
    )
    return NextResponse.json({ manifestation })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message === 'FORBIDDEN'
          ? 'Acesso negado.'
          : error.message === 'UNAUTHORIZED'
            ? 'Nao autenticado.'
            : error.message === 'INVALID_JSON'
              ? 'Corpo da requisicao invalido.'
            : error.message
        : 'Nao foi possivel enviar a comunicacao.'
    const status =
      error instanceof Error
        ? error.message === 'UNAUTHORIZED'
          ? 401
          : error.message === 'FORBIDDEN'
            ? 403
            : error.message === 'INVALID_JSON'
              ? 400
            : 400
        : 400
    return NextResponse.json({ message }, { status })
  }
}
