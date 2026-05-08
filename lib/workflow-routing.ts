import type {
  AppUserRecord,
  AuthenticatedUserView,
  ManifestationRecord,
  WorkflowStatus,
} from '@/lib/server/schema'
import { DENUNCIA_FLOW, LOWER_COMPLEXITY_FLOW } from '@/lib/server/policy'
import type { NaturezaManifestacao, PerfilUsuario } from '@/lib/types'

export type OperationalQueueKey =
  | 'ouvidoria'
  | 'areas_tecnicas'
  | 'comite_etica'
  | 'diretoria'
  | 'rh'

export type WorkflowStatusDefinition = {
  status: WorkflowStatus
  label: string
  destinationQueue: OperationalQueueKey
  allowedActorQueues: OperationalQueueKey[]
}

const WORKFLOW_QUEUE_ORDER: OperationalQueueKey[] = [
  'ouvidoria',
  'areas_tecnicas',
  'comite_etica',
  'diretoria',
  'rh',
]

const WORKFLOW_STATUS_DEFINITIONS: Record<WorkflowStatus, WorkflowStatusDefinition> = {
  recebida: {
    status: 'recebida',
    label: 'Recebida',
    destinationQueue: 'ouvidoria',
    allowedActorQueues: ['ouvidoria'],
  },
  protocolo_gerado: {
    status: 'protocolo_gerado',
    label: 'Protocolo gerado',
    destinationQueue: 'ouvidoria',
    allowedActorQueues: ['ouvidoria'],
  },
  em_analise_ouvidoria: {
    status: 'em_analise_ouvidoria',
    label: 'Em analise pela Ouvidoria',
    destinationQueue: 'ouvidoria',
    allowedActorQueues: ['ouvidoria'],
  },
  encaminhada_area: {
    status: 'encaminhada_area',
    label: 'Encaminhada a area responsavel',
    destinationQueue: 'areas_tecnicas',
    allowedActorQueues: ['ouvidoria'],
  },
  aguardando_minuta: {
    status: 'aguardando_minuta',
    label: 'Aguardando minuta da area',
    destinationQueue: 'areas_tecnicas',
    allowedActorQueues: ['ouvidoria'],
  },
  minuta_recebida: {
    status: 'minuta_recebida',
    label: 'Minuta recebida',
    destinationQueue: 'ouvidoria',
    allowedActorQueues: ['areas_tecnicas'],
  },
  em_validacao: {
    status: 'em_validacao',
    label: 'Em validacao pela Ouvidoria',
    destinationQueue: 'ouvidoria',
    allowedActorQueues: ['ouvidoria'],
  },
  ajustes_solicitados: {
    status: 'ajustes_solicitados',
    label: 'Ajustes solicitados a area',
    destinationQueue: 'areas_tecnicas',
    allowedActorQueues: ['ouvidoria'],
  },
  minuta_aprovada: {
    status: 'minuta_aprovada',
    label: 'Minuta aprovada',
    destinationQueue: 'ouvidoria',
    allowedActorQueues: ['ouvidoria'],
  },
  resposta_enviada: {
    status: 'resposta_enviada',
    label: 'Resposta enviada ao manifestante',
    destinationQueue: 'ouvidoria',
    allowedActorQueues: ['ouvidoria'],
  },
  concluida: {
    status: 'concluida',
    label: 'Concluida',
    destinationQueue: 'ouvidoria',
    allowedActorQueues: ['ouvidoria'],
  },
  arquivada: {
    status: 'arquivada',
    label: 'Arquivada',
    destinationQueue: 'ouvidoria',
    allowedActorQueues: ['ouvidoria', 'comite_etica', 'diretoria', 'rh'],
  },
  em_analise_pertinencia: {
    status: 'em_analise_pertinencia',
    label: 'Em analise de pertinencia',
    destinationQueue: 'ouvidoria',
    allowedActorQueues: ['ouvidoria'],
  },
  improcedente: {
    status: 'improcedente',
    label: 'Improcedente',
    destinationQueue: 'ouvidoria',
    allowedActorQueues: ['ouvidoria'],
  },
  processo_aberto: {
    status: 'processo_aberto',
    label: 'Processo aberto',
    destinationQueue: 'ouvidoria',
    allowedActorQueues: ['ouvidoria'],
  },
  comite_convocado: {
    status: 'comite_convocado',
    label: 'Comite convocado',
    destinationQueue: 'comite_etica',
    allowedActorQueues: ['ouvidoria'],
  },
  em_analise_comite: {
    status: 'em_analise_comite',
    label: 'Em analise pelo Comite de Etica',
    destinationQueue: 'comite_etica',
    allowedActorQueues: ['comite_etica'],
  },
  plano_trabalho_definicao: {
    status: 'plano_trabalho_definicao',
    label: 'Plano de trabalho em definicao',
    destinationQueue: 'comite_etica',
    allowedActorQueues: ['comite_etica'],
  },
  investigacao_iniciada: {
    status: 'investigacao_iniciada',
    label: 'Investigacao iniciada',
    destinationQueue: 'comite_etica',
    allowedActorQueues: ['comite_etica'],
  },
  em_investigacao: {
    status: 'em_investigacao',
    label: 'Em investigacao',
    destinationQueue: 'comite_etica',
    allowedActorQueues: ['comite_etica'],
  },
  relatorio_elaboracao: {
    status: 'relatorio_elaboracao',
    label: 'Relatorio em elaboracao',
    destinationQueue: 'comite_etica',
    allowedActorQueues: ['comite_etica'],
  },
  relatorio_concluido: {
    status: 'relatorio_concluido',
    label: 'Relatorio final concluido',
    destinationQueue: 'comite_etica',
    allowedActorQueues: ['comite_etica'],
  },
  em_avaliacao_comite: {
    status: 'em_avaliacao_comite',
    label: 'Em avaliacao pelo Comite',
    destinationQueue: 'comite_etica',
    allowedActorQueues: ['comite_etica'],
  },
  encaminhada_diretoria: {
    status: 'encaminhada_diretoria',
    label: 'Encaminhada a Diretoria / Conselho',
    destinationQueue: 'diretoria',
    allowedActorQueues: ['comite_etica'],
  },
  decisao_recebida: {
    status: 'decisao_recebida',
    label: 'Decisao recebida pelo Comite',
    destinationQueue: 'comite_etica',
    allowedActorQueues: ['diretoria'],
  },
  minuta_resposta_elaboracao: {
    status: 'minuta_resposta_elaboracao',
    label: 'Minuta de resposta em elaboracao',
    destinationQueue: 'ouvidoria',
    allowedActorQueues: ['comite_etica'],
  },
  resposta_manifestante_enviada: {
    status: 'resposta_manifestante_enviada',
    label: 'Resposta ao manifestante enviada',
    destinationQueue: 'ouvidoria',
    allowedActorQueues: ['ouvidoria'],
  },
  acoes_corretivas_implementacao: {
    status: 'acoes_corretivas_implementacao',
    label: 'Acoes corretivas em implementacao',
    destinationQueue: 'rh',
    allowedActorQueues: ['ouvidoria'],
  },
  acoes_concluidas: {
    status: 'acoes_concluidas',
    label: 'Acoes corretivas concluidas',
    destinationQueue: 'ouvidoria',
    allowedActorQueues: ['rh'],
  },
}

function includesProfile(profile: PerfilUsuario, values: readonly PerfilUsuario[]) {
  return values.includes(profile)
}

function getOperationalQueuesForProfile(profile: PerfilUsuario): OperationalQueueKey[] {
  switch (profile) {
    case 'admin':
      return [...WORKFLOW_QUEUE_ORDER]
    case 'ouvidoria':
      return ['ouvidoria']
    case 'comite_etica':
      return ['comite_etica']
    case 'diretoria':
      return ['diretoria']
    case 'area_tecnica':
      return ['areas_tecnicas']
    case 'rh':
    case 'gestor':
      return ['areas_tecnicas', 'rh']
    default:
      return []
  }
}

export function getOperationalQueueOrder() {
  return [...WORKFLOW_QUEUE_ORDER]
}

export function getWorkflowStatusDefinition(status: WorkflowStatus) {
  return WORKFLOW_STATUS_DEFINITIONS[status]
}

export function getWorkflowStatusLabel(status: WorkflowStatus) {
  return WORKFLOW_STATUS_DEFINITIONS[status]?.label || status
}

export function getOperationalQueueLabel(queue: OperationalQueueKey) {
  switch (queue) {
    case 'areas_tecnicas':
      return 'Areas Tecnicas'
    case 'comite_etica':
      return 'Comite de Etica'
    case 'diretoria':
      return 'Diretoria / Conselho'
    case 'rh':
      return 'RH / Gestao'
    default:
      return 'Ouvidoria'
  }
}

export function getOperationalQueueForStatus(status: WorkflowStatus) {
  return getWorkflowStatusDefinition(status)?.destinationQueue || 'ouvidoria'
}

export function getOperationalQueueForManifestation(
  manifestation: Pick<ManifestationRecord, 'status'>,
) {
  return getOperationalQueueForStatus(manifestation.status)
}

export function getPreferredProfilesForQueue(queue: OperationalQueueKey): PerfilUsuario[] {
  switch (queue) {
    case 'areas_tecnicas':
      return ['area_tecnica', 'gestor', 'rh']
    case 'comite_etica':
      return ['comite_etica']
    case 'diretoria':
      return ['diretoria']
    case 'rh':
      return ['rh', 'gestor']
    default:
      return ['ouvidoria', 'admin']
  }
}

export function isUserEligibleForOperationalQueue(
  user: Pick<AppUserRecord | AuthenticatedUserView, 'perfil' | 'areaId'>,
  queue: OperationalQueueKey,
  areaId?: string,
) {
  switch (queue) {
    case 'areas_tecnicas':
      return (
        includesProfile(user.perfil, ['area_tecnica', 'gestor', 'rh']) &&
        (!areaId || !user.areaId || user.areaId === areaId)
      )
    case 'comite_etica':
      return user.perfil === 'comite_etica'
    case 'diretoria':
      return user.perfil === 'diretoria'
    case 'rh':
      return (
        includesProfile(user.perfil, ['rh', 'gestor']) &&
        (!areaId || !user.areaId || user.areaId === areaId)
      )
    default:
      return includesProfile(user.perfil, ['ouvidoria', 'admin'])
  }
}

export function canUserOperateQueue(
  user: Pick<AppUserRecord | AuthenticatedUserView, 'perfil' | 'areaId'>,
  queue: OperationalQueueKey,
  areaId?: string,
) {
  if (user.perfil === 'admin') {
    return true
  }

  if (!getOperationalQueuesForProfile(user.perfil).includes(queue)) {
    return false
  }

  return isUserEligibleForOperationalQueue(user, queue, areaId)
}

export function canUserEditCaseRouting(
  user: Pick<AppUserRecord | AuthenticatedUserView, 'perfil' | 'areaId'>,
  manifestation: Pick<ManifestationRecord, 'status' | 'areaResponsavelId'>,
) {
  const currentQueue = getOperationalQueueForManifestation(manifestation)
  return user.perfil === 'admin' || (user.perfil === 'ouvidoria' && currentQueue === 'ouvidoria')
}

export function canUserEditClassificationFields(
  user: Pick<AppUserRecord | AuthenticatedUserView, 'perfil' | 'areaId'>,
  manifestation: Pick<ManifestationRecord, 'status' | 'areaResponsavelId'>,
) {
  const currentQueue = getOperationalQueueForManifestation(manifestation)
  return user.perfil === 'admin' || (user.perfil === 'ouvidoria' && currentQueue === 'ouvidoria')
}

export function canUserSendManifestationCommunication(
  user: Pick<AppUserRecord | AuthenticatedUserView, 'perfil' | 'areaId'>,
  manifestation: Pick<ManifestationRecord, 'status' | 'areaResponsavelId'>,
) {
  const currentQueue = getOperationalQueueForManifestation(manifestation)
  return user.perfil === 'admin' || (user.perfil === 'ouvidoria' && currentQueue === 'ouvidoria')
}

export function canUserRegisterDeadlineAction(
  user: Pick<AppUserRecord | AuthenticatedUserView, 'perfil' | 'areaId'>,
  manifestation: Pick<ManifestationRecord, 'status' | 'areaResponsavelId'>,
) {
  const currentQueue = getOperationalQueueForManifestation(manifestation)
  return user.perfil === 'admin' || canUserOperateQueue(user, currentQueue, manifestation.areaResponsavelId)
}

export function isWorkflowStatusAllowedForNature(
  status: WorkflowStatus,
  natureza: NaturezaManifestacao,
) {
  if (natureza === 'denuncia') {
    return DENUNCIA_FLOW.includes(status)
  }

  return LOWER_COMPLEXITY_FLOW.includes(status)
}

export function getWorkflowStatusDefinitionsForNature(natureza: NaturezaManifestacao) {
  const source = natureza === 'denuncia' ? DENUNCIA_FLOW : LOWER_COMPLEXITY_FLOW
  return source.map((status) => WORKFLOW_STATUS_DEFINITIONS[status])
}

export function canUserTransitionManifestation(
  user: Pick<AppUserRecord | AuthenticatedUserView, 'perfil' | 'areaId'>,
  manifestation: Pick<ManifestationRecord, 'status' | 'natureza' | 'areaResponsavelId'>,
  nextStatus: WorkflowStatus,
) {
  if (user.perfil === 'admin') {
    return isWorkflowStatusAllowedForNature(nextStatus, manifestation.natureza)
  }

  if (!isWorkflowStatusAllowedForNature(nextStatus, manifestation.natureza)) {
    return false
  }

  const currentQueue = getOperationalQueueForManifestation(manifestation)
  if (!canUserOperateQueue(user, currentQueue, manifestation.areaResponsavelId)) {
    return false
  }

  const definition = getWorkflowStatusDefinition(nextStatus)
  return definition ? definition.allowedActorQueues.includes(currentQueue) : false
}

export function getAllowedWorkflowStatusDefinitions(
  user: Pick<AppUserRecord | AuthenticatedUserView, 'perfil' | 'areaId'>,
  manifestation: Pick<ManifestationRecord, 'status' | 'natureza' | 'areaResponsavelId'>,
) {
  const definitions = getWorkflowStatusDefinitionsForNature(manifestation.natureza)

  if (user.perfil === 'admin') {
    return definitions
  }

  return definitions.filter((definition) =>
    canUserTransitionManifestation(user, manifestation, definition.status),
  )
}

export function findFirstEligibleUserForQueue<
  T extends Pick<AppUserRecord, 'perfil' | 'areaId'> & { ativo?: boolean },
>(users: T[], queue: OperationalQueueKey, areaId?: string) {
  const preferredProfiles = getPreferredProfilesForQueue(queue)

  for (const profile of preferredProfiles) {
    const candidate = users.find(
      (user) =>
        user.ativo !== false &&
        user.perfil === profile &&
        isUserEligibleForOperationalQueue(user, queue, areaId),
    )

    if (candidate) {
      return candidate
    }
  }

  return undefined
}
