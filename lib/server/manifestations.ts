import path from 'path'
import { randomUUID } from 'crypto'

import {
  canUserAccessManifestation,
  filterManifestationsForUser,
} from '@/lib/admin-access'
import {
  ASSUNTO_LABELS,
  COMPLEXIDADE_LABELS,
  EXTENSOES_PERMITIDAS,
  IDENTIFICACAO_LABELS,
  NATUREZA_LABELS,
  PRIORIDADE_LABELS,
  RELACAO_LABELS,
  TAMANHO_MAX_ARQUIVO,
  gerarProtocolo,
} from '@/lib/constants'
import {
  canUserEditCaseRouting,
  canUserEditClassificationFields,
  canUserRegisterDeadlineAction,
  canUserSendManifestationCommunication,
  canUserTransitionManifestation,
  findFirstEligibleUserForQueue,
  getOperationalQueueForManifestation,
  getOperationalQueueForStatus,
  getOperationalQueueLabel,
  isUserEligibleForOperationalQueue,
} from '@/lib/workflow-routing'
import {
  calculateDeadlines,
  classifyComplexity,
  classifyPriority,
  getLaneForStatus,
  getPublicStatusLabel,
  getPublicStatusDescription,
  getStatusLabel,
  getInitialWorkflowStatus,
  mapInternalToPublicStatus,
} from '@/lib/server/policy'
import { readDb, updateDb } from '@/lib/server/store'
import type {
  AppDatabase,
  AttachmentRecord,
  AuthenticatedUserView,
  CommunicationRecord,
  DepartmentRecord,
  ManifestationRecord,
  PublicTrackingView,
  TipoComunicacao,
  WorkflowStatus,
} from '@/lib/server/schema'
import type {
  AssuntoManifestacao,
  Complexidade,
  NaturezaManifestacao,
  Prioridade,
  RelacaoArtGlass,
  TipoIdentificacao,
} from '@/lib/types'

function textFromFormData(formData: FormData, field: string) {
  const value = formData.get(field)
  return typeof value === 'string' ? value.trim() : ''
}

function booleanFromFormData(formData: FormData, field: string) {
  return textFromFormData(formData, field) === 'true'
}

function fileExtension(fileName: string) {
  const extension = path.extname(fileName).toLowerCase()
  return extension
}

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize('NFD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
}

interface PreparedAttachment {
  metadata: AttachmentRecord
  contentBase64: string
}

function departmentBySubject(
  database: AppDatabase,
  assunto: AssuntoManifestacao,
): DepartmentRecord | undefined {
  const mapping: Partial<Record<AssuntoManifestacao, string>> = {
    atendimento: 'dept-comercial',
    qualidade_produto: 'dept-producao',
    processo_interno: 'dept-ti',
    saude_seguranca: 'dept-rh',
    risco_fisico: 'dept-rh',
    fatores_psicologicos: 'dept-rh',
    assedio_moral: 'dept-rh',
    assedio_sexual: 'dept-rh',
    discriminacao: 'dept-rh',
    fraude: 'dept-financeiro',
    furto: 'dept-financeiro',
    prejuizo_financeiro: 'dept-financeiro',
    extravio: 'dept-logistica',
    imagem_reputacao: 'dept-comercial',
    conduta_colaborador: 'dept-rh',
    conduta_fornecedor: 'dept-comercial',
  }

  const departmentId = mapping[assunto] ?? 'dept-comercial'
  return database.departamentos.find((department) => department.id === departmentId)
}

function defaultResponsibleUser(
  database: AppDatabase,
  queue: ReturnType<typeof getOperationalQueueForStatus>,
  departmentId?: string,
) {
  return findFirstEligibleUserForQueue(database.usuarios, queue, departmentId)
}

function resolveQueueAssignment(
  database: AppDatabase,
  manifestation: Pick<ManifestationRecord, 'assunto'>,
  input: {
    status: WorkflowStatus
    areaResponsavelId?: string
    responsavelAtualId?: string
  },
  options?: {
    explicitAreaChange?: boolean
    explicitResponsibleChange?: boolean
    allowAutoForward?: boolean
  },
) {
  let nextStatus = input.status
  let nextLane = getLaneForStatus(nextStatus)
  let nextQueue = getOperationalQueueForStatus(nextStatus)
  let nextAreaResponsavelId = input.areaResponsavelId
  let nextResponsavelAtualId = input.responsavelAtualId

  if (options?.allowAutoForward && nextAreaResponsavelId && nextQueue === 'ouvidoria') {
    nextStatus = 'encaminhada_area'
    nextLane = getLaneForStatus(nextStatus)
    nextQueue = getOperationalQueueForStatus(nextStatus)
  }

  if (options?.allowAutoForward && !nextAreaResponsavelId && nextQueue === 'areas_tecnicas') {
    nextStatus = 'em_analise_ouvidoria'
    nextLane = getLaneForStatus(nextStatus)
    nextQueue = getOperationalQueueForStatus(nextStatus)
  }

  if ((nextQueue === 'areas_tecnicas' || nextQueue === 'rh') && !nextAreaResponsavelId) {
    nextAreaResponsavelId = departmentBySubject(database, manifestation.assunto)?.id
  }

  const selectedResponsible = nextResponsavelAtualId
    ? database.usuarios.find((user) => user.id === nextResponsavelAtualId && user.ativo)
    : undefined

  if (
    options?.explicitResponsibleChange &&
    nextResponsavelAtualId &&
    (!selectedResponsible ||
      !isUserEligibleForOperationalQueue(
        selectedResponsible,
        nextQueue,
        nextAreaResponsavelId,
      ))
  ) {
    throw new Error('Responsavel atual nao pertence a fila operacional selecionada.')
  }

  if (
    selectedResponsible &&
    !isUserEligibleForOperationalQueue(selectedResponsible, nextQueue, nextAreaResponsavelId)
  ) {
    nextResponsavelAtualId = undefined
  }

  if (!nextResponsavelAtualId) {
    nextResponsavelAtualId = defaultResponsibleUser(
      database,
      nextQueue,
      nextAreaResponsavelId,
    )?.id
  }

  return {
    status: nextStatus,
    laneAtual: nextLane,
    queueAtual: nextQueue,
    areaResponsavelId: nextAreaResponsavelId,
    responsavelAtualId: nextResponsavelAtualId,
  }
}

function renderTemplate(body: string, manifestation: ManifestationRecord) {
  return body
    .replaceAll('{PROTOCOLO}', manifestation.protocolo)
    .replaceAll('{NATUREZA}', NATUREZA_LABELS[manifestation.natureza])
    .replaceAll('{ASSUNTO}', ASSUNTO_LABELS[manifestation.assunto])
}

async function prepareAttachments(manifestationId: string, files: File[], visibilidade: AttachmentRecord['visibilidade']) {
  const prepared: PreparedAttachment[] = []

  for (const file of files) {
    const extension = fileExtension(file.name)
    if (!EXTENSOES_PERMITIDAS.includes(extension)) {
      throw new Error(`Arquivo invalido: ${file.name}`)
    }

    if (file.size > TAMANHO_MAX_ARQUIVO) {
      throw new Error(`Arquivo excede o limite de 10MB: ${file.name}`)
    }

    const id = randomUUID()
    const buffer = Buffer.from(await file.arrayBuffer())

    prepared.push({
      metadata: {
        id,
        nomeArquivo: sanitizeFileName(file.name),
        caminhoArquivo: `db://attachments/${manifestationId}/${id}`,
        mimeType: file.type || 'application/octet-stream',
        tamanho: file.size,
        enviadoPor: 'manifestante',
        visibilidade,
        criadoEm: new Date().toISOString(),
      },
      contentBase64: buffer.toString('base64'),
    })
  }

  return prepared
}

function createTimelineEntry(
  usuario: string,
  acao: string,
  descricao: string,
  visibilidade: 'publica' | 'interna',
) {
  return {
    id: randomUUID(),
    data: new Date().toISOString(),
    usuario,
    acao,
    descricao,
    visibilidade,
  }
}

function appendPublicStatusUpdate(
  manifestation: ManifestationRecord,
  statusPublico: ManifestationRecord['statusPublico'],
  customAction?: string,
  customDescription?: string,
) {
  manifestation.timeline.unshift(
    createTimelineEntry(
      'Sistema',
      customAction || getPublicStatusLabel(statusPublico),
      customDescription || getPublicStatusDescription(statusPublico),
      'publica',
    ),
  )
}

export async function createManifestationFromFormData(formData: FormData) {
  const natureza = textFromFormData(formData, 'natureza') as NaturezaManifestacao
  const assunto = textFromFormData(formData, 'assunto') as AssuntoManifestacao
  const tipoIdentificacao = textFromFormData(formData, 'tipoIdentificacao') as TipoIdentificacao
  const relacaoArtGlass = textFromFormData(formData, 'relacaoArtGlass') as RelacaoArtGlass
  const riscoImediato = textFromFormData(formData, 'riscoImediato') as 'sim' | 'nao' | 'nao_sei'

  if (!natureza || !assunto || !tipoIdentificacao) {
    throw new Error('Dados obrigatorios ausentes.')
  }

  if (tipoIdentificacao !== 'anonima') {
    if (!textFromFormData(formData, 'nome') || !textFromFormData(formData, 'email')) {
      throw new Error('Nome e e-mail sao obrigatorios para manifestacoes identificadas ou sigilosas.')
    }
  }

  const complexidade: Complexidade =
    natureza === 'denuncia' || natureza === 'solicitacao_complexa' ? 'alta' : 'nao_sei'
  const complexidadeOperacional =
    complexidade === 'nao_sei'
      ? classifyComplexity(natureza, assunto, riscoImediato)
      : complexidade
  const prioridade = classifyPriority(natureza, complexidadeOperacional, riscoImediato)
  const status = getInitialWorkflowStatus(natureza, complexidade)
  const statusPublico = mapInternalToPublicStatus(status)
  const laneAtual = getLaneForStatus(status)
  const deadlines = calculateDeadlines(natureza, complexidade)
  const now = new Date().toISOString()
  const manifestationId = randomUUID()
  const preparedAttachments = await prepareAttachments(
    manifestationId,
    formData
      .getAll('anexos')
      .filter((entry): entry is File => typeof entry !== 'string' && entry.size > 0),
    natureza === 'denuncia' ? 'sigiloso' : 'restrito',
  )

  const manifestation = await updateDb(async (database, context) => {
    database.sequencialProtocolo += 1
    const protocolo = gerarProtocolo(database.sequencialProtocolo)
    const responsavel = defaultResponsibleUser(database, 'ouvidoria')

    const record: ManifestationRecord = {
      id: manifestationId,
      protocolo,
      natureza,
      naturezaOriginal: natureza,
      assunto,
      complexidade,
      prioridade,
      status,
      statusPublico,
      laneAtual,
      canalOrigem: 'site',
      titulo: textFromFormData(formData, 'titulo'),
      descricao: textFromFormData(formData, 'descricao'),
      dataOcorrido: textFromFormData(formData, 'dataOcorrido') || undefined,
      localOcorrido: textFromFormData(formData, 'localOcorrido') || undefined,
      pessoasEnvolvidas: textFromFormData(formData, 'pessoasEnvolvidas') || undefined,
      tentativaAnterior: textFromFormData(formData, 'tentativaAnterior') as
        | 'sim'
        | 'nao'
        | 'nao_aplica',
      descricaoTentativa: textFromFormData(formData, 'descricaoTentativa') || undefined,
      situacaoEmAndamento: textFromFormData(formData, 'situacaoEmAndamento') as
        | 'sim'
        | 'nao'
        | 'nao_sei',
      riscoImediato,
      manifestante: {
        tipoIdentificacao,
        nome: textFromFormData(formData, 'nome') || undefined,
        cpfCnpj: textFromFormData(formData, 'cpfCnpj') || undefined,
        email: textFromFormData(formData, 'email') || undefined,
        telefone: textFromFormData(formData, 'telefone') || undefined,
        relacaoArtGlass: relacaoArtGlass || undefined,
        desejaRetorno: (textFromFormData(formData, 'desejaRetorno') ||
          (tipoIdentificacao === 'anonima' ? 'anonimo' : 'nao')) as
          | 'email'
          | 'telefone'
          | 'nao'
          | 'anonimo',
        melhorHorario: textFromFormData(formData, 'melhorHorario') || undefined,
        consentimentoLgpd: booleanFromFormData(formData, 'consentimentoLgpd'),
        declaracaoVerdade: booleanFromFormData(formData, 'declaracaoVerdade'),
      },
      areaResponsavelId: undefined,
      responsavelAtualId: responsavel?.id,
      prazoRespostaInicial: deadlines.prazoRespostaInicial,
      prazoRespostaFinal: deadlines.prazoRespostaFinal,
      prorrogada: false,
      anexos: preparedAttachments.map((attachment) => attachment.metadata),
      comunicacoes: [],
      comentarios: [],
      timeline: [
        createTimelineEntry(
          'Sistema',
          'Manifestacao registrada',
          `Protocolo ${protocolo} gerado automaticamente.`,
          'publica',
        ),
      ],
      criadoEm: now,
      atualizadoEm: now,
    }

    for (const attachment of preparedAttachments) {
      await context.saveAttachmentBlob({
        attachmentId: attachment.metadata.id,
        manifestationId,
        fileName: attachment.metadata.nomeArquivo,
        mimeType: attachment.metadata.mimeType,
        sizeBytes: attachment.metadata.tamanho,
        contentBase64: attachment.contentBase64,
      })
    }

    const template = database.templates.find((candidate) => candidate.id === 'template-confirmacao')
    if (template && record.manifestante.email) {
      const communication: CommunicationRecord = {
        id: randomUUID(),
        tipo: 'inicial',
        assunto: renderTemplate(template.assunto, record),
        corpo: renderTemplate(template.corpo, record),
        de: 'Ouvidoria ArtGlass',
        para: record.manifestante.email,
        status: 'enviada',
        canal: 'email',
        criadaEm: now,
        enviadaEm: now,
      }
      record.comunicacoes.push(communication)
      record.dataRespostaInicial = now
      record.timeline.push(
        createTimelineEntry(
          'Sistema',
          'Confirmacao enviada',
          'Mensagem de recebimento enviada ao manifestante.',
          'publica',
        ),
      )
    }

    database.manifestacoes.unshift(record)
    return record
  })

  return manifestation
}

export async function listManifestations(filters?: {
  search?: string
  status?: string
  natureza?: string
  origem?: string
  area?: string
  responsavel?: string
  complexidade?: string
  queue?: string
  denunciasOnly?: boolean
  atrasadasOnly?: boolean
  arquivadasOnly?: boolean
  anonimasOnly?: boolean
  sigilosasOnly?: boolean
  improcedentesOnly?: boolean
},
user?: AuthenticatedUserView,
) {
  const database = await readDb()
  const search = filters?.search?.toLowerCase().trim()
  const visibleManifestations = filterManifestationsForUser(database.manifestacoes, user)

  return visibleManifestations
    .filter((manifestation) => {
      if (filters?.denunciasOnly && manifestation.natureza !== 'denuncia') {
        return false
      }

      if (filters?.status && filters.status !== 'all' && manifestation.status !== filters.status) {
        return false
      }

      if (
        filters?.natureza &&
        filters.natureza !== 'all' &&
        manifestation.natureza !== filters.natureza
      ) {
        return false
      }

      if (
        filters?.origem &&
        filters.origem !== 'all' &&
        manifestation.manifestante.tipoIdentificacao !== filters.origem
      ) {
        return false
      }

      if (
        filters?.area &&
        filters.area !== 'all' &&
        (manifestation.areaResponsavelId ?? 'ouvidoria') !== filters.area
      ) {
        return false
      }

      if (
        filters?.responsavel &&
        filters.responsavel !== 'all' &&
        (manifestation.responsavelAtualId ?? 'nao_atribuido') !== filters.responsavel
      ) {
        return false
      }

      if (
        filters?.complexidade &&
        filters.complexidade !== 'all' &&
        manifestation.complexidade !== filters.complexidade
      ) {
        return false
      }

      if (
        filters?.queue &&
        filters.queue !== 'all' &&
        getOperationalQueueForManifestation(manifestation) !== filters.queue
      ) {
        return false
      }

      if (filters?.atrasadasOnly) {
        const late = new Date(manifestation.prazoRespostaFinal).getTime() < Date.now()
        if (!late || manifestation.concluidoEm) {
          return false
        }
      }

      if (filters?.arquivadasOnly && manifestation.status !== 'arquivada') {
        return false
      }

      if (filters?.anonimasOnly && manifestation.manifestante.tipoIdentificacao !== 'anonima') {
        return false
      }

      if (filters?.sigilosasOnly && manifestation.manifestante.tipoIdentificacao !== 'sigilosa') {
        return false
      }

      if (filters?.improcedentesOnly && manifestation.status !== 'improcedente') {
        return false
      }

      if (search) {
        const haystack = [
          manifestation.protocolo,
          manifestation.titulo,
          manifestation.descricao,
          manifestation.manifestante.nome,
          ASSUNTO_LABELS[manifestation.assunto],
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        return haystack.includes(search)
      }

      return true
    })
    .sort((left, right) => new Date(right.criadoEm).getTime() - new Date(left.criadoEm).getTime())
}

export async function getManifestationById(id: string, user?: AuthenticatedUserView) {
  const database = await readDb()
  const manifestation = database.manifestacoes.find((candidate) => candidate.id === id) ?? null
  if (!manifestation) {
    return null
  }

  if (user && !canUserAccessManifestation(user, manifestation)) {
    return null
  }

  return manifestation
}

export async function findAttachment(
  manifestationId: string,
  attachmentId: string,
  user?: AuthenticatedUserView,
) {
  const manifestation = await getManifestationById(manifestationId, user)
  if (!manifestation) {
    return null
  }

  return manifestation.anexos.find((attachment) => attachment.id === attachmentId) ?? null
}

export async function buildPublicTracking(protocolo: string, email?: string) {
  const database = await readDb()
  const normalizedProtocol = protocolo.trim().toUpperCase()
  const manifestation = database.manifestacoes.find(
    (candidate) => candidate.protocolo.toUpperCase() === normalizedProtocol,
  )

  if (!manifestation) {
    return null
  }

  if (
    manifestation.manifestante.tipoIdentificacao !== 'anonima' &&
    manifestation.manifestante.email &&
    manifestation.manifestante.email.toLowerCase() !== (email || '').trim().toLowerCase()
  ) {
    return null
  }

  const communicationsByType = new Map<TipoComunicacao, CommunicationRecord>()
  for (const communication of manifestation.comunicacoes) {
    communicationsByType.set(communication.tipo, communication)
  }

  const timeline = manifestation.timeline
    .filter((entry) => entry.visibilidade === 'publica')
    .sort((left, right) => new Date(left.data).getTime() - new Date(right.data).getTime())
    .map((entry) => ({
      data: entry.data,
      status: entry.acao,
      descricao: entry.descricao,
    }))

  const view: PublicTrackingView = {
    protocolo: manifestation.protocolo,
    natureza: manifestation.natureza,
    status: manifestation.statusPublico,
    dataAbertura: manifestation.criadoEm,
    respostaInicial: communicationsByType.get('inicial')?.corpo,
    respostaIntermediaria: communicationsByType.get('intermediaria')?.corpo,
    respostaConclusiva: communicationsByType.get('conclusiva')?.corpo,
    timeline,
  }

  return view
}

function appendInternalAudit(
  manifestation: ManifestationRecord,
  user: AuthenticatedUserView,
  action: string,
  description: string,
) {
  manifestation.timeline.unshift(createTimelineEntry(user.nome, action, description, 'interna'))
}

export async function updateManifestation(
  id: string,
  payload: Partial<{
    natureza: NaturezaManifestacao
    assunto: AssuntoManifestacao
    complexidade: Complexidade
    prioridade: Prioridade
    status: WorkflowStatus
    areaResponsavelId: string | null
    responsavelAtualId: string | null
    justificativaProrrogacao: string
    prorrogada: boolean
  }>,
  user: AuthenticatedUserView,
) {
  return updateDb((database) => {
    const manifestation = database.manifestacoes.find((candidate) => candidate.id === id)
    if (!manifestation) {
      throw new Error('Manifestacao nao encontrada.')
    }

    if (!canUserAccessManifestation(user, manifestation)) {
      throw new Error('FORBIDDEN')
    }

    const canEditClassification = canUserEditClassificationFields(user, manifestation)
    const canEditRouting = canUserEditCaseRouting(user, manifestation)
    const canRegisterDeadline = canUserRegisterDeadlineAction(user, manifestation)

    const previousStatus = manifestation.status
    const previousAreaResponsavelId = manifestation.areaResponsavelId
    const previousResponsavelAtualId = manifestation.responsavelAtualId

    if (
      !canEditClassification &&
      (payload.natureza !== undefined ||
        payload.assunto !== undefined ||
        payload.complexidade !== undefined ||
        payload.prioridade !== undefined)
    ) {
      throw new Error('Apenas a administracao ou a Ouvidoria podem alterar a classificacao principal do caso.')
    }

    if (
      !canEditRouting &&
      (payload.areaResponsavelId !== undefined || payload.responsavelAtualId !== undefined)
    ) {
      throw new Error('A fila operacional atual nao pode redistribuir este caso.')
    }

    if (
      !canRegisterDeadline &&
      (payload.prorrogada !== undefined || payload.justificativaProrrogacao !== undefined)
    ) {
      throw new Error('Apenas a fila operacional responsavel pode registrar prorrogacao.')
    }

    if (
      payload.status !== undefined &&
      !canUserTransitionManifestation(user, manifestation, payload.status)
    ) {
      throw new Error('O status selecionado nao pode ser aplicado pela fila operacional atual.')
    }

    if (payload.natureza) {
      manifestation.natureza = payload.natureza
    }
    if (payload.assunto) {
      manifestation.assunto = payload.assunto
    }
    if (payload.complexidade) {
      manifestation.complexidade = payload.complexidade
    }
    if (payload.prioridade) {
      manifestation.prioridade = payload.prioridade
    }

    const routing = resolveQueueAssignment(
      database,
      manifestation,
      {
        status: payload.status ?? manifestation.status,
        areaResponsavelId:
          payload.areaResponsavelId !== undefined
            ? payload.areaResponsavelId || undefined
            : manifestation.areaResponsavelId,
        responsavelAtualId:
          payload.responsavelAtualId !== undefined
            ? payload.responsavelAtualId || undefined
            : manifestation.responsavelAtualId,
      },
      {
        explicitAreaChange: payload.areaResponsavelId !== undefined,
        explicitResponsibleChange: payload.responsavelAtualId !== undefined,
        allowAutoForward:
          manifestation.natureza !== 'denuncia' &&
          payload.areaResponsavelId !== undefined &&
          payload.status === undefined,
      },
    )

    manifestation.areaResponsavelId = routing.areaResponsavelId
    manifestation.responsavelAtualId = routing.responsavelAtualId

    if (payload.prorrogada !== undefined) {
      manifestation.prorrogada = payload.prorrogada
    }
    if (
      payload.justificativaProrrogacao &&
      payload.justificativaProrrogacao !== manifestation.justificativaProrrogacao
    ) {
      manifestation.justificativaProrrogacao = payload.justificativaProrrogacao
      manifestation.prorrogada = true
      manifestation.statusPublico = 'prorrogada'
      appendPublicStatusUpdate(
        manifestation,
        'prorrogada',
        'Prazo prorrogado',
        getPublicStatusDescription('prorrogada'),
      )
      appendInternalAudit(
        manifestation,
        user,
        'Prorrogacao registrada',
        payload.justificativaProrrogacao,
      )
    }

    if (routing.status !== manifestation.status) {
      manifestation.status = routing.status
      manifestation.statusPublico = mapInternalToPublicStatus(routing.status)
      manifestation.laneAtual = routing.laneAtual

      if (routing.status === 'resposta_enviada' || routing.status === 'resposta_manifestante_enviada') {
        manifestation.dataRespostaFinal = new Date().toISOString()
      }

      if (routing.status === 'concluida') {
        manifestation.concluidoEm = new Date().toISOString()
        manifestation.dataRespostaFinal = manifestation.dataRespostaFinal ?? new Date().toISOString()
      }

      if (routing.status === 'arquivada') {
        manifestation.arquivadoEm = new Date().toISOString()
      }

      appendPublicStatusUpdate(manifestation, manifestation.statusPublico)

      appendInternalAudit(
        manifestation,
        user,
        'Status atualizado',
        `Manifestacao movida para ${getStatusLabel(routing.status)}.`,
      )
    }

    if (previousAreaResponsavelId !== manifestation.areaResponsavelId) {
      appendInternalAudit(
        manifestation,
        user,
        'Area responsavel atualizada',
        manifestation.areaResponsavelId
          ? `Caso vinculado a area ${manifestation.areaResponsavelId}.`
          : 'Caso retornou para triagem sem area responsavel ativa.',
      )
    }

    if (previousResponsavelAtualId !== manifestation.responsavelAtualId) {
      appendInternalAudit(
        manifestation,
        user,
        'Responsavel atual atualizado',
        manifestation.responsavelAtualId
          ? `Responsavel atual definido como ${manifestation.responsavelAtualId}.`
          : 'Caso ficou sem responsavel nomeado.',
      )
    }

    manifestation.atualizadoEm = new Date().toISOString()
    return manifestation
  })
}

export async function addComment(id: string, body: string, user: AuthenticatedUserView) {
  if (!body.trim()) {
    throw new Error('Comentario vazio.')
  }

  return updateDb((database) => {
    const manifestation = database.manifestacoes.find((candidate) => candidate.id === id)
    if (!manifestation) {
      throw new Error('Manifestacao nao encontrada.')
    }

    if (!canUserAccessManifestation(user, manifestation)) {
      throw new Error('FORBIDDEN')
    }

    manifestation.comentarios.unshift({
      id: randomUUID(),
      autor: user.nome,
      perfil: user.perfil,
      corpo: body.trim(),
      criadoEm: new Date().toISOString(),
    })

    appendInternalAudit(manifestation, user, 'Comentario interno', body.trim())
    manifestation.atualizadoEm = new Date().toISOString()
    return manifestation
  })
}

export async function addCommunication(
  id: string,
  input: {
    tipo: TipoComunicacao
    assunto: string
    corpo: string
  },
  user: AuthenticatedUserView,
) {
  if (!input.assunto.trim() || !input.corpo.trim()) {
    throw new Error('Assunto e corpo da comunicacao sao obrigatorios.')
  }

  return updateDb((database) => {
    const manifestation = database.manifestacoes.find((candidate) => candidate.id === id)
    if (!manifestation) {
      throw new Error('Manifestacao nao encontrada.')
    }

    if (!canUserAccessManifestation(user, manifestation)) {
      throw new Error('FORBIDDEN')
    }

    if (!canUserSendManifestationCommunication(user, manifestation)) {
      throw new Error('Apenas a Ouvidoria ou o administrador podem responder o manifestante nesta etapa.')
    }

    const receiver = manifestation.manifestante.email || 'Manifestante'
    const now = new Date().toISOString()
    manifestation.comunicacoes.unshift({
      id: randomUUID(),
      tipo: input.tipo,
      assunto: input.assunto.trim(),
      corpo: input.corpo.trim(),
      de: user.nome,
      para: receiver,
      status: 'enviada',
      canal: 'email',
      criadaEm: now,
      enviadaEm: now,
    })

    if (input.tipo === 'inicial') {
      manifestation.dataRespostaInicial = now
    }

    if (input.tipo === 'intermediaria') {
      manifestation.statusPublico = 'prorrogada'
    }

    if (input.tipo === 'conclusiva') {
      const finalStatus =
        manifestation.natureza === 'denuncia' ? 'resposta_manifestante_enviada' : 'concluida'

      manifestation.dataRespostaFinal = now
      manifestation.statusPublico = 'concluida'
      manifestation.status = finalStatus
      manifestation.laneAtual = getLaneForStatus(finalStatus)
      manifestation.concluidoEm = now
    }

    manifestation.timeline.unshift(
      createTimelineEntry(
        user.nome,
        `Resposta ${input.tipo} enviada`,
        input.assunto.trim(),
        'publica',
      ),
    )
    appendInternalAudit(
      manifestation,
      user,
      'Comunicacao registrada',
      `Mensagem ${input.tipo} enviada ao manifestante.`,
    )
    manifestation.atualizadoEm = now
    return manifestation
  })
}

export function getManifestationSummary(manifestation: ManifestationRecord) {
  const queueAtual = getOperationalQueueForManifestation(manifestation)

  return {
    id: manifestation.id,
    protocolo: manifestation.protocolo,
    dataAbertura: manifestation.criadoEm,
    natureza: manifestation.natureza,
    naturezaLabel: NATUREZA_LABELS[manifestation.natureza],
    assunto: ASSUNTO_LABELS[manifestation.assunto],
    origem: IDENTIFICACAO_LABELS[manifestation.manifestante.tipoIdentificacao],
    origemKey: manifestation.manifestante.tipoIdentificacao,
    complexidade: COMPLEXIDADE_LABELS[manifestation.complexidade],
    complexidadeKey: manifestation.complexidade,
    prioridade: manifestation.prioridade,
    prioridadeLabel: PRIORIDADE_LABELS[manifestation.prioridade],
    status: manifestation.status,
    statusLabel: getStatusLabel(manifestation.status),
    statusPublico: manifestation.statusPublico,
    statusPublicoLabel: getPublicStatusLabel(manifestation.statusPublico),
    responsavel: manifestation.responsavelAtualId,
    area: manifestation.areaResponsavelId,
    laneAtual: manifestation.laneAtual,
    filaAtual: queueAtual,
    filaAtualLabel: getOperationalQueueLabel(queueAtual),
    riscoImediato: manifestation.riscoImediato,
    prazoInicial: manifestation.prazoRespostaInicial,
    prazoFinal: manifestation.prazoRespostaFinal,
    diasAberto: Math.max(
      0,
      Math.round(
        (Date.now() - new Date(manifestation.criadoEm).getTime()) / (1000 * 60 * 60 * 24),
      ),
    ),
    atrasada: new Date(manifestation.prazoRespostaFinal).getTime() < Date.now(),
    canal: manifestation.canalOrigem,
  }
}

export function getSupportingMetadata(database: AppDatabase) {
  const departmentsById = Object.fromEntries(
    database.departamentos.map((department) => [department.id, department]),
  )
  const usersById = Object.fromEntries(database.usuarios.map((user) => [user.id, user]))

  return {
    departmentsById,
    usersById,
  }
}
