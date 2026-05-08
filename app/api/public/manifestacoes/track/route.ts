import { NextResponse } from 'next/server'

import { buildPublicTracking } from '@/lib/server/manifestations'
import { parseJsonBody } from '@/lib/server/request'

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<{ protocolo?: string; email?: string }>(request)

    if (!body.protocolo) {
      return NextResponse.json({ message: 'Informe o numero do protocolo.' }, { status: 400 })
    }

    const tracking = await buildPublicTracking(body.protocolo, body.email)
    if (!tracking) {
      return NextResponse.json(
        { message: 'Manifestacao nao encontrada. Verifique o protocolo e tente novamente.' },
        { status: 404 },
      )
    }

    return NextResponse.json(tracking)
  } catch (error) {
    const message =
      error instanceof Error && error.message === 'INVALID_JSON'
        ? 'Corpo da requisicao invalido.'
        : 'Nao foi possivel consultar o protocolo.'

    return NextResponse.json({ message }, { status: 400 })
  }
}
