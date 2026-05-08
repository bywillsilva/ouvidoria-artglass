import type {
  AdminCapability,
  AssuntoManifestacao,
  Complexidade,
  NaturezaManifestacao,
  PerfilUsuario,
  ProfileAccessMatrix,
  Prioridade,
  RelacaoArtGlass,
  StatusDenuncia,
  StatusMenorComplexidade,
  StatusPublico,
  TipoIdentificacao,
} from '@/lib/types'

export type WorkflowStatus = StatusMenorComplexidade | StatusDenuncia
export type ChannelOrigem = 'site' | 'sac' | 'email' | 'telefone' | 'presencial'
export type WorkflowLane =
  | 'cliente'
  | 'ouvidoria'
  | 'area_responsavel'
  | 'comite_etica'
  | 'diretoria'
  | 'rh'
export type VisibilidadeRegistro = 'publico' | 'restrito' | 'sigiloso'
export type TipoComunicacao = 'inicial' | 'intermediaria' | 'conclusiva' | 'esclarecimento'
export type StatusComunicacao = 'rascunho' | 'enviada' | 'lida'
export type MetodoRetorno = 'email' | 'telefone' | 'nao' | 'anonimo'

export interface DepartmentRecord {
  id: string
  nome: string
  responsavel: string
  email: string
  ativo: boolean
  criadoEm: string
  atualizadoEm: string
}

export interface AppUserRecord {
  id: string
  nome: string
  email: string
  perfil: PerfilUsuario
  areaId?: string
  senhaHash: string
  deveTrocarSenha?: boolean
  tentativasFalhasLogin?: number
  bloqueadoAte?: string
  ativo: boolean
  ultimoAcessoEm?: string
  criadoEm: string
  atualizadoEm: string
}

export interface ResponseTemplateRecord {
  id: string
  titulo: string
  descricao: string
  assunto: string
  corpo: string
  tipo: TipoComunicacao
  envioAutomatico: boolean
  categoria: 'automatico' | 'manual'
  criadoEm: string
  atualizadoEm: string
}

export interface NotificationSettingsRecord {
  novaManifestacao: boolean
  novaDenuncia: boolean
  manifestacaoAtribuida: boolean
  respostaManifestante: boolean
  resumoDiario: boolean
  confirmacaoRecebimento: boolean
  atualizacaoStatus: boolean
  respostaOuvidoria: boolean
  pesquisaSatisfacao: boolean
}

export interface SlaSettingsRecord {
  reclamacao: { respostaInicialHoras: number; resolucaoDias: number }
  sugestao: { respostaInicialHoras: number; resolucaoDias: number }
  denuncia: { respostaInicialHoras: number; analiseInicialDias: number }
  proximidadePercentual: number
  alertaVencido: boolean
  escalacaoAutomatica: boolean
}

export interface CompanySettingsRecord {
  nomeEmpresa: string
  cnpj: string
  emailOuvidoria: string
  telefone: string
  endereco: string
  portalTitulo: string
  portalMensagemBoasVindas: string
  permitirAnonimo: boolean
  permitirAnexos: boolean
  canalDenunciasAtivo: boolean
  smtpHost: string
  smtpPort: string
  smtpUser: string
  smtpPasswordMasked: string
  smtpTls: boolean
}

export interface AppSettingsRecord {
  empresa: CompanySettingsRecord
  notificacoes: NotificationSettingsRecord
  sla: SlaSettingsRecord
  acessos: ProfileAccessMatrix
}

export interface AttachmentRecord {
  id: string
  nomeArquivo: string
  caminhoArquivo: string
  mimeType: string
  tamanho: number
  enviadoPor: string
  visibilidade: VisibilidadeRegistro
  criadoEm: string
}

export interface CommunicationRecord {
  id: string
  tipo: TipoComunicacao
  assunto: string
  corpo: string
  de: string
  para: string
  status: StatusComunicacao
  canal: 'email'
  enviadaEm?: string
  criadaEm: string
}

export interface CommentRecord {
  id: string
  autor: string
  perfil: PerfilUsuario
  corpo: string
  criadoEm: string
}

export interface TimelineRecord {
  id: string
  data: string
  usuario: string
  acao: string
  descricao: string
  visibilidade: 'publica' | 'interna'
}

export interface SatisfactionSurveyRecord {
  id: string
  manifestacaoId: string
  notaGeral: number
  clareza: number
  tempoResposta: number
  respeito: number
  demandaCompreendida: 'sim' | 'parcialmente' | 'nao'
  desejaReabrir: boolean
  comentario?: string
  criadoEm: string
}

export interface ManifestanteRecord {
  tipoIdentificacao: TipoIdentificacao
  nome?: string
  cpfCnpj?: string
  email?: string
  telefone?: string
  relacaoArtGlass?: RelacaoArtGlass
  desejaRetorno: MetodoRetorno
  melhorHorario?: string
  consentimentoLgpd: boolean
  declaracaoVerdade: boolean
}

export interface ManifestationRecord {
  id: string
  protocolo: string
  natureza: NaturezaManifestacao
  naturezaOriginal: NaturezaManifestacao
  assunto: AssuntoManifestacao
  complexidade: Complexidade
  prioridade: Prioridade
  status: WorkflowStatus
  statusPublico: StatusPublico
  laneAtual: WorkflowLane
  canalOrigem: ChannelOrigem
  titulo: string
  descricao: string
  dataOcorrido?: string
  localOcorrido?: string
  pessoasEnvolvidas?: string
  tentativaAnterior: 'sim' | 'nao' | 'nao_aplica'
  descricaoTentativa?: string
  situacaoEmAndamento: 'sim' | 'nao' | 'nao_sei'
  riscoImediato: 'sim' | 'nao' | 'nao_sei'
  manifestante: ManifestanteRecord
  areaResponsavelId?: string
  responsavelAtualId?: string
  prazoRespostaInicial: string
  prazoRespostaFinal: string
  dataRespostaInicial?: string
  dataRespostaFinal?: string
  prorrogada: boolean
  justificativaProrrogacao?: string
  anexos: AttachmentRecord[]
  comunicacoes: CommunicationRecord[]
  comentarios: CommentRecord[]
  timeline: TimelineRecord[]
  criadoEm: string
  atualizadoEm: string
  concluidoEm?: string
  arquivadoEm?: string
}

export interface SessionRecord {
  token: string
  usuarioId: string
  expiraEm: string
  criadoEm: string
}

export interface AppDatabase {
  versao: number
  sequencialProtocolo: number
  settings: AppSettingsRecord
  departamentos: DepartmentRecord[]
  usuarios: AppUserRecord[]
  templates: ResponseTemplateRecord[]
  manifestacoes: ManifestationRecord[]
  pesquisas: SatisfactionSurveyRecord[]
  sessoes: SessionRecord[]
}

export interface PublicTrackingView {
  protocolo: string
  natureza: NaturezaManifestacao
  status: StatusPublico
  dataAbertura: string
  respostaInicial?: string
  respostaIntermediaria?: string
  respostaConclusiva?: string
  timeline: Array<{
    data: string
    status: string
    descricao: string
  }>
}

export interface AuthenticatedUserView {
  id: string
  nome: string
  email: string
  perfil: PerfilUsuario
  areaId?: string
  deveTrocarSenha?: boolean
  capabilities: AdminCapability[]
}
