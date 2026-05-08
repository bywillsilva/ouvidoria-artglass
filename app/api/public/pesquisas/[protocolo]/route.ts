import { NextResponse } from 'next/server'

import { parseJsonBody } from '@/lib/server/request'
import { getSurveyContextByProtocol, submitSurveyByProtocol } from '@/lib/server/surveys'

export async function GET(_: Request, context: { params: Promise<{ protocolo: string }> }) {
  try {
    const { protocolo } = await context.params
    const result = await getSurveyContextByProtocol(protocolo)

    if (!result) {
      return NextResponse.json({ message: 'Protocolo nao encontrado.' }, { status: 404 })
    }

    return NextResponse.json({
      manifestation: {
        protocolo: result.manifestation.protocolo,
        natureza: result.manifestation.natureza,
        titulo: result.manifestation.titulo,
        concluidoEm: result.manifestation.concluidoEm,
      },
      jaRespondida: Boolean(result.existingSurvey),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nao foi possivel carregar a pesquisa.'
    return NextResponse.json({ message }, { status: 400 })
  }
}

export async function POST(request: Request, context: { params: Promise<{ protocolo: string }> }) {
  try {
    const { protocolo } = await context.params
    const body = await parseJsonBody<{
      notaGeral?: number
      clareza?: number
      tempoResposta?: number
      respeito?: number
      demandaCompreendida?: 'sim' | 'parcialmente' | 'nao'
      desejaReabrir?: boolean
      comentario?: string
    }>(request)

    if (!body.demandaCompreendida) {
      return NextResponse.json(
        { message: 'Informe se a demanda foi compreendida.' },
        { status: 400 },
      )
    }

    const survey = await submitSurveyByProtocol(protocolo, {
      notaGeral: Number(body.notaGeral),
      clareza: Number(body.clareza),
      tempoResposta: Number(body.tempoResposta),
      respeito: Number(body.respeito),
      demandaCompreendida: body.demandaCompreendida,
      desejaReabrir: Boolean(body.desejaReabrir),
      comentario: typeof body.comentario === 'string' ? body.comentario : undefined,
    })

    return NextResponse.json({ survey })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nao foi possivel registrar a pesquisa.'
    return NextResponse.json({ message }, { status: 400 })
  }
}
