// Tipos de identificação do manifestante
export type TipoIdentificacao = 'identificada' | 'anonima' | 'sigilosa'

// Natureza da manifestação
export type NaturezaManifestacao = 
  | 'denuncia' 
  | 'reclamacao' 
  | 'sugestao' 
  | 'elogio' 
  | 'consulta' 
  | 'solicitacao_complexa'

// Assuntos disponíveis
export type AssuntoManifestacao =
  | 'conduta_colaborador'
  | 'conduta_fornecedor'
  | 'saude_seguranca'
  | 'risco_fisico'
  | 'fatores_psicologicos'
  | 'assedio_moral'
  | 'assedio_sexual'
  | 'discriminacao'
  | 'fraude'
  | 'furto'
  | 'mau_uso_patrimonio'
  | 'extravio'
  | 'prejuizo_financeiro'
  | 'conflito_interesses'
  | 'violacao_politica_interna'
  | 'violacao_codigo_etica'
  | 'imagem_reputacao'
  | 'qualidade_produto'
  | 'atendimento'
  | 'processo_interno'
  | 'outro'

// Complexidade
export type Complexidade = 'baixa' | 'alta' | 'nao_sei'

// Prioridade
export type Prioridade = 'baixa' | 'media' | 'alta' | 'critica'

// Status da manifestação - Menor complexidade
export type StatusMenorComplexidade =
  | 'recebida'
  | 'protocolo_gerado'
  | 'em_analise_ouvidoria'
  | 'encaminhada_area'
  | 'aguardando_minuta'
  | 'minuta_recebida'
  | 'em_validacao'
  | 'ajustes_solicitados'
  | 'minuta_aprovada'
  | 'resposta_enviada'
  | 'concluida'
  | 'arquivada'

// Status da denúncia
export type StatusDenuncia =
  | 'recebida'
  | 'em_analise_pertinencia'
  | 'improcedente'
  | 'processo_aberto'
  | 'comite_convocado'
  | 'em_analise_comite'
  | 'plano_trabalho_definicao'
  | 'investigacao_iniciada'
  | 'em_investigacao'
  | 'relatorio_elaboracao'
  | 'relatorio_concluido'
  | 'em_avaliacao_comite'
  | 'encaminhada_diretoria'
  | 'decisao_recebida'
  | 'minuta_resposta_elaboracao'
  | 'resposta_manifestante_enviada'
  | 'acoes_corretivas_implementacao'
  | 'acoes_concluidas'
  | 'arquivada'

// Status público (visível ao manifestante)
export type StatusPublico =
  | 'recebida'
  | 'em_analise'
  | 'encaminhada_tratativa'
  | 'em_apuracao'
  | 'aguardando_informacoes'
  | 'prorrogada'
  | 'resposta_elaboracao'
  | 'concluida'
  | 'arquivada'

// Relação com a ArtGlass
export type RelacaoArtGlass =
  | 'colaborador'
  | 'ex_colaborador'
  | 'estagiario'
  | 'aprendiz'
  | 'prestador_servico'
  | 'fornecedor'
  | 'parceiro'
  | 'cliente'
  | 'comunidade'
  | 'outro'

// Preferência de contato
export type PreferenciaContato = 
  | 'email' 
  | 'telefone' 
  | 'nao_desejo' 
  | 'anonimo'

// Perfil de usuário no sistema
export type PerfilUsuario =
  | 'admin'
  | 'ouvidoria'
  | 'comite_etica'
  | 'area_tecnica'
  | 'rh'
  | 'gestor'
  | 'diretoria'
  | 'auditor'
  | 'visualizador'

// Modulos administrativos configuraveis por perfil
export type AdminCapability =
  | 'dashboard'
  | 'manifestacoes'
  | 'denuncias'
  | 'comite_etica'
  | 'areas_tecnicas'
  | 'usuarios'
  | 'relatorios'
  | 'indicadores'
  | 'pesquisas'
  | 'modelos_resposta'
  | 'prazos'
  | 'notificacoes'
  | 'auditoria'
  | 'configuracoes'

export type ProfileAccessMatrix = Record<PerfilUsuario, AdminCapability[]>

// Interface do Manifestante
export interface Manifestante {
  id: string
  tipoIdentificacao: TipoIdentificacao
  nome?: string
  cpfCnpj?: string
  email?: string
  telefone?: string
  relacaoArtGlass?: RelacaoArtGlass
  desejaRetorno: boolean
  preferenciaContato?: PreferenciaContato
  melhorHorario?: string
  consentimentoLgpd: boolean
  criadoEm: Date
}

// Interface da Manifestação
export interface Manifestacao {
  id: string
  protocolo: string
  natureza: NaturezaManifestacao
  naturezaOriginal: NaturezaManifestacao
  origem: TipoIdentificacao
  complexidade: Complexidade
  prioridade: Prioridade
  status: StatusMenorComplexidade | StatusDenuncia
  statusPublico: StatusPublico
  assunto: AssuntoManifestacao
  titulo: string
  descricao: string
  dataOcorrido?: Date
  localOcorrido?: string
  pessoasEnvolvidas?: string
  tentativaAnterior: 'sim' | 'nao' | 'nao_aplica'
  descricaoTentativa?: string
  situacaoEmAndamento: 'sim' | 'nao' | 'nao_sei'
  riscoImediato: 'sim' | 'nao' | 'nao_sei'
  canalOrigem: string
  manifestanteId: string
  responsavelAtualId?: string
  areaAtualId?: string
  prazoRespostaInicial: Date
  prazoRespostaFinal: Date
  dataRespostaInicial?: Date
  dataRespostaFinal?: Date
  prorrogada: boolean
  justificativaProrrogacao?: string
  criadoEm: Date
  atualizadoEm: Date
  concluidoEm?: Date
}

// Interface do Anexo
export interface Anexo {
  id: string
  manifestacaoId: string
  nomeArquivo: string
  caminho: string
  tipo: string
  tamanho: number
  enviadoPor: string
  permissao: 'publico' | 'restrito' | 'sigiloso'
  criadoEm: Date
}

// Interface da Resposta
export interface Resposta {
  id: string
  manifestacaoId: string
  tipo: 'inicial' | 'intermediaria' | 'conclusiva' | 'esclarecimento'
  assunto: string
  corpo: string
  enviadaPara: string
  enviadaPor: string
  enviadaEm: Date
  status: 'rascunho' | 'enviada' | 'lida'
}

// Interface da Pesquisa de Satisfação
export interface PesquisaSatisfacao {
  id: string
  manifestacaoId: string
  notaGeral: number
  clareza: number
  tempoResposta: number
  respeito: number
  demandaCompreendida: 'sim' | 'parcialmente' | 'nao'
  desejaReabrir: boolean
  comentario?: string
  criadoEm: Date
}

// Interface do Usuário
export interface Usuario {
  id: string
  nome: string
  email: string
  perfil: PerfilUsuario
  areaId?: string
  ativo: boolean
  ultimoAcesso?: Date
  criadoEm: Date
  atualizadoEm: Date
}

// Interface do Log de Auditoria
export interface LogAuditoria {
  id: string
  usuarioId: string
  acao: string
  entidade: string
  entidadeId: string
  valorAnterior?: string
  valorNovo?: string
  ip?: string
  criadoEm: Date
}
