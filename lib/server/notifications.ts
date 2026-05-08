import {
  filterManifestationsForUser,
  filterSurveysForUser,
  getOperationalQueuePath,
  hasAdminCapability,
} from '@/lib/admin-access'
import { diffInDays } from '@/lib/server/date'
import { readDb } from '@/lib/server/store'
import type { AuthenticatedUserView } from '@/lib/server/schema'

function relativeLabel(isoDate: string) {
  const days = diffInDays(isoDate, new Date().toISOString())

  if (days <= 0) {
    return 'Hoje'
  }

  if (days === 1) {
    return 'Ontem'
  }

  return `${days} dias`
}

export async function buildNotifications(user?: AuthenticatedUserView) {
  const database = await readDb()
  const manifestations = filterManifestationsForUser(database.manifestacoes, user)
  const surveys = filterSurveysForUser(database.pesquisas, database, user)
  const queuePath = user
    ? getOperationalQueuePath(user.perfil, undefined, user.capabilities)
    : '/admin/manifestacoes'
  const notifications: Array<{
    id: string
    title: string
    description: string
    time: string
    link: string
    severity: 'info' | 'warning' | 'critical'
  }> = []

  const pendingPertinence = manifestations.filter(
    (item) => item.natureza === 'denuncia' && item.status === 'em_analise_pertinencia',
  )
  if (pendingPertinence.length > 0) {
    notifications.push({
      id: 'notif-pertinencia',
      title: `${pendingPertinence.length} denuncias aguardando analise`,
      description: 'Casos recebidos pela Ouvidoria aguardando decisao de pertinencia.',
      time: relativeLabel(pendingPertinence[0].atualizadoEm),
      link: user
        ? getOperationalQueuePath(user.perfil, 'denuncia', user.capabilities)
        : '/admin/denuncias',
      severity: 'warning',
    })
  }

  const overdue = manifestations.filter(
    (item) =>
      !item.concluidoEm && new Date(item.prazoRespostaFinal).getTime() < Date.now(),
  )
  if (overdue.length > 0) {
    notifications.push({
      id: 'notif-atraso',
      title: `${overdue.length} manifestacoes em atraso`,
      description: 'Existem casos fora do prazo final de resposta.',
      time: relativeLabel(overdue[0].atualizadoEm),
      link: `${queuePath}?atrasadas=true`,
      severity: 'critical',
    })
  }

  const dueSoon = manifestations.filter((item) => {
    if (item.concluidoEm) {
      return false
    }

    const remainingMs = new Date(item.prazoRespostaFinal).getTime() - Date.now()
    const remainingDays = remainingMs / (1000 * 60 * 60 * 24)
    return remainingDays >= 0 && remainingDays <= 3
  })
  if (dueSoon.length > 0) {
    notifications.push({
      id: 'notif-prazo',
      title: `${dueSoon.length} manifestacoes com prazo proximo`,
      description: 'Acompanhe os atendimentos que vencem nos proximos dias.',
      time: relativeLabel(dueSoon[0].atualizadoEm),
      link: queuePath,
      severity: 'info',
    })
  }

  const lowRatingSurveys = surveys.filter(
    (survey) => survey.desejaReabrir || survey.notaGeral <= 2,
  )
  if (
    lowRatingSurveys.length > 0 &&
    (!user || hasAdminCapability(user.perfil, 'pesquisas', user.capabilities))
  ) {
    notifications.push({
      id: 'notif-satisfacao',
      title: `${lowRatingSurveys.length} pesquisas exigem atencao`,
      description: 'Ha pedidos de reabertura ou baixa satisfacao registrados pelos manifestantes.',
      time: relativeLabel(lowRatingSurveys[0].criadoEm),
      link: '/admin/pesquisas-satisfacao',
      severity: 'warning',
    })
  }

  return notifications
}
