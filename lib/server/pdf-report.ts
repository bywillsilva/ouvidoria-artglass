import {
  ASSUNTO_LABELS,
  COMPLEXIDADE_LABELS,
  IDENTIFICACAO_LABELS,
  NATUREZA_LABELS,
  PRIORIDADE_LABELS,
  RELACAO_LABELS,
  STATUS_PUBLICO_LABELS,
} from '@/lib/constants'
import { getPublicStatusLabel } from '@/lib/server/policy'
import type { ManifestationRecord, SatisfactionSurveyRecord } from '@/lib/server/schema'
import {
  getOperationalQueueForManifestation,
  getOperationalQueueLabel,
  getWorkflowStatusLabel,
} from '@/lib/workflow-routing'

type ReportInput = {
  companyName: string
  manifestation: ManifestationRecord
  areaNome?: string
  responsavelNome?: string
  survey?: SatisfactionSurveyRecord
}

type ReportLine = {
  kind?: 'text' | 'divider'
  text?: string
  font?: 'regular' | 'bold'
  size?: number
  indent?: number
  spacingBefore?: number
}

const PAGE_WIDTH = 595
const PAGE_HEIGHT = 842
const MARGIN_X = 48
const HEADER_TOP = 804
const BODY_TOP = 756
const FOOTER_Y = 28
const BOTTOM_LIMIT = 52

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString('pt-BR') : '-'
}

function normalizePdfText(value?: string) {
  if (!value) {
    return '-'
  }

  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\x20-\x7E\n]/g, ' ')
    .replace(/\r/g, '')
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function wrapText(value: string, maxChars: number) {
  const normalized = normalizePdfText(value)
  const paragraphs = normalized.split('\n')
  const lines: string[] = []

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim()
    if (!trimmed) {
      lines.push('')
      continue
    }

    const words = trimmed.split(/\s+/)
    let currentLine = ''

    for (const word of words) {
      if (!currentLine) {
        if (word.length <= maxChars) {
          currentLine = word
          continue
        }

        for (let index = 0; index < word.length; index += maxChars) {
          lines.push(word.slice(index, index + maxChars))
        }
        currentLine = ''
        continue
      }

      const nextLine = `${currentLine} ${word}`
      if (nextLine.length <= maxChars) {
        currentLine = nextLine
        continue
      }

      lines.push(currentLine)

      if (word.length <= maxChars) {
        currentLine = word
        continue
      }

      for (let index = 0; index < word.length; index += maxChars) {
        const chunk = word.slice(index, index + maxChars)
        if (chunk.length === maxChars || index + maxChars < word.length) {
          lines.push(chunk)
        } else {
          currentLine = chunk
        }
      }

      if (word.length % maxChars === 0) {
        currentLine = ''
      }
    }

    if (currentLine) {
      lines.push(currentLine)
    }
  }

  return lines.length > 0 ? lines : ['-']
}

function pushSection(lines: ReportLine[], title: string) {
  lines.push({ kind: 'divider', spacingBefore: 10 })
  lines.push({ text: title, font: 'bold', size: 13, spacingBefore: 8 })
}

function pushField(lines: ReportLine[], label: string, value?: string) {
  lines.push({ text: `${label}: ${normalizePdfText(value)}`, spacingBefore: 2 })
}

function pushParagraph(lines: ReportLine[], value?: string) {
  lines.push({ text: normalizePdfText(value), spacingBefore: 2 })
}

function pushDivider(lines: ReportLine[], spacingBefore = 8) {
  lines.push({ kind: 'divider', spacingBefore })
}

function buildReportLines(input: ReportInput) {
  const { manifestation, survey, areaNome, responsavelNome } = input
  const lines: ReportLine[] = []
  const queueLabel = getOperationalQueueLabel(getOperationalQueueForManifestation(manifestation))

  lines.push({ text: 'Documento consolidado da manifestacao', font: 'bold', size: 16 })
  lines.push({
    text: 'Relatorio completo para consulta formal, preservando o historico processual do caso.',
    spacingBefore: 4,
  })

  pushSection(lines, 'Quadro resumo')
  pushField(lines, 'Protocolo', manifestation.protocolo)
  pushField(lines, 'Natureza', NATUREZA_LABELS[manifestation.natureza])
  pushField(lines, 'Assunto', ASSUNTO_LABELS[manifestation.assunto])
  pushField(lines, 'Titulo do caso', manifestation.titulo)
  pushField(lines, 'Complexidade', COMPLEXIDADE_LABELS[manifestation.complexidade])
  pushField(lines, 'Prioridade', PRIORIDADE_LABELS[manifestation.prioridade])
  pushField(lines, 'Status interno', getWorkflowStatusLabel(manifestation.status))
  pushField(
    lines,
    'Status publico',
    STATUS_PUBLICO_LABELS[manifestation.statusPublico] ||
      getPublicStatusLabel(manifestation.statusPublico),
  )
  pushField(lines, 'Fila atual', queueLabel)
  pushField(lines, 'Canal de origem', manifestation.canalOrigem)
  pushField(lines, 'Area responsavel', areaNome || 'Ouvidoria')
  pushField(lines, 'Responsavel atual', responsavelNome || 'Nao atribuido')
  pushField(lines, 'Abertura', formatDate(manifestation.criadoEm))
  pushField(lines, 'Ultima atualizacao', formatDate(manifestation.atualizadoEm))
  pushField(lines, 'Prazo inicial', formatDate(manifestation.prazoRespostaInicial))
  pushField(lines, 'Prazo final', formatDate(manifestation.prazoRespostaFinal))
  pushField(lines, 'Resposta inicial enviada em', formatDate(manifestation.dataRespostaInicial))
  pushField(lines, 'Resposta conclusiva enviada em', formatDate(manifestation.dataRespostaFinal))
  pushField(lines, 'Prorrogada', manifestation.prorrogada ? 'Sim' : 'Nao')
  pushField(lines, 'Justificativa de prorrogacao', manifestation.justificativaProrrogacao)

  pushSection(lines, 'Sintese objetiva do relato')
  pushField(lines, 'Data do ocorrido', formatDate(manifestation.dataOcorrido))
  pushField(lines, 'Local do ocorrido', manifestation.localOcorrido)
  pushField(lines, 'Pessoas ou areas envolvidas', manifestation.pessoasEnvolvidas)
  pushField(lines, 'Tentativa anterior', manifestation.tentativaAnterior)
  pushField(lines, 'Descricao da tentativa', manifestation.descricaoTentativa)
  pushField(lines, 'Situacao em andamento', manifestation.situacaoEmAndamento)
  pushField(lines, 'Risco imediato', manifestation.riscoImediato)
  pushParagraph(lines, manifestation.descricao)

  pushSection(lines, 'Manifestante')
  pushField(
    lines,
    'Identificacao',
    IDENTIFICACAO_LABELS[manifestation.manifestante.tipoIdentificacao],
  )
  pushField(lines, 'Nome', manifestation.manifestante.nome)
  pushField(lines, 'CPF/CNPJ', manifestation.manifestante.cpfCnpj)
  pushField(lines, 'E-mail', manifestation.manifestante.email)
  pushField(lines, 'Telefone', manifestation.manifestante.telefone)
  pushField(
    lines,
    'Relacao com a empresa',
    manifestation.manifestante.relacaoArtGlass
      ? RELACAO_LABELS[manifestation.manifestante.relacaoArtGlass]
      : undefined,
  )
  pushField(lines, 'Preferencia de retorno', manifestation.manifestante.desejaRetorno)
  pushField(lines, 'Melhor horario', manifestation.manifestante.melhorHorario)

  pushSection(lines, 'Anexos')
  if (manifestation.anexos.length === 0) {
    pushField(lines, 'Registros', 'Nenhum anexo cadastrado')
  } else {
    manifestation.anexos.forEach((attachment, index) => {
      pushField(lines, `Anexo ${index + 1}`, attachment.nomeArquivo)
      pushField(
        lines,
        'Detalhes',
        `${attachment.mimeType} | ${attachment.tamanho} bytes | ${attachment.visibilidade} | ${formatDate(attachment.criadoEm)}`,
      )
      pushField(lines, 'Enviado por', attachment.enviadoPor)
    })
  }

  pushSection(lines, 'Comunicacoes ao manifestante')
  if (manifestation.comunicacoes.length === 0) {
    pushField(lines, 'Registros', 'Nenhuma comunicacao registrada')
  } else {
    manifestation.comunicacoes.forEach((communication, index) => {
      pushField(lines, `Comunicacao ${index + 1}`, communication.assunto)
      pushField(
        lines,
        'Cabecalho',
        `${communication.tipo} | De ${communication.de} para ${communication.para} | ${formatDate(communication.enviadaEm)}`,
      )
      pushParagraph(lines, communication.corpo)
    })
  }

  pushSection(lines, 'Comentarios internos')
  if (manifestation.comentarios.length === 0) {
    pushField(lines, 'Registros', 'Nenhum comentario interno registrado')
  } else {
    manifestation.comentarios
      .slice()
      .sort((left, right) => new Date(left.criadoEm).getTime() - new Date(right.criadoEm).getTime())
      .forEach((comment, index) => {
        pushField(
          lines,
          `Comentario ${index + 1}`,
          `${comment.autor} | ${comment.perfil} | ${formatDate(comment.criadoEm)}`,
        )
        pushParagraph(lines, comment.corpo)
      })
  }

  pushSection(lines, 'Cronologia processual completa')
  manifestation.timeline
    .slice()
    .sort((left, right) => new Date(left.data).getTime() - new Date(right.data).getTime())
    .forEach((entry, index) => {
      pushField(
        lines,
        `Evento ${index + 1}`,
        `${formatDate(entry.data)} | ${entry.visibilidade} | ${entry.usuario} | ${entry.acao}`,
      )
      pushParagraph(lines, entry.descricao)
    })

  pushDivider(lines, 12)
  pushSection(lines, 'Pesquisa de satisfacao')
  if (!survey) {
    pushField(lines, 'Registros', 'Nenhuma pesquisa respondida')
  } else {
    pushField(lines, 'Nota geral', String(survey.notaGeral))
    pushField(lines, 'Clareza', String(survey.clareza))
    pushField(lines, 'Tempo de resposta', String(survey.tempoResposta))
    pushField(lines, 'Respeito', String(survey.respeito))
    pushField(lines, 'Demanda compreendida', survey.demandaCompreendida)
    pushField(lines, 'Deseja reabrir', survey.desejaReabrir ? 'Sim' : 'Nao')
    pushField(lines, 'Comentario', survey.comentario)
    pushField(lines, 'Respondida em', formatDate(survey.criadoEm))
  }

  return lines
}

function buildTextCommand(
  text: string,
  x: number,
  y: number,
  font: 'regular' | 'bold',
  size: number,
) {
  const fontName = font === 'bold' ? 'F2' : 'F1'
  return `BT /${fontName} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${escapePdfText(text)}) Tj ET`
}

function buildPdfDocument(
  title: string,
  subtitle: string,
  lines: ReportLine[],
) {
  const pages: string[] = []
  let commands: string[] = []
  let currentY = BODY_TOP

  const startPage = () => {
    commands = [
      buildTextCommand(title, MARGIN_X, HEADER_TOP, 'bold', 18),
      buildTextCommand(subtitle, MARGIN_X, HEADER_TOP - 22, 'regular', 10),
      `${MARGIN_X} ${HEADER_TOP - 30} m ${PAGE_WIDTH - MARGIN_X} ${HEADER_TOP - 30} l S`,
    ]
    currentY = BODY_TOP
  }

  const finishPage = (pageNumber: number) => {
    commands.push(
      buildTextCommand(`Pagina ${pageNumber}`, PAGE_WIDTH - 110, FOOTER_Y, 'regular', 9),
      buildTextCommand('Documento gerado pelo sistema de Ouvidoria ArtGlass.', MARGIN_X, FOOTER_Y, 'regular', 9),
    )
    pages.push(commands.join('\n'))
  }

  startPage()

  for (const line of lines) {
    if (line.kind === 'divider') {
      currentY -= line.spacingBefore || 0

      if (currentY < BOTTOM_LIMIT) {
        finishPage(pages.length + 1)
        startPage()
      }

      commands.push(
        `${MARGIN_X} ${currentY.toFixed(2)} m ${PAGE_WIDTH - MARGIN_X} ${currentY.toFixed(2)} l S`,
      )
      currentY -= 10
      continue
    }

    const font = line.font || 'regular'
    const size = line.size || 11
    const lineHeight = Math.max(14, size + 3)
    const indent = line.indent || 0
    const spacingBefore = line.spacingBefore || 0
    const availableWidth = PAGE_WIDTH - MARGIN_X * 2 - indent
    const maxChars = Math.max(20, Math.floor(availableWidth / (size * 0.53)))
    const wrappedLines = wrapText(line.text || '', maxChars)

    currentY -= spacingBefore

    for (const wrappedLine of wrappedLines) {
      if (currentY < BOTTOM_LIMIT) {
        finishPage(pages.length + 1)
        startPage()
      }

      commands.push(
        buildTextCommand(wrappedLine || ' ', MARGIN_X + indent, currentY, font, size),
      )
      currentY -= lineHeight
    }
  }

  finishPage(pages.length + 1)

  const objects: string[] = []
  const pageObjectIds: number[] = []
  const contentObjectIds: number[] = []

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>'
  objects[2] = ''
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'

  let nextObjectId = 5
  for (const pageContent of pages) {
    const pageObjectId = nextObjectId++
    const contentObjectId = nextObjectId++
    pageObjectIds.push(pageObjectId)
    contentObjectIds.push(contentObjectId)
    objects[pageObjectId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectId} 0 R >>`
    objects[contentObjectId] =
      `<< /Length ${Buffer.byteLength(pageContent, 'utf8')} >>\nstream\n${pageContent}\nendstream`
  }

  objects[2] = `<< /Type /Pages /Count ${pageObjectIds.length} /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] >>`

  const chunks: string[] = ['%PDF-1.4\n']
  const offsets: number[] = [0]
  let currentOffset = chunks[0].length

  for (let objectId = 1; objectId < objects.length; objectId += 1) {
    const objectBody = `${objectId} 0 obj\n${objects[objectId]}\nendobj\n`
    offsets[objectId] = currentOffset
    chunks.push(objectBody)
    currentOffset += Buffer.byteLength(objectBody, 'utf8')
  }

  const xrefOffset = currentOffset
  const xrefLines = [`xref\n0 ${objects.length}\n`, '0000000000 65535 f \n']
  for (let objectId = 1; objectId < objects.length; objectId += 1) {
    xrefLines.push(`${String(offsets[objectId]).padStart(10, '0')} 00000 n \n`)
  }

  const trailer =
    `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return Buffer.from(chunks.join('') + xrefLines.join('') + trailer, 'utf8')
}

export function buildManifestationDossierPdf(input: ReportInput) {
  const lines = buildReportLines(input)
  const title = `${normalizePdfText(input.companyName)} - Dossie da Manifestacao`
  const subtitle = `Protocolo ${normalizePdfText(input.manifestation.protocolo)} | Gerado em ${normalizePdfText(formatDate(new Date().toISOString()))}`
  return buildPdfDocument(title, subtitle, lines)
}
