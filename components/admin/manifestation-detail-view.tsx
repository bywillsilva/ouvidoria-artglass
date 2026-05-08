'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Clock,
  Download,
  FileText,
  Loader2,
  MessageSquare,
  Send,
  Shield,
} from 'lucide-react'
import { toast } from 'sonner'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  ASSUNTO_LABELS,
  COMPLEXIDADE_LABELS,
  IDENTIFICACAO_LABELS,
  NATUREZA_COLORS,
  NATUREZA_LABELS,
  PRIORIDADE_COLORS,
  PRIORIDADE_LABELS,
  RELACAO_LABELS,
  STATUS_COLORS,
} from '@/lib/constants'
import { getPublicStatusLabel, mapInternalToPublicStatus } from '@/lib/public-status'
import {
  canUserEditCaseRouting,
  canUserEditClassificationFields,
  canUserRegisterDeadlineAction,
  canUserSendManifestationCommunication,
  getAllowedWorkflowStatusDefinitions,
  getOperationalQueueForManifestation,
  getOperationalQueueForStatus,
  getOperationalQueueOrder,
  getOperationalQueueLabel,
  getWorkflowStatusDefinition,
  getWorkflowStatusLabel,
  isUserEligibleForOperationalQueue,
} from '@/lib/workflow-routing'
import { ADMIN_PROFILE_LABELS } from '@/lib/admin-access'
import type { WorkflowLane, WorkflowStatus as InternalWorkflowStatus } from '@/lib/server/schema'
import type {
  AdminCapability,
  AssuntoManifestacao,
  Complexidade,
  NaturezaManifestacao,
  PerfilUsuario,
  Prioridade,
  StatusPublico,
} from '@/lib/types'
import { cn } from '@/lib/utils'

type WorkflowStatus = InternalWorkflowStatus

type ManifestationRecord = {
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
  titulo: string
  descricao: string
  dataOcorrido?: string
  localOcorrido?: string
  pessoasEnvolvidas?: string
  tentativaAnterior: string
  descricaoTentativa?: string
  situacaoEmAndamento: string
  riscoImediato: string
  manifestante: {
    tipoIdentificacao: 'identificada' | 'anonima' | 'sigilosa'
    nome?: string
    cpfCnpj?: string
    email?: string
    telefone?: string
    relacaoArtGlass?: keyof typeof RELACAO_LABELS
    desejaRetorno: string
    melhorHorario?: string
  }
  areaResponsavelId?: string
  responsavelAtualId?: string
  prazoRespostaInicial: string
  prazoRespostaFinal: string
  dataRespostaInicial?: string
  dataRespostaFinal?: string
  prorrogada: boolean
  justificativaProrrogacao?: string
  anexos: Array<{
    id: string
    nomeArquivo: string
    mimeType: string
    tamanho: number
    visibilidade: string
    enviadoPor: string
    criadoEm: string
  }>
  comunicacoes: Array<{
    id: string
    tipo: 'inicial' | 'intermediaria' | 'conclusiva' | 'esclarecimento'
    assunto: string
    corpo: string
    de: string
    para: string
    enviadaEm?: string
  }>
  comentarios: Array<{
    id: string
    autor: string
    perfil: PerfilUsuario
    corpo: string
    criadoEm: string
  }>
  timeline: Array<{
    id: string
    data: string
    usuario: string
    acao: string
    descricao: string
    visibilidade: 'publica' | 'interna'
  }>
  criadoEm: string
  atualizadoEm: string
  concluidoEm?: string
}

type MetadataResponse = {
  manifestation: ManifestationRecord
  departamentos: Array<{ id: string; nome: string }>
  usuarios: Array<{ id: string; nome: string; perfil: PerfilUsuario; areaId?: string }>
  currentUser: {
    id: string
    nome: string
    email: string
    perfil: PerfilUsuario
    areaId?: string
    capabilities: AdminCapability[]
  }
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString('pt-BR') : '-'
}

function bytesToLabel(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`
  }
  return `${bytes} B`
}

function humanizeSimple(value?: string) {
  if (!value) {
    return '-'
  }

  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function DetailField({
  label,
  value,
  hint,
  className,
}: {
  label: string
  value?: ReactNode
  hint?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('rounded-xl border bg-muted/20 p-4', className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-2 text-sm font-medium text-foreground">{value || '-'}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  )
}

export function ManifestationDetailView({
  id,
  backHref,
  mode,
}: {
  id: string
  backHref: string
  mode: 'manifestacoes' | 'denuncias' | 'areas-tecnicas'
}) {
  const router = useRouter()
  const [data, setData] = useState<MetadataResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [comment, setComment] = useState('')
  const [communicationType, setCommunicationType] = useState<
    'inicial' | 'intermediaria' | 'conclusiva' | 'esclarecimento'
  >('intermediaria')
  const [communicationSubject, setCommunicationSubject] = useState('')
  const [communicationBody, setCommunicationBody] = useState('')
  const [statusValue, setStatusValue] = useState<WorkflowStatus | ''>('')
  const [priorityValue, setPriorityValue] = useState<Prioridade>('media')
  const [complexityValue, setComplexityValue] = useState<Complexidade>('baixa')
  const [areaValue, setAreaValue] = useState('nao_atribuida')
  const [responsibleValue, setResponsibleValue] = useState('nao_atribuido')
  const [prorrogacao, setProrrogacao] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadCase() {
      try {
        const response = await fetch(`/api/admin/manifestacoes/${id}`, {
          cache: 'no-store',
        })
        const result = (await response.json()) as MetadataResponse

        if (!mounted) {
          return
        }

        if (!response.ok) {
          setError('Nao foi possivel carregar os detalhes desta manifestacao.')
          return
        }

        setData(result)
        setStatusValue(result.manifestation.status)
        setPriorityValue(result.manifestation.prioridade)
        setComplexityValue(result.manifestation.complexidade)
        setAreaValue(result.manifestation.areaResponsavelId || 'nao_atribuida')
        setResponsibleValue(result.manifestation.responsavelAtualId || 'nao_atribuido')
        setProrrogacao(result.manifestation.justificativaProrrogacao || '')
      } catch {
        if (mounted) {
          setError('Nao foi possivel carregar os detalhes desta manifestacao.')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadCase()
    return () => {
      mounted = false
    }
  }, [id])

  const queueValue = useMemo(
    () => (statusValue ? getOperationalQueueForStatus(statusValue) : 'ouvidoria'),
    [statusValue],
  )

  const currentQueue = useMemo(
    () => (data ? getOperationalQueueForManifestation(data.manifestation) : 'ouvidoria'),
    [data],
  )

  const allowedStatusOptions = useMemo(() => {
    if (!data) {
      return []
    }

    return getAllowedWorkflowStatusDefinitions(data.currentUser, data.manifestation)
  }, [data])

  const groupedStatusOptions = useMemo(() => {
    if (!data) {
      return []
    }

    const currentStatusDefinition = getWorkflowStatusDefinition(data.manifestation.status)
    const definitions = currentStatusDefinition
      ? [currentStatusDefinition, ...allowedStatusOptions]
      : allowedStatusOptions

    const uniqueDefinitions = Array.from(
      new Map(definitions.map((definition) => [definition.status, definition])).values(),
    )

    return getOperationalQueueOrder()
      .map((queue) => ({
        queue,
        label: getOperationalQueueLabel(queue),
        items: uniqueDefinitions.filter((definition) => definition.destinationQueue === queue),
      }))
      .filter((group) => group.items.length > 0)
  }, [allowedStatusOptions, data])

  const activeAreaUsers = useMemo(() => {
    if (!data) {
      return []
    }

    return data.usuarios.filter((user) =>
      isUserEligibleForOperationalQueue(
        user,
        queueValue,
        areaValue === 'nao_atribuida' ? undefined : areaValue,
      ),
    )
  }, [areaValue, data, queueValue])

  useEffect(() => {
    if (
      responsibleValue !== 'nao_atribuido' &&
      !activeAreaUsers.some((user) => user.id === responsibleValue)
    ) {
      setResponsibleValue('nao_atribuido')
    }
  }, [activeAreaUsers, responsibleValue])

  const canEditClassification = useMemo(() => {
    if (!data) {
      return false
    }

    return canUserEditClassificationFields(data.currentUser, data.manifestation)
  }, [data])

  const canEditRouting = useMemo(() => {
    if (!data) {
      return false
    }

    return canUserEditCaseRouting(data.currentUser, data.manifestation)
  }, [data])

  const canManageDeadlines = useMemo(() => {
    if (!data) {
      return false
    }

    return canUserRegisterDeadlineAction(data.currentUser, data.manifestation)
  }, [data])

  const canSendCommunication = useMemo(() => {
    if (!data) {
      return false
    }

    return canUserSendManifestationCommunication(data.currentUser, data.manifestation)
  }, [data])

  const canSaveClassification =
    canEditClassification ||
    canEditRouting ||
    canManageDeadlines ||
    allowedStatusOptions.length > 0
  const canQuickConclude = allowedStatusOptions.some((option) => option.status === 'concluida')
  const canSubmitSelectedStatus = statusValue
    ? allowedStatusOptions.some((option) => option.status === statusValue)
    : false

  async function refreshCase() {
    const response = await fetch(`/api/admin/manifestacoes/${id}`, {
      cache: 'no-store',
    })
    if (response.status === 403 || response.status === 404) {
      router.push(backHref)
      return
    }

    const result = (await response.json()) as MetadataResponse
    if (response.ok) {
      setData(result)
      setStatusValue(result.manifestation.status)
      setPriorityValue(result.manifestation.prioridade)
      setComplexityValue(result.manifestation.complexidade)
      setAreaValue(result.manifestation.areaResponsavelId || 'nao_atribuida')
      setResponsibleValue(result.manifestation.responsavelAtualId || 'nao_atribuido')
      setProrrogacao(result.manifestation.justificativaProrrogacao || '')
    }
  }

  async function persistClassification() {
    if (!data || !statusValue || !canSaveClassification) {
      return
    }

    setSaving(true)
    setError('')

    try {
      const payload: Record<string, string | null | undefined> = {}

      if (canSubmitSelectedStatus) {
        payload.status = statusValue
      }

      if (canEditClassification) {
        payload.prioridade = priorityValue
        payload.complexidade = complexityValue
      }

      if (canEditRouting) {
        payload.areaResponsavelId = areaValue === 'nao_atribuida' ? null : areaValue
        payload.responsavelAtualId =
          responsibleValue === 'nao_atribuido' ? null : responsibleValue
      }

      if (canManageDeadlines) {
        payload.justificativaProrrogacao = prorrogacao.trim() || undefined
      }

      const response = await fetch(`/api/admin/manifestacoes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      const result = await response.json()

      if (!response.ok) {
        const message = result.message || 'Nao foi possivel atualizar a classificacao.'
        setError(message)
        toast.error(message)
        return
      }

      await refreshCase()
      toast.success('Manifestacao atualizada com sucesso.')
    } catch {
      const message = 'Nao foi possivel atualizar a classificacao.'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function addInternalComment() {
    if (!comment.trim()) {
      return
    }

    setSaving(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/manifestacoes/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comentario: comment.trim() }),
      })
      const result = await response.json()

      if (!response.ok) {
        const message = result.message || 'Nao foi possivel registrar o comentario interno.'
        setError(message)
        toast.error(message)
        return
      }

      setComment('')
      await refreshCase()
      toast.success('Comentario interno registrado.')
    } catch {
      const message = 'Nao foi possivel registrar o comentario interno.'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function sendCommunication() {
    if (!communicationSubject.trim() || !communicationBody.trim()) {
      const message = 'Preencha assunto e conteudo da comunicacao.'
      setError(message)
      toast.error(message)
      return
    }

    setSaving(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/manifestacoes/${id}/communications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tipo: communicationType,
          assunto: communicationSubject.trim(),
          corpo: communicationBody.trim(),
        }),
      })
      const result = await response.json()

      if (!response.ok) {
        const message = result.message || 'Nao foi possivel registrar a comunicacao.'
        setError(message)
        toast.error(message)
        return
      }

      setCommunicationSubject('')
      setCommunicationBody('')
      await refreshCase()
      toast.success('Comunicacao registrada com sucesso.')
    } catch {
      const message = 'Nao foi possivel registrar a comunicacao.'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-lg border bg-card px-5 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Carregando caso...</span>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Falha ao carregar</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!data) {
    return null
  }

  const manifestation = data.manifestation
  const currentUser = data.currentUser
  const responsible = data.usuarios.find((user) => user.id === manifestation.responsavelAtualId)
  const area = data.departamentos.find((department) => department.id === manifestation.areaResponsavelId)
  const queueLabel = getOperationalQueueLabel(currentQueue)
  const nextQueueLabel = getOperationalQueueLabel(queueValue)
  const currentStatusLabel = getWorkflowStatusLabel(manifestation.status)
  const viewerRoleLabel = ADMIN_PROFILE_LABELS[currentUser.perfil] || humanizeSimple(currentUser.perfil)
  const selectedStatusLabel = statusValue ? getWorkflowStatusLabel(statusValue) : currentStatusLabel
  const currentPublicStatusLabel = getPublicStatusLabel(manifestation.statusPublico)
  const projectedPublicStatus = statusValue
    ? mapInternalToPublicStatus(statusValue)
    : manifestation.statusPublico
  const projectedPublicStatusLabel = getPublicStatusLabel(projectedPublicStatus)
  const elapsedReference = manifestation.concluidoEm
    ? new Date(manifestation.concluidoEm)
    : new Date()
  const openedAt = new Date(manifestation.criadoEm)
  const openDays = Math.max(
    0,
    Math.ceil((elapsedReference.getTime() - openedAt.getTime()) / (1000 * 60 * 60 * 24)),
  )
  const timelinePublica = manifestation.timeline.filter((entry) => entry.visibilidade === 'publica')
  const timelineInterna = manifestation.timeline.length - timelinePublica.length
  const ultimaComunicacao =
    manifestation.comunicacoes.find((communication) => communication.enviadaEm)?.enviadaEm ||
    manifestation.comunicacoes.at(-1)?.enviadaEm

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{manifestation.protocolo}</h1>
              <Badge variant="outline" className={NATUREZA_COLORS[manifestation.natureza]}>
                {NATUREZA_LABELS[manifestation.natureza]}
              </Badge>
              <Badge variant="outline" className={STATUS_COLORS[manifestation.status] || 'bg-muted'}>
                {currentStatusLabel}
              </Badge>
              <Badge variant="outline" className={PRIORIDADE_COLORS[manifestation.prioridade]}>
                {PRIORIDADE_LABELS[manifestation.prioridade]}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Aberta em {formatDate(manifestation.criadoEm)} | Fila atual {queueLabel}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <a href={`/api/admin/manifestacoes/${manifestation.id}/report`}>
              <Download className="mr-2 h-4 w-4" />
              Baixar PDF
            </a>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setStatusValue('concluida')
              toast.info('Status "Concluida" selecionado. Salve para confirmar a movimentacao.')
            }}
            disabled={!canQuickConclude}
          >
            Marcar concluida
          </Button>
          <Button onClick={persistClassification} disabled={saving || !canSaveClassification}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar alteracoes'
            )}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Operacao nao concluida</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {mode === 'denuncias' && (
        <Alert className="border-committee/40 bg-committee/5">
          <Shield className="h-4 w-4" />
          <AlertTitle>Ambiente restrito</AlertTitle>
          <AlertDescription>
            Denuncias exigem sigilo, rastreabilidade e nao exposicao de medidas internas ao
            manifestante.
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-4">
          <CardDescription>Painel operacional do caso</CardDescription>
          <CardTitle className="text-lg">{manifestation.titulo}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <DetailField
              label="Fila atual"
              value={queueLabel}
              hint={`Status: ${currentStatusLabel}`}
            />
            <DetailField
              label="Responsavel atual"
              value={responsible?.nome || 'Nao atribuido'}
              hint={area?.nome || 'Ouvidoria'}
            />
            <DetailField
              label="Classificacao"
              value={NATUREZA_LABELS[manifestation.natureza]}
              hint={`${COMPLEXIDADE_LABELS[manifestation.complexidade]} | ${ASSUNTO_LABELS[manifestation.assunto]}`}
            />
            <DetailField
              label="Manifestante"
              value={manifestation.manifestante.nome || 'Manifestacao anonima'}
              hint={IDENTIFICACAO_LABELS[manifestation.manifestante.tipoIdentificacao]}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <DetailField label="Prazo inicial" value={formatDate(manifestation.prazoRespostaInicial)} />
            <DetailField label="Prazo final" value={formatDate(manifestation.prazoRespostaFinal)} />
            <DetailField
              label="Risco imediato"
              value={humanizeSimple(manifestation.riscoImediato)}
              hint={PRIORIDADE_LABELS[manifestation.prioridade]}
            />
            <DetailField
              label="Usuario em consulta"
              value={currentUser.nome}
              hint={viewerRoleLabel}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="resumo" className="space-y-6">
        <TabsList className="sticky top-4 z-10 flex h-auto w-full flex-nowrap justify-start gap-2 overflow-x-auto rounded-2xl border border-border/70 bg-background/95 p-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <TabsTrigger
            className="whitespace-nowrap rounded-xl border border-transparent px-4 py-2 data-[state=active]:border-primary/20 data-[state=active]:bg-primary/10"
            value="resumo"
          >
            Resumo
          </TabsTrigger>
          <TabsTrigger
            className="whitespace-nowrap rounded-xl border border-transparent px-4 py-2 data-[state=active]:border-primary/20 data-[state=active]:bg-primary/10"
            value="classificacao"
          >
            Classificacao
          </TabsTrigger>
          <TabsTrigger
            className="whitespace-nowrap rounded-xl border border-transparent px-4 py-2 data-[state=active]:border-primary/20 data-[state=active]:bg-primary/10"
            value="tratativas"
          >
            Tratativas
          </TabsTrigger>
          <TabsTrigger
            className="whitespace-nowrap rounded-xl border border-transparent px-4 py-2 data-[state=active]:border-primary/20 data-[state=active]:bg-primary/10"
            value="anexos"
          >
            Anexos
          </TabsTrigger>
          <TabsTrigger
            className="whitespace-nowrap rounded-xl border border-transparent px-4 py-2 data-[state=active]:border-primary/20 data-[state=active]:bg-primary/10"
            value="comunicacoes"
          >
            Comunicacoes
          </TabsTrigger>
          <TabsTrigger
            className="whitespace-nowrap rounded-xl border border-transparent px-4 py-2 data-[state=active]:border-primary/20 data-[state=active]:bg-primary/10"
            value="prazos"
          >
            Prazos
          </TabsTrigger>
          <TabsTrigger
            className="whitespace-nowrap rounded-xl border border-transparent px-4 py-2 data-[state=active]:border-primary/20 data-[state=active]:bg-primary/10"
            value="auditoria"
          >
            Auditoria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
            <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>Relato detalhado</CardTitle>
                <CardDescription>{manifestation.titulo}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <DetailField
                    label="Assunto principal"
                    value={ASSUNTO_LABELS[manifestation.assunto]}
                    hint={NATUREZA_LABELS[manifestation.natureza]}
                  />
                  <DetailField
                    label="Data do ocorrido"
                    value={formatDate(manifestation.dataOcorrido)}
                  />
                  <DetailField label="Local" value={manifestation.localOcorrido || '-'} />
                  <DetailField
                    label="Risco imediato"
                    value={humanizeSimple(manifestation.riscoImediato)}
                    hint={PRIORIDADE_LABELS[manifestation.prioridade]}
                  />
                </div>

                <div className="rounded-2xl border border-border/70 bg-muted/10 p-5">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/90">
                    {manifestation.descricao}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <DetailField
                    label="Pessoas ou areas envolvidas"
                    value={manifestation.pessoasEnvolvidas || '-'}
                  />
                  <DetailField
                    label="Situacao em andamento"
                    value={humanizeSimple(manifestation.situacaoEmAndamento)}
                  />
                </div>

                <DetailField
                  label="Tentativa anterior de solucao"
                  value={humanizeSimple(manifestation.tentativaAnterior)}
                  hint={manifestation.descricaoTentativa || 'Sem detalhamento adicional registrado.'}
                />
              </CardContent>
            </Card>

            <div className="space-y-6 xl:sticky xl:top-28 xl:self-start">
              <Card className="border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Manifestante</CardTitle>
                  <CardDescription>Dados disponiveis para contato e contextualizacao.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <DetailField
                    label="Identificacao"
                    value={IDENTIFICACAO_LABELS[manifestation.manifestante.tipoIdentificacao]}
                    className="bg-background"
                  />
                  <DetailField
                    label="Relacao com a ArtGlass"
                    value={
                      manifestation.manifestante.relacaoArtGlass
                        ? RELACAO_LABELS[manifestation.manifestante.relacaoArtGlass]
                        : '-'
                    }
                    className="bg-background"
                  />
                  <DetailField
                    label="Nome"
                    value={manifestation.manifestante.nome || '-'}
                    className="bg-background sm:col-span-2"
                  />
                  <DetailField
                    label="E-mail"
                    value={manifestation.manifestante.email || '-'}
                    className="bg-background"
                  />
                  <DetailField
                    label="Telefone"
                    value={manifestation.manifestante.telefone || '-'}
                    className="bg-background"
                  />
                  <DetailField
                    label="Preferencia de retorno"
                    value={humanizeSimple(manifestation.manifestante.desejaRetorno)}
                    hint={manifestation.manifestante.melhorHorario || 'Sem horario preferencial informado.'}
                    className="bg-background sm:col-span-2"
                  />
                </CardContent>
              </Card>

              <Card className="border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Contexto processual</CardTitle>
                  <CardDescription>Leitura sintetica para instrucao, resposta e prova.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <DetailField
                    label="Protocolo"
                    value={manifestation.protocolo}
                    hint={`Aberta em ${formatDate(manifestation.criadoEm)}`}
                    className="bg-background"
                  />
                  <DetailField
                    label="Ultima atualizacao"
                    value={formatDate(manifestation.atualizadoEm)}
                    hint="Movimentacao administrativa mais recente do caso."
                    className="bg-background"
                  />
                  <DetailField
                    label="Anexos cadastrados"
                    value={String(manifestation.anexos.length)}
                    hint={
                      manifestation.anexos.length > 0
                        ? 'Os arquivos completos estao disponiveis na aba de anexos.'
                        : 'Nao ha arquivos anexados neste caso.'
                    }
                    className="bg-background"
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="classificacao" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.75fr)_320px]">
            <div className="space-y-6 xl:sticky xl:top-28 xl:self-start">
              <Card className="border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle>Classificacao principal</CardTitle>
                  <CardDescription>
                    A natureza e os atributos basicos do caso ficam concentrados aqui.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Natureza atual</Label>
                    <Input value={NATUREZA_LABELS[manifestation.natureza]} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Natureza original</Label>
                    <Input value={NATUREZA_LABELS[manifestation.naturezaOriginal]} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Assunto principal</Label>
                    <Input value={ASSUNTO_LABELS[manifestation.assunto]} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Origem</Label>
                    <Input
                      value={IDENTIFICACAO_LABELS[manifestation.manifestante.tipoIdentificacao]}
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Complexidade</Label>
                    <Select
                      value={complexityValue}
                      onValueChange={(value) => setComplexityValue(value as Complexidade)}
                      disabled={!canEditClassification}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(COMPLEXIDADE_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Prioridade</Label>
                    <Select
                      value={priorityValue}
                      onValueChange={(value) => setPriorityValue(value as Prioridade)}
                      disabled={!canEditClassification}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PRIORIDADE_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle>Encaminhamento operacional</CardTitle>
                  <CardDescription>
                    O status define a fila seguinte. Area e responsavel so podem ser ajustados por quem
                    possui governanca sobre a distribuicao.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Status operacional</Label>
                    <Select
                      value={statusValue}
                      onValueChange={(value) => setStatusValue(value as WorkflowStatus)}
                      disabled={!canSaveClassification}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {groupedStatusOptions.map((group) => (
                          <SelectGroup key={group.queue}>
                            <SelectLabel>{group.label}</SelectLabel>
                            {group.items.map((item) => (
                              <SelectItem key={item.status} value={item.status}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Status atual: {currentStatusLabel}. Se confirmado, o caso seguira para{' '}
                      <strong>{nextQueueLabel}</strong>.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Status publico ao manifestante: <strong>{projectedPublicStatusLabel}</strong>.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Area responsavel</Label>
                      <Select
                        value={areaValue}
                        onValueChange={setAreaValue}
                        disabled={!canEditRouting}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nao_atribuida">Nao atribuida</SelectItem>
                          {data.departamentos.map((department) => (
                            <SelectItem key={department.id} value={department.id}>
                              {department.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Ao definir uma area ainda na Ouvidoria, o sistema prepara o envio para a fila
                        tecnica ao salvar.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Responsavel atual</Label>
                      <Select
                        value={responsibleValue}
                        onValueChange={setResponsibleValue}
                        disabled={!canEditRouting}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nao_atribuido">Nao atribuido</SelectItem>
                          {activeAreaUsers.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle>Governanca de prazo</CardTitle>
                  <CardDescription>
                    Use esta justificativa quando houver prorrogacao ou necessidade de registro
                    gerencial do prazo.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="prorrogacao">Justificativa de prorrogacao</Label>
                    <Textarea
                      id="prorrogacao"
                      rows={4}
                      value={prorrogacao}
                      onChange={(event) => setProrrogacao(event.target.value)}
                      placeholder="Informe a justificativa interna quando houver necessidade de prorrogacao."
                      disabled={!canManageDeadlines}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={persistClassification} disabled={saving || !canSaveClassification}>
                      Salvar classificacao
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              {!canEditClassification && !canEditRouting && allowedStatusOptions.length > 0 && (
                <Alert>
                  <AlertTitle>Edicao guiada por fila</AlertTitle>
                  <AlertDescription>
                    Este perfil movimenta apenas os status permitidos para a fila{' '}
                    <strong>{queueLabel}</strong>. Reclassificacao estrutural e redistribuicao seguem
                    com a Ouvidoria ou o administrador.
                  </AlertDescription>
                </Alert>
              )}

              <Card className="border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Impacto da movimentacao</CardTitle>
                  <CardDescription>Resumo objetivo do que muda ao confirmar a selecao.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <DetailField label="Fila atual" value={queueLabel} className="bg-background" />
                  <DetailField
                    label="Status atual"
                    value={currentStatusLabel}
                    className="bg-background"
                  />
                  <DetailField
                    label="Status selecionado"
                    value={selectedStatusLabel}
                    className="bg-background"
                  />
                  <DetailField
                    label="Status publico atual"
                    value={currentPublicStatusLabel}
                    className="bg-background"
                  />
                  <DetailField
                    label="Status publico apos salvar"
                    value={projectedPublicStatusLabel}
                    hint="Essa sera a informacao visivel no acompanhamento do protocolo."
                    className="bg-background"
                  />
                  <DetailField
                    label="Fila apos salvar"
                    value={nextQueueLabel}
                    hint={`${activeAreaUsers.length} responsavel(is) disponivel(is) nesta etapa.`}
                    className="bg-background"
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tratativas" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
            <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>Timeline interna</CardTitle>
                <CardDescription>
                  Historico consolidado de movimentacoes, validacoes e interacoes de bastidor.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {manifestation.timeline.map((entry, index) => (
                  <div key={entry.id} className="relative flex gap-4">
                    {index < manifestation.timeline.length - 1 && (
                      <div className="absolute left-[15px] top-8 h-full w-0.5 bg-border" />
                    )}
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-xs text-primary">
                        {entry.usuario.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 rounded-2xl border border-border/70 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-foreground">{entry.acao}</span>
                            <Badge variant="outline">{humanizeSimple(entry.visibilidade)}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{entry.descricao}</p>
                          <p className="text-xs text-muted-foreground">Responsavel: {entry.usuario}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{formatDate(entry.data)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-6 xl:sticky xl:top-28 xl:self-start">
              <Card className="border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Registro interno</CardTitle>
                  <CardDescription>
                    Utilize este campo para orientar a proxima etapa ou registrar conclusoes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    rows={5}
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Registre orientacoes, conclusoes ou pendencias internas."
                  />
                  <Button className="w-full" onClick={addInternalComment} disabled={saving}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Adicionar comentario
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Observacoes ja registradas</CardTitle>
                  <CardDescription>
                    Comentarios internos disponiveis para a equipe habilitada neste caso.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {manifestation.comentarios.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhum comentario interno registrado.</p>
                  )}
                  {manifestation.comentarios.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-border/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">{item.autor}</p>
                        <Badge variant="outline">{humanizeSimple(item.perfil)}</Badge>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">{item.corpo}</p>
                      <p className="mt-3 text-xs text-muted-foreground">{formatDate(item.criadoEm)}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="anexos" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
            <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Governanca dos anexos</CardTitle>
                <CardDescription>
                  Arquivos com rastreabilidade de envio e controle de visibilidade.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <DetailField
                  label="Arquivos cadastrados"
                  value={String(manifestation.anexos.length)}
                  className="bg-background"
                />
                <DetailField
                  label="Acesso"
                  value={mode === 'denuncias' ? 'Restrito' : 'Controlado'}
                  hint="Cada download deve permanecer vinculado ao caso."
                  className="bg-background"
                />
                <DetailField
                  label="Consulta externa"
                  value="Nao permitida"
                  hint="Os anexos ficam disponiveis apenas no painel administrativo."
                  className="bg-background"
                />
              </CardContent>
            </Card>

            <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>Anexos do caso</CardTitle>
                <CardDescription>
                  Arquivos mantidos com controle de acesso e registro de envio.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {manifestation.anexos.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nao ha anexos cadastrados.</p>
                )}
                {manifestation.anexos.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex flex-col gap-4 rounded-2xl border border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{attachment.nomeArquivo}</p>
                        <p className="text-sm text-muted-foreground">
                          {attachment.mimeType} | {bytesToLabel(attachment.tamanho)} |{' '}
                          {formatDate(attachment.criadoEm)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Visibilidade: {humanizeSimple(attachment.visibilidade)} | Enviado por{' '}
                          {attachment.enviadoPor}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" asChild>
                      <a href={`/api/admin/manifestacoes/${manifestation.id}/attachments/${attachment.id}`}>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </a>
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comunicacoes" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_360px]">
            <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>Historico de comunicacoes</CardTitle>
                <CardDescription>
                  Respostas iniciais, intermediarias, conclusivas e pedidos de esclarecimento.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {manifestation.comunicacoes.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhuma comunicacao registrada.</p>
                )}
                {manifestation.comunicacoes.map((communication) => (
                  <div key={communication.id} className="rounded-2xl border border-border/70 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{humanizeSimple(communication.tipo)}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(communication.enviadaEm)}
                      </span>
                    </div>
                    <p className="mt-3 font-medium">{communication.assunto}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      De: {communication.de} | Para: {communication.para}
                    </p>
                    <Separator className="my-3" />
                    <p className="whitespace-pre-wrap text-sm leading-6">{communication.corpo}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-6 xl:sticky xl:top-28 xl:self-start">
              <Card className="border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Canal de retorno</CardTitle>
                  <CardDescription>
                    Referencias disponiveis para retorno seguro ao manifestante.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <DetailField
                    label="E-mail"
                    value={manifestation.manifestante.email || '-'}
                    className="bg-background"
                  />
                  <DetailField
                    label="Telefone"
                    value={manifestation.manifestante.telefone || '-'}
                    className="bg-background"
                  />
                  <DetailField
                    label="Preferencia"
                    value={humanizeSimple(manifestation.manifestante.desejaRetorno)}
                    hint={manifestation.manifestante.melhorHorario || 'Sem horario preferencial informado.'}
                    className="bg-background"
                  />
                  <DetailField
                    label="Ultima comunicacao"
                    value={formatDate(ultimaComunicacao)}
                    hint={`${manifestation.comunicacoes.length} comunicacao(oes) registrada(s) neste caso.`}
                    className="bg-background"
                  />
                </CardContent>
              </Card>

              <Card className="border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Nova comunicacao</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!canSendCommunication && (
                    <Alert>
                      <AlertTitle>Comunicacao controlada</AlertTitle>
                      <AlertDescription>
                        O retorno ao manifestante nesta etapa e restrito a Ouvidoria ou ao
                        administrador, quando o caso estiver na fila correta.
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={communicationType}
                      onValueChange={(value) =>
                        setCommunicationType(value as typeof communicationType)
                      }
                      disabled={!canSendCommunication}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inicial">Resposta inicial</SelectItem>
                        <SelectItem value="intermediaria">Resposta intermediaria</SelectItem>
                        <SelectItem value="conclusiva">Resposta conclusiva</SelectItem>
                        <SelectItem value="esclarecimento">Solicitacao de esclarecimentos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="communication-subject">Assunto</Label>
                    <Input
                      id="communication-subject"
                      value={communicationSubject}
                      onChange={(event) => setCommunicationSubject(event.target.value)}
                      disabled={!canSendCommunication}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="communication-body">Mensagem</Label>
                    <Textarea
                      id="communication-body"
                      rows={7}
                      value={communicationBody}
                      onChange={(event) => setCommunicationBody(event.target.value)}
                      disabled={!canSendCommunication}
                    />
                  </div>

                  <Button
                    className="w-full"
                    onClick={sendCommunication}
                    disabled={saving || !canSendCommunication}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Registrar comunicacao
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="prazos" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_340px]">
            <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>Panorama de SLA</CardTitle>
                <CardDescription>
                  Prazos principais do caso, registros de resposta e marco da ultima atualizacao.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <DetailField
                  label="Resposta inicial"
                  value={formatDate(manifestation.prazoRespostaInicial)}
                  hint={`Registrada em ${formatDate(manifestation.dataRespostaInicial)}`}
                  className="bg-background"
                />
                <DetailField
                  label="Resposta conclusiva"
                  value={formatDate(manifestation.prazoRespostaFinal)}
                  hint={`Concluida em ${formatDate(manifestation.dataRespostaFinal)}`}
                  className="bg-background"
                />
                <DetailField
                  label="Ultima atualizacao"
                  value={formatDate(manifestation.atualizadoEm)}
                  hint="Marco mais recente de alteracao do caso."
                  className="bg-background"
                />
                <DetailField
                  label="Tempo total do caso"
                  value={`${openDays} dia(s)`}
                  hint={
                    manifestation.concluidoEm
                      ? 'Contagem encerrada na data de conclusao.'
                      : 'Contagem considerando a data atual.'
                  }
                  className="bg-background"
                />
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Prorrogacao</CardTitle>
                  <CardDescription>Justificativa gerencial atualmente registrada.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <DetailField
                    label="Situacao"
                    value={manifestation.prorrogada ? 'Prorrogada' : 'Dentro do fluxo padrao'}
                    className="bg-background"
                  />
                  <DetailField
                    label="Justificativa"
                    value={manifestation.justificativaProrrogacao || '-'}
                    className="bg-background"
                  />
                </CardContent>
              </Card>

              <Card className="border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Governanca</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <DetailField
                    label="Perfil em consulta"
                    value={viewerRoleLabel}
                    className="bg-background"
                  />
                  <DetailField
                    label="Pode registrar prazo"
                    value={canManageDeadlines ? 'Sim' : 'Nao'}
                    className="bg-background"
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="auditoria" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
            <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Resumo de rastreabilidade</CardTitle>
                <CardDescription>
                  Indicadores rapidos de historico administrativo e exposicao publica.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <DetailField
                  label="Eventos totais"
                  value={String(manifestation.timeline.length)}
                  className="bg-background"
                />
                <DetailField
                  label="Eventos publicos"
                  value={String(timelinePublica.length)}
                  className="bg-background"
                />
                <DetailField
                  label="Eventos internos"
                  value={String(timelineInterna)}
                  className="bg-background"
                />
                <DetailField
                  label="Ultimo registro"
                  value={formatDate(manifestation.atualizadoEm)}
                  hint={queueLabel}
                  className="bg-background"
                />
              </CardContent>
            </Card>

            <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>Trilha de auditoria</CardTitle>
                <CardDescription>
                  Registro cronologico das movimentacoes publicas e internas associadas ao caso.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {manifestation.timeline.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex flex-col gap-3 rounded-2xl border border-border/70 p-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{entry.acao}</p>
                        <Badge variant="outline">{humanizeSimple(entry.visibilidade)}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{entry.descricao}</p>
                      <p className="text-xs text-muted-foreground">Usuario: {entry.usuario}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {formatDate(entry.data)}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
