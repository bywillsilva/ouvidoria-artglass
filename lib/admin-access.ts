import type {
  AppDatabase,
  AuthenticatedUserView,
  ManifestationRecord,
  SatisfactionSurveyRecord,
} from '@/lib/server/schema'
import type { AdminCapability, PerfilUsuario, ProfileAccessMatrix } from '@/lib/types'
import { getOperationalQueueForManifestation } from '@/lib/workflow-routing'

export type { AdminCapability } from '@/lib/types'

export const ADMIN_PROFILE_LABELS: Record<PerfilUsuario, string> = {
  admin: 'Administrador Geral',
  ouvidoria: 'Ouvidoria',
  comite_etica: 'Comite de Etica',
  area_tecnica: 'Area Tecnica',
  rh: 'RH',
  gestor: 'Gestor',
  diretoria: 'Diretoria / Conselho',
  auditor: 'Auditor / Compliance',
  visualizador: 'Visualizador restrito',
}

export const ADMIN_CAPABILITY_OPTIONS: Array<{
  capability: AdminCapability
  label: string
  description: string
}> = [
  {
    capability: 'dashboard',
    label: 'Dashboard',
    description: 'Visao executiva com alertas, cards e panorama operacional.',
  },
  {
    capability: 'manifestacoes',
    label: 'Manifestacoes',
    description: 'Fila geral de manifestacoes, detalhe do caso e tratativas.',
  },
  {
    capability: 'denuncias',
    label: 'Denuncias',
    description: 'Acesso ao modulo restrito de denuncias e casos sigilosos.',
  },
  {
    capability: 'comite_etica',
    label: 'Comite de Etica',
    description: 'Painel de investigacoes e deliberacoes do comite.',
  },
  {
    capability: 'areas_tecnicas',
    label: 'Areas Tecnicas',
    description: 'Fila de atendimento das areas responsaveis e minutas.',
  },
  {
    capability: 'usuarios',
    label: 'Usuarios',
    description: 'Cadastro de usuarios internos do painel.',
  },
  {
    capability: 'relatorios',
    label: 'Relatorios',
    description: 'Exportacoes e relatorios gerenciais do canal.',
  },
  {
    capability: 'indicadores',
    label: 'Indicadores',
    description: 'Graficos, consolidacao analitica e desempenho do canal.',
  },
  {
    capability: 'pesquisas',
    label: 'Pesquisas',
    description: 'Consulta das pesquisas de satisfacao e pedidos de reabertura.',
  },
  {
    capability: 'modelos_resposta',
    label: 'Modelos de resposta',
    description: 'Edicao dos modelos usados nas devolutivas da Ouvidoria.',
  },
  {
    capability: 'prazos',
    label: 'Prazos e SLA',
    description: 'Parametros de prazo, SLA e alertas da operacao.',
  },
  {
    capability: 'notificacoes',
    label: 'Notificacoes',
    description: 'Painel de notificacoes internas do sistema.',
  },
  {
    capability: 'auditoria',
    label: 'Auditoria',
    description: 'Consulta de logs, trilha de auditoria e acessos.',
  },
  {
    capability: 'configuracoes',
    label: 'Configuracoes',
    description: 'Parametros institucionais, templates e matriz de acesso.',
  },
]

const CAPABILITY_ROUTE_MAP: Record<AdminCapability, string> = {
  dashboard: '/admin/dashboard',
  manifestacoes: '/admin/manifestacoes',
  denuncias: '/admin/denuncias',
  comite_etica: '/admin/comite-etica',
  areas_tecnicas: '/admin/areas-tecnicas',
  usuarios: '/admin/usuarios',
  relatorios: '/admin/relatorios',
  indicadores: '/admin/indicadores',
  pesquisas: '/admin/pesquisas-satisfacao',
  modelos_resposta: '/admin/modelos-resposta',
  prazos: '/admin/prazos',
  notificacoes: '/admin/notificacoes',
  auditoria: '/admin/auditoria',
  configuracoes: '/admin/configuracoes',
}

const CAPABILITY_PRIORITY: AdminCapability[] = [
  'dashboard',
  'manifestacoes',
  'denuncias',
  'comite_etica',
  'areas_tecnicas',
  'usuarios',
  'relatorios',
  'indicadores',
  'pesquisas',
  'modelos_resposta',
  'prazos',
  'notificacoes',
  'auditoria',
  'configuracoes',
]

const DEFAULT_PROFILE_CAPABILITIES: ProfileAccessMatrix = {
  admin: [...CAPABILITY_PRIORITY],
  ouvidoria: [
    'dashboard',
    'manifestacoes',
    'denuncias',
    'relatorios',
    'indicadores',
    'pesquisas',
    'notificacoes',
  ],
  comite_etica: ['dashboard', 'denuncias', 'comite_etica', 'indicadores', 'notificacoes'],
  area_tecnica: ['areas_tecnicas', 'notificacoes'],
  rh: ['dashboard', 'areas_tecnicas', 'pesquisas', 'notificacoes'],
  gestor: ['dashboard', 'areas_tecnicas', 'notificacoes'],
  diretoria: ['dashboard', 'denuncias', 'relatorios', 'indicadores', 'notificacoes'],
  auditor: ['dashboard', 'denuncias', 'relatorios', 'indicadores', 'notificacoes', 'auditoria'],
  visualizador: ['dashboard', 'indicadores'],
}

const ROUTE_CAPABILITIES: Array<{ prefix: string; capability: AdminCapability }> = [
  { prefix: '/admin/dashboard', capability: 'dashboard' },
  { prefix: '/admin/manifestacoes', capability: 'manifestacoes' },
  { prefix: '/admin/denuncias', capability: 'denuncias' },
  { prefix: '/admin/comite-etica', capability: 'comite_etica' },
  { prefix: '/admin/areas-tecnicas', capability: 'areas_tecnicas' },
  { prefix: '/admin/usuarios', capability: 'usuarios' },
  { prefix: '/admin/relatorios', capability: 'relatorios' },
  { prefix: '/admin/indicadores', capability: 'indicadores' },
  { prefix: '/admin/pesquisas-satisfacao', capability: 'pesquisas' },
  { prefix: '/admin/modelos-resposta', capability: 'modelos_resposta' },
  { prefix: '/admin/prazos', capability: 'prazos' },
  { prefix: '/admin/notificacoes', capability: 'notificacoes' },
  { prefix: '/admin/auditoria', capability: 'auditoria' },
  { prefix: '/admin/configuracoes', capability: 'configuracoes' },
]

function orderedCapabilities(values: readonly string[]) {
  const selected = new Set(values)
  return CAPABILITY_PRIORITY.filter((capability) => selected.has(capability))
}

export function createDefaultAdminAccessMatrix(): ProfileAccessMatrix {
  return {
    admin: [...DEFAULT_PROFILE_CAPABILITIES.admin],
    ouvidoria: [...DEFAULT_PROFILE_CAPABILITIES.ouvidoria],
    comite_etica: [...DEFAULT_PROFILE_CAPABILITIES.comite_etica],
    area_tecnica: [...DEFAULT_PROFILE_CAPABILITIES.area_tecnica],
    rh: [...DEFAULT_PROFILE_CAPABILITIES.rh],
    gestor: [...DEFAULT_PROFILE_CAPABILITIES.gestor],
    diretoria: [...DEFAULT_PROFILE_CAPABILITIES.diretoria],
    auditor: [...DEFAULT_PROFILE_CAPABILITIES.auditor],
    visualizador: [...DEFAULT_PROFILE_CAPABILITIES.visualizador],
  }
}

export function normalizeAdminAccessMatrix(
  matrix?: Partial<Record<PerfilUsuario, readonly string[]>>,
): ProfileAccessMatrix {
  const defaults = createDefaultAdminAccessMatrix()

  const normalized = (Object.keys(defaults) as PerfilUsuario[]).reduce<ProfileAccessMatrix>(
    (accumulator, profile) => {
      const configured = matrix?.[profile]
      accumulator[profile] =
        configured === undefined
          ? defaults[profile]
          : orderedCapabilities(configured)

      return accumulator
    },
    {} as ProfileAccessMatrix,
  )

  normalized.admin = [...DEFAULT_PROFILE_CAPABILITIES.admin]

  return normalized
}

export function getCapabilitiesForProfile(
  profile: PerfilUsuario,
  matrix?: Partial<Record<PerfilUsuario, readonly string[]>>,
) {
  return normalizeAdminAccessMatrix(matrix)[profile]
}

function resolveCapabilities(
  profile: PerfilUsuario,
  explicitCapabilities?: readonly AdminCapability[],
) {
  return explicitCapabilities !== undefined
    ? [...explicitCapabilities]
    : getCapabilitiesForProfile(profile)
}

export function hasAdminCapability(
  profile: PerfilUsuario,
  capability: AdminCapability,
  explicitCapabilities?: readonly AdminCapability[],
) {
  return resolveCapabilities(profile, explicitCapabilities).includes(capability)
}

export function hasAnyAdminCapability(
  profile: PerfilUsuario,
  capabilities: AdminCapability[],
  explicitCapabilities?: readonly AdminCapability[],
) {
  return capabilities.some((capability) =>
    hasAdminCapability(profile, capability, explicitCapabilities),
  )
}

export function getDefaultAdminPath(
  profile: PerfilUsuario,
  explicitCapabilities?: readonly AdminCapability[],
) {
  const capabilities = resolveCapabilities(profile, explicitCapabilities)
  const firstCapability = CAPABILITY_PRIORITY.find((capability) => capabilities.includes(capability))
  return firstCapability ? CAPABILITY_ROUTE_MAP[firstCapability] : '/admin/login'
}

export function getOperationalQueuePath(
  profile: PerfilUsuario,
  manifestationNature?: ManifestationRecord['natureza'],
  explicitCapabilities?: readonly AdminCapability[],
) {
  if (manifestationNature === 'denuncia' && hasAdminCapability(profile, 'denuncias', explicitCapabilities)) {
    return CAPABILITY_ROUTE_MAP.denuncias
  }

  if (hasAdminCapability(profile, 'manifestacoes', explicitCapabilities)) {
    return CAPABILITY_ROUTE_MAP.manifestacoes
  }

  if (hasAdminCapability(profile, 'areas_tecnicas', explicitCapabilities)) {
    return CAPABILITY_ROUTE_MAP.areas_tecnicas
  }

  if (hasAdminCapability(profile, 'denuncias', explicitCapabilities)) {
    return CAPABILITY_ROUTE_MAP.denuncias
  }

  return getDefaultAdminPath(profile, explicitCapabilities)
}

export function getManifestationDetailPath(
  profile: PerfilUsuario,
  manifestation: Pick<ManifestationRecord, 'id' | 'natureza'>,
  explicitCapabilities?: readonly AdminCapability[],
) {
  if (
    manifestation.natureza === 'denuncia' &&
    hasAdminCapability(profile, 'denuncias', explicitCapabilities) &&
    !hasAdminCapability(profile, 'manifestacoes', explicitCapabilities)
  ) {
    return `/admin/denuncias/${manifestation.id}`
  }

  if (hasAdminCapability(profile, 'manifestacoes', explicitCapabilities)) {
    return `/admin/manifestacoes/${manifestation.id}`
  }

  if (hasAdminCapability(profile, 'areas_tecnicas', explicitCapabilities)) {
    return `/admin/areas-tecnicas/${manifestation.id}`
  }

  if (hasAdminCapability(profile, 'denuncias', explicitCapabilities)) {
    return `/admin/denuncias/${manifestation.id}`
  }

  return getDefaultAdminPath(profile, explicitCapabilities)
}

export function canAccessAdminPath(
  profile: PerfilUsuario,
  pathname: string,
  explicitCapabilities?: readonly AdminCapability[],
) {
  if (pathname === '/admin' || pathname === '/admin/login' || pathname === '/admin/primeiro-acesso') {
    return true
  }

  const matched = [...ROUTE_CAPABILITIES]
    .sort((left, right) => right.prefix.length - left.prefix.length)
    .find((entry) => pathname === entry.prefix || pathname.startsWith(entry.prefix + '/'))

  if (!matched) {
    return false
  }

  return hasAdminCapability(profile, matched.capability, explicitCapabilities)
}

export function canUserAccessManifestation(
  user: AuthenticatedUserView,
  manifestation: ManifestationRecord,
) {
  const operationalQueue = getOperationalQueueForManifestation(manifestation)

  switch (user.perfil) {
    case 'admin':
    case 'ouvidoria':
    case 'auditor':
      return true
    case 'comite_etica':
      return manifestation.natureza === 'denuncia' && operationalQueue === 'comite_etica'
    case 'diretoria':
      return manifestation.natureza === 'denuncia' && operationalQueue === 'diretoria'
    case 'area_tecnica':
      return (
        operationalQueue === 'areas_tecnicas' &&
        Boolean(user.areaId) &&
        manifestation.areaResponsavelId === user.areaId
      )
    case 'gestor':
    case 'rh':
      return (
        ['areas_tecnicas', 'rh'].includes(operationalQueue) &&
        Boolean(user.areaId) &&
        manifestation.areaResponsavelId === user.areaId
      )
    case 'visualizador':
      return false
    default:
      return false
  }
}

export function filterManifestationsForUser(
  manifestations: ManifestationRecord[],
  user?: AuthenticatedUserView,
) {
  if (!user) {
    return manifestations
  }

  return manifestations.filter((manifestation) => canUserAccessManifestation(user, manifestation))
}

export function filterSurveysForUser(
  surveys: SatisfactionSurveyRecord[],
  database: AppDatabase,
  user?: AuthenticatedUserView,
) {
  if (!user) {
    return surveys
  }

  const visibleIds = new Set(
    filterManifestationsForUser(database.manifestacoes, user).map((manifestation) => manifestation.id),
  )

  return surveys.filter((survey) => visibleIds.has(survey.manifestacaoId))
}
