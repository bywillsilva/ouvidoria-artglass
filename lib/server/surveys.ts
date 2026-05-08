import { randomUUID } from 'crypto'

import { filterSurveysForUser } from '@/lib/admin-access'
import { readDb, updateDb } from '@/lib/server/store'
import type { AuthenticatedUserView, SatisfactionSurveyRecord } from '@/lib/server/schema'

function normalizeProtocol(protocolo: string) {
  return protocolo.trim().toUpperCase()
}

export async function getSurveyContextByProtocol(protocolo: string) {
  const database = await readDb()
  const normalized = normalizeProtocol(protocolo)
  const manifestation = database.manifestacoes.find(
    (item) => item.protocolo.toUpperCase() === normalized,
  )

  if (!manifestation) {
    return null
  }

  const existingSurvey = database.pesquisas.find(
    (survey) => survey.manifestacaoId === manifestation.id,
  )

  return {
    manifestation,
    existingSurvey,
  }
}

export async function submitSurveyByProtocol(
  protocolo: string,
  payload: {
    notaGeral: number
    clareza: number
    tempoResposta: number
    respeito: number
    demandaCompreendida: 'sim' | 'parcialmente' | 'nao'
    desejaReabrir: boolean
    comentario?: string
  },
) {
  const normalized = normalizeProtocol(protocolo)

  if (
    [payload.notaGeral, payload.clareza, payload.tempoResposta, payload.respeito].some(
      (score) => Number.isNaN(score) || score < 1 || score > 5,
    )
  ) {
    throw new Error('As notas da pesquisa devem estar entre 1 e 5.')
  }

  return updateDb((database) => {
    const manifestation = database.manifestacoes.find(
      (item) => item.protocolo.toUpperCase() === normalized,
    )

    if (!manifestation) {
      throw new Error('Protocolo nao encontrado.')
    }

    if (!manifestation.concluidoEm) {
      throw new Error('A pesquisa so pode ser respondida apos a conclusao da manifestacao.')
    }

    const existing = database.pesquisas.find((survey) => survey.manifestacaoId === manifestation.id)
    if (existing) {
      throw new Error('A pesquisa de satisfacao deste protocolo ja foi respondida.')
    }

    const survey: SatisfactionSurveyRecord = {
      id: randomUUID(),
      manifestacaoId: manifestation.id,
      notaGeral: payload.notaGeral,
      clareza: payload.clareza,
      tempoResposta: payload.tempoResposta,
      respeito: payload.respeito,
      demandaCompreendida: payload.demandaCompreendida,
      desejaReabrir: payload.desejaReabrir,
      comentario: payload.comentario?.trim() || undefined,
      criadoEm: new Date().toISOString(),
    }

    database.pesquisas.unshift(survey)
    manifestation.timeline.unshift({
      id: randomUUID(),
      data: survey.criadoEm,
      usuario: 'Manifestante',
      acao: 'Pesquisa de satisfacao respondida',
      descricao:
        payload.desejaReabrir || payload.notaGeral <= 2
          ? 'Pesquisa respondida com alerta de reabertura ou baixa satisfacao.'
          : 'Pesquisa de satisfacao registrada com sucesso.',
      visibilidade: 'interna',
    })
    manifestation.atualizadoEm = survey.criadoEm

    return survey
  })
}

export async function listSatisfactionSurveys(user?: AuthenticatedUserView) {
  const database = await readDb()
  const surveys = filterSurveysForUser(database.pesquisas, database, user)

  return surveys
    .map((survey) => {
      const manifestation = database.manifestacoes.find(
        (item) => item.id === survey.manifestacaoId,
      )

      return {
        ...survey,
        protocolo: manifestation?.protocolo ?? 'N/D',
        natureza: manifestation?.natureza ?? 'consulta',
        titulo: manifestation?.titulo ?? 'Manifestacao sem titulo',
      }
    })
    .sort((left, right) => new Date(right.criadoEm).getTime() - new Date(left.criadoEm).getTime())
}
