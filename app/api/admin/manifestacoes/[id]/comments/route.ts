import { NextResponse } from 'next/server'

import { hasAnyAdminCapability } from '@/lib/admin-access'
import { addComment } from '@/lib/server/manifestations'
import { requireAuthenticatedUser } from '@/lib/server/auth'
import { parseJsonBody } from '@/lib/server/request'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser()
    if (!hasAnyAdminCapability(user.perfil, ['manifestacoes', 'denuncias', 'areas_tecnicas'], user.capabilities)) {
      return NextResponse.json({ message: 'Acesso negado.' }, { status: 403 })
    }
    const { id } = await context.params
    const body = await parseJsonBody<{ comentario?: string }>(request)
    const manifestation = await addComment(id, body.comentario || '', user)
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
        : 'Nao foi possivel adicionar o comentario.'
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
