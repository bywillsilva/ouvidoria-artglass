import { 
  NaturezaManifestacao, 
  AssuntoManifestacao, 
  TipoIdentificacao,
  RelacaoArtGlass,
  StatusPublico,
  Complexidade,
  Prioridade
} from './types'

// Labels para natureza da manifestação
export const NATUREZA_LABELS: Record<NaturezaManifestacao, string> = {
  denuncia: 'Denúncia',
  reclamacao: 'Reclamação',
  sugestao: 'Sugestão',
  elogio: 'Elogio',
  consulta: 'Consulta / Solicitação de informação',
  solicitacao_complexa: 'Solicitação complexa'
}

// Descrições para natureza
export const NATUREZA_DESCRICOES: Record<NaturezaManifestacao, string> = {
  denuncia: 'Comunicação de possível violação ao Código de Conduta e Ética, políticas internas, leis, ordens de serviço ou condutas que representem risco à ArtGlass, colaboradores, clientes, fornecedores ou reputação institucional.',
  reclamacao: 'Demonstração de insatisfação relativa a atendimento, produtos, serviços ou processos.',
  sugestao: 'Ideia ou proposta de melhoria para processos, atendimento, conduta, produtos, serviços ou ambiente.',
  elogio: 'Reconhecimento ou satisfação sobre produtos, serviços, atendimento, equipe ou colaborador.',
  consulta: 'Perguntas, dúvidas ou solicitações de informação de baixa complexidade.',
  solicitacao_complexa: 'Pedido que exige análise técnica, orientação especial ou tratativa por área responsável.'
}

// Labels para tipo de identificação
export const IDENTIFICACAO_LABELS: Record<TipoIdentificacao, string> = {
  identificada: 'Identificada',
  anonima: 'Anônima',
  sigilosa: 'Sigilosa'
}

export const IDENTIFICACAO_DESCRICOES: Record<TipoIdentificacao, string> = {
  identificada: 'O manifestante informa nome e dados de contato.',
  anonima: 'O manifestante não informa nome nem dados pessoais.',
  sigilosa: 'O manifestante informa seus dados, mas solicita preservação de identidade perante áreas envolvidas.'
}

// Labels para assuntos
export const ASSUNTO_LABELS: Record<AssuntoManifestacao, string> = {
  conduta_colaborador: 'Conduta de colaborador',
  conduta_fornecedor: 'Conduta de fornecedor',
  saude_seguranca: 'Saúde e segurança',
  risco_fisico: 'Risco físico',
  fatores_psicologicos: 'Fatores psicológicos',
  assedio_moral: 'Assédio moral',
  assedio_sexual: 'Assédio sexual',
  discriminacao: 'Discriminação',
  fraude: 'Fraude',
  furto: 'Furto',
  mau_uso_patrimonio: 'Mau uso do patrimônio',
  extravio: 'Extravio',
  prejuizo_financeiro: 'Prejuízo financeiro',
  conflito_interesses: 'Conflito de interesses',
  violacao_politica_interna: 'Violação de política interna',
  violacao_codigo_etica: 'Violação do Código de Conduta e Ética',
  imagem_reputacao: 'Imagem e reputação institucional',
  qualidade_produto: 'Qualidade de produto',
  atendimento: 'Atendimento',
  processo_interno: 'Processo interno',
  outro: 'Outro'
}

// Labels para relação com a ArtGlass
export const RELACAO_LABELS: Record<RelacaoArtGlass, string> = {
  colaborador: 'Colaborador',
  ex_colaborador: 'Ex-colaborador',
  estagiario: 'Estagiário',
  aprendiz: 'Aprendiz',
  prestador_servico: 'Prestador de serviço',
  fornecedor: 'Fornecedor',
  parceiro: 'Parceiro',
  cliente: 'Cliente',
  comunidade: 'Comunidade',
  outro: 'Outro'
}

// Labels para status público
export const STATUS_PUBLICO_LABELS: Record<StatusPublico, string> = {
  recebida: 'Recebida',
  em_analise: 'Em análise pela Ouvidoria',
  encaminhada_tratativa: 'Encaminhada para tratativa',
  em_apuracao: 'Em apuração',
  aguardando_informacoes: 'Aguardando informações adicionais',
  prorrogada: 'Prorrogada com justificativa',
  resposta_elaboracao: 'Resposta em elaboração',
  concluida: 'Concluída',
  arquivada: 'Arquivada'
}

// Labels para complexidade
export const COMPLEXIDADE_LABELS: Record<Complexidade, string> = {
  baixa: 'Baixa complexidade',
  alta: 'Maior complexidade',
  nao_sei: 'Não sei informar'
}

// Labels para prioridade
export const PRIORIDADE_LABELS: Record<Prioridade, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  critica: 'Crítica'
}

// Cores para badges de status
export const STATUS_COLORS: Record<string, string> = {
  recebida: 'bg-info/10 text-info border-info/20',
  em_analise: 'bg-info/10 text-info border-info/20',
  em_analise_ouvidoria: 'bg-info/10 text-info border-info/20',
  encaminhada_tratativa: 'bg-warning/10 text-warning border-warning/20',
  encaminhada_area: 'bg-warning/10 text-warning border-warning/20',
  em_apuracao: 'bg-committee/10 text-committee border-committee/20',
  aguardando_informacoes: 'bg-warning/10 text-warning border-warning/20',
  aguardando_minuta: 'bg-warning/10 text-warning border-warning/20',
  prorrogada: 'bg-info/10 text-info border-info/20',
  resposta_elaboracao: 'bg-info/10 text-info border-info/20',
  concluida: 'bg-success/10 text-success border-success/20',
  arquivada: 'bg-muted text-muted-foreground border-muted',
  improcedente: 'bg-muted text-muted-foreground border-muted',
  atrasada: 'bg-destructive/10 text-destructive border-destructive/20',
  critica: 'bg-destructive/10 text-destructive border-destructive/20',
  comite: 'bg-committee/10 text-committee border-committee/20'
}

// Cores para badges de prioridade
export const PRIORIDADE_COLORS: Record<Prioridade, string> = {
  baixa: 'bg-success/10 text-success border-success/20',
  media: 'bg-info/10 text-info border-info/20',
  alta: 'bg-warning/10 text-warning border-warning/20',
  critica: 'bg-destructive/10 text-destructive border-destructive/20'
}

// Cores para badges de natureza
export const NATUREZA_COLORS: Record<NaturezaManifestacao, string> = {
  denuncia: 'bg-destructive/10 text-destructive border-destructive/20',
  reclamacao: 'bg-warning/10 text-warning border-warning/20',
  sugestao: 'bg-info/10 text-info border-info/20',
  elogio: 'bg-success/10 text-success border-success/20',
  consulta: 'bg-primary/10 text-primary border-primary/20',
  solicitacao_complexa: 'bg-committee/10 text-committee border-committee/20'
}

// Assuntos que indicam maior complexidade automaticamente
export const ASSUNTOS_MAIOR_COMPLEXIDADE: AssuntoManifestacao[] = [
  'saude_seguranca',
  'risco_fisico',
  'fatores_psicologicos',
  'assedio_moral',
  'assedio_sexual',
  'discriminacao',
  'fraude',
  'furto',
  'mau_uso_patrimonio',
  'conflito_interesses',
  'violacao_politica_interna',
  'violacao_codigo_etica',
  'imagem_reputacao',
  'conduta_colaborador',
  'conduta_fornecedor'
]

// Prazos padrão em dias
export const PRAZOS = {
  menor_complexidade: {
    inicial: 7,
    conclusiva: 20
  },
  denuncia: {
    ouvidoria_inicial: 7,
    ouvidoria_conclusiva: 10,
    comite_inicial: 7,
    comite_conclusiva: 10,
    equipe_inicial: 15,
    equipe_conclusiva: 30,
    feedback_manifestante: 20
  },
  solicitacao_complexa: {
    inicial: 7,
    conclusiva: 10
  }
}

// Formato do protocolo
export const PROTOCOLO_PREFIX = 'OUV'
export const PROTOCOLO_ANO = new Date().getFullYear()

// Função para gerar protocolo
export function gerarProtocolo(sequencial: number): string {
  const ano = new Date().getFullYear()
  const seq = sequencial.toString().padStart(6, '0')
  return `${PROTOCOLO_PREFIX}-${ano}-${seq}`
}

// Extensões de arquivo permitidas
export const EXTENSOES_PERMITIDAS = [
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.txt'
]

// Tamanho máximo de arquivo em bytes (10MB)
export const TAMANHO_MAX_ARQUIVO = 10 * 1024 * 1024
