import {
  filterManifestationsForUser,
  filterSurveysForUser,
  getManifestationDetailPath,
  getOperationalQueuePath,
  hasAnyAdminCapability,
} from '@/lib/admin-access'
import { ASSUNTO_LABELS, NATUREZA_LABELS, STATUS_PUBLICO_LABELS } from '@/lib/constants'
import { monthKey, diffInHours } from '@/lib/server/date'
import { getManifestationSummary } from '@/lib/server/manifestations'
import { getSlaSnapshotForIndicator } from '@/lib/server/policy'
import { readDb } from '@/lib/server/store'
import type { AuthenticatedUserView } from '@/lib/server/schema'

function monthLabel(month: number) {
  return ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][
    month
  ]
}

export async function buildDashboardData(user?: AuthenticatedUserView) {
  const database = await readDb()
  const aggregateOnly = user?.perfil === 'visualizador'
  const manifestations = aggregateOnly
    ? database.manifestacoes
    : filterManifestationsForUser(database.manifestacoes, user)
  const surveys = aggregateOnly
    ? database.pesquisas
    : filterSurveysForUser(database.pesquisas, database, user)
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const canOpenOperationalQueue =
    !user ||
    hasAnyAdminCapability(
      user.perfil,
      ['manifestacoes', 'denuncias', 'areas_tecnicas'],
      user.capabilities,
    )
  const operationalQueuePath = user
    ? getOperationalQueuePath(user.perfil, undefined, user.capabilities)
    : '/admin/manifestacoes'

  const thisMonth = manifestations.filter((manifestation) => {
    const createdAt = new Date(manifestation.criadoEm)
    return createdAt.getMonth() === currentMonth && createdAt.getFullYear() === currentYear
  })

  const openItems = manifestations.filter(
    (manifestation) => !manifestation.concluidoEm && manifestation.status !== 'arquivada',
  )
  const delayedItems = manifestations.filter(
    (manifestation) =>
      !manifestation.concluidoEm &&
      new Date(manifestation.prazoRespostaFinal).getTime() < Date.now(),
  )
  const committeeItems = manifestations.filter(
    (manifestation) =>
      manifestation.natureza === 'denuncia' &&
      ['em_analise_comite', 'plano_trabalho_definicao', 'em_investigacao'].includes(
        manifestation.status,
      ),
  )
  const pendingPertinence = manifestations.filter(
    (manifestation) =>
      manifestation.natureza === 'denuncia' && manifestation.status === 'em_analise_pertinencia',
  )
  const criticalItems = manifestations.filter(
    (manifestation) => manifestation.riscoImediato === 'sim' && !manifestation.concluidoEm,
  )
  const recurringComplaints = Object.values(
    manifestations.reduce<Record<string, number>>((accumulator, manifestation) => {
      if (manifestation.natureza === 'reclamacao') {
        accumulator[manifestation.assunto] = (accumulator[manifestation.assunto] ?? 0) + 1
      }
      return accumulator
    }, {}),
  ).filter((count) => count > 1).length
  const averageResponseHours =
    manifestations.filter((manifestation) => manifestation.dataRespostaInicial).length > 0
      ? manifestations
          .filter((manifestation) => manifestation.dataRespostaInicial)
          .reduce(
            (sum, manifestation) =>
              sum + diffInHours(manifestation.criadoEm, manifestation.dataRespostaInicial as string),
            0,
          ) /
        manifestations.filter((manifestation) => manifestation.dataRespostaInicial).length
      : 0

  const surveyAverage =
    surveys.length > 0
      ? surveys.reduce((sum, survey) => sum + survey.notaGeral, 0) /
        surveys.length
      : 0

  const volumeMensal = Object.entries(
    manifestations.reduce<Record<string, { monthKey: string; month: string; total: number; concluidas: number }>>(
      (accumulator, manifestation) => {
        const key = monthKey(manifestation.criadoEm)
        if (!accumulator[key]) {
          const date = new Date(manifestation.criadoEm)
          accumulator[key] = {
            monthKey: key,
            month: monthLabel(date.getMonth()),
            total: 0,
            concluidas: 0,
          }
        }

        accumulator[key].total += 1
        if (manifestation.concluidoEm) {
          accumulator[key].concluidas += 1
        }

        return accumulator
      },
      {},
    ),
  )
    .map(([, value]) => value)
    .sort((left, right) => left.monthKey.localeCompare(right.monthKey))

  return {
    alertsData: [
      pendingPertinence.length > 0
        ? {
            type: 'warning',
            title: `${pendingPertinence.length} denuncias aguardando analise de pertinencia`,
            action: 'Ver denuncias',
            href: '/admin/denuncias',
          }
        : null,
      openItems.length > 0
        ? {
            type: 'alert',
            title: `${openItems.length} manifestacoes em acompanhamento`,
            action: 'Abrir fila',
            href: operationalQueuePath,
          }
        : null,
      delayedItems.length > 0
        ? {
            type: 'danger',
            title: `${delayedItems.length} casos com prazo vencido`,
            action: 'Priorizar tratativa',
            href: `${operationalQueuePath}?atrasadas=true`,
          }
        : null,
      criticalItems.length > 0
        ? {
            type: 'critical',
            title: `${criticalItems.length} casos criticos com risco imediato`,
            action: 'Ver casos',
            href: operationalQueuePath,
          }
        : null,
    ].filter(Boolean),
    statsCards: [
      { title: 'Manifestacoes no mes', value: String(thisMonth.length) },
      { title: 'Acumulado no ano', value: String(manifestations.length) },
      { title: 'Manifestações abertas', value: String(openItems.length) },
      { title: 'Manifestações em atraso', value: String(delayedItems.length) },
      { title: 'Denuncias em apuracao', value: String(committeeItems.length) },
      { title: 'Reclamacoes recorrentes', value: String(recurringComplaints) },
      { title: 'Tempo medio de resposta', value: `${averageResponseHours.toFixed(1)}h` },
      { title: 'Satisfacao media', value: surveyAverage.toFixed(1) },
    ],
    queueHref: canOpenOperationalQueue ? operationalQueuePath : null,
    recentManifestacoes: canOpenOperationalQueue
      ? manifestations.slice(0, 5).map((manifestation) => ({
      ...getManifestationSummary(manifestation),
      href: user
        ? getManifestationDetailPath(user.perfil, manifestation, user.capabilities)
        : `/admin/manifestacoes/${manifestation.id}`,
        }))
      : [],
    manifestacoesPorNatureza: Object.entries(
      manifestations.reduce<Record<string, number>>((accumulator, manifestation) => {
        accumulator[manifestation.natureza] = (accumulator[manifestation.natureza] ?? 0) + 1
        return accumulator
      }, {}),
    ).map(([name, value]) => ({
      key: name,
      name: NATUREZA_LABELS[name as keyof typeof NATUREZA_LABELS] ?? name,
      value,
    })),
    manifestacoesPorStatus: Object.entries(
      manifestations.reduce<Record<string, number>>((accumulator, manifestation) => {
        accumulator[manifestation.statusPublico] = (accumulator[manifestation.statusPublico] ?? 0) + 1
        return accumulator
      }, {}),
    ).map(([name, value]) => ({
      key: name,
      name: STATUS_PUBLICO_LABELS[name as keyof typeof STATUS_PUBLICO_LABELS] ?? name,
      value,
    })),
    manifestacoesPorCanal: Object.entries(
      manifestations.reduce<Record<string, number>>((accumulator, manifestation) => {
        accumulator[manifestation.canalOrigem] = (accumulator[manifestation.canalOrigem] ?? 0) + 1
        return accumulator
      }, {}),
    ).map(([name, value]) => ({ name, value })),
    manifestacoesPorComplexidade: Object.entries(
      manifestations.reduce<Record<string, number>>((accumulator, manifestation) => {
        accumulator[manifestation.complexidade] = (accumulator[manifestation.complexidade] ?? 0) + 1
        return accumulator
      }, {}),
    ).map(([name, value]) => ({ name, value })),
    volumeMensal,
  }
}

export async function buildAnalyticsData(user?: AuthenticatedUserView) {
  const database = await readDb()
  const aggregateOnly = user?.perfil === 'visualizador'
  const manifestations = aggregateOnly
    ? database.manifestacoes
    : filterManifestationsForUser(database.manifestacoes, user)
  const surveys = aggregateOnly
    ? database.pesquisas
    : filterSurveysForUser(database.pesquisas, database, user)

  const groupedByMonth = manifestations.reduce<Record<string, { monthKey: string; month: string; total: number; closed: number; denuncias: number }>>(
    (accumulator, manifestation) => {
      const date = new Date(manifestation.criadoEm)
      const key = monthKey(manifestation.criadoEm)
      const month = monthLabel(date.getMonth())
      if (!accumulator[key]) {
        accumulator[key] = { monthKey: key, month, total: 0, closed: 0, denuncias: 0 }
      }
      accumulator[key].total += 1
      if (manifestation.concluidoEm) {
        accumulator[key].closed += 1
      }
      if (manifestation.natureza === 'denuncia') {
        accumulator[key].denuncias += 1
      }
      return accumulator
    },
    {},
  )

  const monthlyData = Object.values(groupedByMonth).sort((left, right) =>
    left.monthKey.localeCompare(right.monthKey),
  )

  const typeDistribution = Object.entries(
    manifestations.reduce<Record<string, number>>((accumulator, manifestation) => {
      accumulator[manifestation.natureza] = (accumulator[manifestation.natureza] ?? 0) + 1
      return accumulator
    }, {}),
  ).map(([name, value]) => ({
    key: name,
    name: NATUREZA_LABELS[name as keyof typeof NATUREZA_LABELS] ?? name,
    value,
  }))

  const sectorData = Object.entries(
    manifestations.reduce<Record<string, { total: number; resolvidas: number }>>(
      (accumulator, manifestation) => {
        const key = manifestation.areaResponsavelId ?? 'ouvidoria'
        if (!accumulator[key]) {
          accumulator[key] = { total: 0, resolvidas: 0 }
        }
        accumulator[key].total += 1
        if (manifestation.concluidoEm) {
          accumulator[key].resolvidas += 1
        }
        return accumulator
      },
      {},
    ),
  ).map(([setor, values]) => ({
    setor: database.departamentos.find((department) => department.id === setor)?.nome ?? 'Ouvidoria',
    total: values.total,
    resolvidas: values.resolvidas,
  }))

  const satisfactionData = surveys.map((survey) => ({
    month: monthLabel(new Date(survey.criadoEm).getMonth()),
    nota: survey.notaGeral,
  }))

  const averageResponseHours =
    manifestations.filter((manifestation) => manifestation.dataRespostaInicial).length > 0
      ? manifestations
          .filter((manifestation) => manifestation.dataRespostaInicial)
          .reduce(
            (sum, manifestation) =>
              sum + diffInHours(manifestation.criadoEm, manifestation.dataRespostaInicial as string),
            0,
          ) /
        manifestations.filter((manifestation) => manifestation.dataRespostaInicial).length
      : 0

  const resolutionRate =
    manifestations.length > 0
      ? (manifestations.filter((manifestation) => manifestation.concluidoEm).length /
          manifestations.length) *
        100
      : 0

  const slaRate =
    manifestations.length > 0
      ? (manifestations.filter((manifestation) =>
          getSlaSnapshotForIndicator(
            manifestation.prazoRespostaInicial,
            manifestation.dataRespostaInicial,
          ),
        ).length /
          manifestations.length) *
        100
      : 0

  const satisfactionAverage =
    surveys.length > 0
      ? surveys.reduce((sum, survey) => sum + survey.notaGeral, 0) /
        surveys.length
      : 0

  return {
    monthlyData,
    typeDistribution,
    sectorData,
    satisfactionData,
    topSubjects: Object.entries(
      manifestations.reduce<Record<string, number>>((accumulator, manifestation) => {
        accumulator[manifestation.assunto] = (accumulator[manifestation.assunto] ?? 0) + 1
        return accumulator
      }, {}),
    )
      .map(([subject, total]) => ({
        subject: ASSUNTO_LABELS[subject as keyof typeof ASSUNTO_LABELS] ?? subject,
        total,
      }))
      .sort((left, right) => right.total - left.total)
      .slice(0, 5),
    kpis: {
      resolutionRate,
      averageResponseHours,
      satisfactionAverage,
      slaRate,
    },
  }
}
