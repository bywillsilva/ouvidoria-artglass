import { STATUS_PUBLICO_LABELS } from '@/lib/constants'
import type { StatusPublico } from '@/lib/types'
import type { WorkflowStatus } from '@/lib/server/schema'

export function mapInternalToPublicStatus(status: WorkflowStatus): StatusPublico {
  switch (status) {
    case 'recebida':
    case 'protocolo_gerado':
      return 'recebida'
    case 'em_analise_ouvidoria':
    case 'em_analise_pertinencia':
    case 'processo_aberto':
    case 'comite_convocado':
      return 'em_analise'
    case 'encaminhada_area':
    case 'aguardando_minuta':
    case 'minuta_recebida':
    case 'em_validacao':
    case 'ajustes_solicitados':
    case 'minuta_aprovada':
      return 'encaminhada_tratativa'
    case 'em_analise_comite':
    case 'plano_trabalho_definicao':
    case 'investigacao_iniciada':
    case 'em_investigacao':
    case 'relatorio_elaboracao':
    case 'relatorio_concluido':
    case 'em_avaliacao_comite':
    case 'encaminhada_diretoria':
    case 'decisao_recebida':
    case 'acoes_corretivas_implementacao':
    case 'acoes_concluidas':
      return 'em_apuracao'
    case 'minuta_resposta_elaboracao':
      return 'resposta_elaboracao'
    case 'resposta_enviada':
    case 'resposta_manifestante_enviada':
    case 'concluida':
      return 'concluida'
    case 'improcedente':
    case 'arquivada':
      return 'arquivada'
    default:
      return 'em_analise'
  }
}

export function getPublicStatusLabel(status: StatusPublico) {
  return STATUS_PUBLICO_LABELS[status]
}
