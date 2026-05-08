import {
  ASSUNTOS_MAIOR_COMPLEXIDADE,
  PRAZOS,
} from '@/lib/constants'
import {
  getPublicStatusLabel as getSharedPublicStatusLabel,
  mapInternalToPublicStatus as mapSharedInternalToPublicStatus,
} from '@/lib/public-status'
import type {
  AssuntoManifestacao,
  Complexidade,
  NaturezaManifestacao,
  Prioridade,
  StatusPublico,
} from '@/lib/types'
import { addBusinessDays, addHours, formatDateISO } from '@/lib/server/date'
import type { WorkflowLane, WorkflowStatus } from '@/lib/server/schema'

export const LOWER_COMPLEXITY_FLOW: WorkflowStatus[] = [
  'recebida',
  'protocolo_gerado',
  'em_analise_ouvidoria',
  'encaminhada_area',
  'aguardando_minuta',
  'minuta_recebida',
  'em_validacao',
  'ajustes_solicitados',
  'minuta_aprovada',
  'resposta_enviada',
  'concluida',
  'arquivada',
]

export const DENUNCIA_FLOW: WorkflowStatus[] = [
  'recebida',
  'em_analise_pertinencia',
  'improcedente',
  'processo_aberto',
  'comite_convocado',
  'em_analise_comite',
  'plano_trabalho_definicao',
  'investigacao_iniciada',
  'em_investigacao',
  'relatorio_elaboracao',
  'relatorio_concluido',
  'em_avaliacao_comite',
  'encaminhada_diretoria',
  'decisao_recebida',
  'minuta_resposta_elaboracao',
  'resposta_manifestante_enviada',
  'acoes_corretivas_implementacao',
  'acoes_concluidas',
  'arquivada',
]

export function classifyComplexity(
  natureza: NaturezaManifestacao,
  assunto: AssuntoManifestacao,
  riscoImediato: 'sim' | 'nao' | 'nao_sei',
) {
  if (natureza === 'denuncia' || natureza === 'solicitacao_complexa') {
    return 'alta' satisfies Complexidade
  }

  if (riscoImediato === 'sim' || ASSUNTOS_MAIOR_COMPLEXIDADE.includes(assunto)) {
    return 'alta' satisfies Complexidade
  }

  return 'baixa' satisfies Complexidade
}

export function classifyPriority(
  natureza: NaturezaManifestacao,
  complexidade: Complexidade,
  riscoImediato: 'sim' | 'nao' | 'nao_sei',
) {
  if (riscoImediato === 'sim') {
    return 'critica' satisfies Prioridade
  }

  if (natureza === 'denuncia') {
    return 'alta' satisfies Prioridade
  }

  if (complexidade === 'alta') {
    return 'media' satisfies Prioridade
  }

  return natureza === 'elogio' ? ('baixa' satisfies Prioridade) : ('media' satisfies Prioridade)
}

export function isDenunciaWorkflow(natureza: NaturezaManifestacao) {
  return natureza === 'denuncia'
}

export function getInitialWorkflowStatus(
  natureza: NaturezaManifestacao,
  complexidade: Complexidade,
) {
  if (natureza === 'denuncia') {
    return 'em_analise_pertinencia' satisfies WorkflowStatus
  }

  if (natureza === 'solicitacao_complexa' || complexidade === 'alta') {
    return 'em_analise_ouvidoria' satisfies WorkflowStatus
  }

  if (complexidade === 'nao_sei') {
    return 'em_analise_ouvidoria' satisfies WorkflowStatus
  }

  return 'protocolo_gerado' satisfies WorkflowStatus
}

export function getLaneForStatus(status: WorkflowStatus): WorkflowLane {
  if (
    status === 'encaminhada_area' ||
    status === 'aguardando_minuta' ||
    status === 'ajustes_solicitados'
  ) {
    return 'area_responsavel'
  }

  if (
    status === 'comite_convocado' ||
    status === 'em_analise_comite' ||
    status === 'plano_trabalho_definicao' ||
    status === 'investigacao_iniciada' ||
    status === 'em_investigacao' ||
    status === 'relatorio_elaboracao' ||
    status === 'relatorio_concluido' ||
    status === 'em_avaliacao_comite' ||
    status === 'decisao_recebida'
  ) {
    return 'comite_etica'
  }

  if (status === 'encaminhada_diretoria') {
    return 'diretoria'
  }

  if (status === 'acoes_corretivas_implementacao') {
    return 'rh'
  }

  return 'ouvidoria'
}

export function mapInternalToPublicStatus(status: WorkflowStatus): StatusPublico {
  return mapSharedInternalToPublicStatus(status)
}

export function getStatusLabel(status: WorkflowStatus) {
  const customLabels: Record<WorkflowStatus, string> = {
    recebida: 'Recebida',
    protocolo_gerado: 'Protocolo gerado',
    em_analise_ouvidoria: 'Em análise pela Ouvidoria',
    encaminhada_area: 'Encaminhada à área responsável',
    aguardando_minuta: 'Aguardando minuta',
    minuta_recebida: 'Minuta recebida',
    em_validacao: 'Em validação',
    ajustes_solicitados: 'Ajustes solicitados',
    minuta_aprovada: 'Minuta aprovada',
    resposta_enviada: 'Resposta enviada',
    concluida: 'Concluída',
    arquivada: 'Arquivada',
    em_analise_pertinencia: 'Análise de pertinência',
    improcedente: 'Improcedente',
    processo_aberto: 'Processo aberto',
    comite_convocado: 'Comitê convocado',
    em_analise_comite: 'Em análise pelo Comitê',
    plano_trabalho_definicao: 'Plano de trabalho em definição',
    investigacao_iniciada: 'Investigação iniciada',
    em_investigacao: 'Em investigação',
    relatorio_elaboracao: 'Relatório em elaboração',
    relatorio_concluido: 'Relatório concluído',
    em_avaliacao_comite: 'Em avaliação do Comitê',
    encaminhada_diretoria: 'Encaminhada à Diretoria',
    decisao_recebida: 'Decisão recebida',
    minuta_resposta_elaboracao: 'Minuta de resposta em elaboração',
    resposta_manifestante_enviada: 'Resposta ao manifestante enviada',
    acoes_corretivas_implementacao: 'Implementação de ações',
    acoes_concluidas: 'Ações concluídas',
  }

  return customLabels[status]
}

export function getPublicStatusLabel(status: StatusPublico) {
  return getSharedPublicStatusLabel(status)
}

export function getPublicStatusDescription(status: StatusPublico) {
  switch (status) {
    case 'recebida':
      return 'Sua manifestacao foi registrada e aguarda a triagem inicial da Ouvidoria.'
    case 'em_analise':
      return 'A Ouvidoria esta realizando a avaliacao inicial do caso.'
    case 'encaminhada_tratativa':
      return 'A manifestacao foi encaminhada internamente para tratativa pela area responsavel.'
    case 'em_apuracao':
      return 'O caso segue em apuracao pelas instancias responsaveis, com preservacao do sigilo aplicavel.'
    case 'aguardando_informacoes':
      return 'A analise depende de informacoes complementares para continuar.'
    case 'prorrogada':
      return 'O prazo de tratativa foi prorrogado com justificativa interna registrada.'
    case 'resposta_elaboracao':
      return 'A resposta final esta em elaboracao para envio ao manifestante.'
    case 'concluida':
      return 'A tratativa foi concluida e a devolutiva ao manifestante foi finalizada.'
    case 'arquivada':
      return 'A manifestacao foi encerrada e arquivada conforme os procedimentos internos.'
    default:
      return 'O andamento da manifestacao foi atualizado pela Ouvidoria.'
  }
}

export function calculateDeadlines(natureza: NaturezaManifestacao, complexidade: Complexidade) {
  const now = new Date()

  if (natureza === 'denuncia') {
    return {
      prazoRespostaInicial: formatDateISO(addBusinessDays(now, PRAZOS.denuncia.ouvidoria_inicial)),
      prazoRespostaFinal: formatDateISO(addBusinessDays(now, PRAZOS.denuncia.feedback_manifestante)),
    }
  }

  if (natureza === 'solicitacao_complexa' || complexidade === 'alta') {
    return {
      prazoRespostaInicial: formatDateISO(addBusinessDays(now, PRAZOS.solicitacao_complexa.inicial)),
      prazoRespostaFinal: formatDateISO(addBusinessDays(now, PRAZOS.solicitacao_complexa.conclusiva)),
    }
  }

  return {
    prazoRespostaInicial: formatDateISO(addBusinessDays(now, PRAZOS.menor_complexidade.inicial)),
    prazoRespostaFinal: formatDateISO(addBusinessDays(now, PRAZOS.menor_complexidade.conclusiva)),
  }
}

export function getSlaSnapshotForIndicator(prazoInicial: string, respostaInicial?: string) {
  if (!respostaInicial) {
    return new Date(prazoInicial).getTime() >= Date.now()
  }

  return new Date(respostaInicial).getTime() <= new Date(prazoInicial).getTime()
}

export function toExtensionStatus(status: WorkflowStatus) {
  if (status === 'resposta_enviada' || status === 'resposta_manifestante_enviada') {
    return 'resposta_elaboracao'
  }

  return mapInternalToPublicStatus(status)
}
