'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Info,
  Upload,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { FormStepIndicator } from './form-step-indicator'
import {
  ASSUNTO_LABELS,
  IDENTIFICACAO_DESCRICOES,
  IDENTIFICACAO_LABELS,
  NATUREZA_DESCRICOES,
  NATUREZA_LABELS,
  RELACAO_LABELS,
} from '@/lib/constants'
import type {
  AssuntoManifestacao,
  NaturezaManifestacao,
  RelacaoArtGlass,
  TipoIdentificacao,
} from '@/lib/types'

const STEPS = ['Identificacao', 'Classificacao', 'Relato', 'Evidencias', 'Contato', 'Revisao']

type ReturnPreference = 'email' | 'telefone' | 'nao' | 'anonimo' | ''

interface FormState {
  tipoIdentificacao: TipoIdentificacao | ''
  nome: string
  cpfCnpj: string
  email: string
  telefone: string
  relacaoArtGlass: RelacaoArtGlass | ''
  natureza: NaturezaManifestacao | ''
  assunto: AssuntoManifestacao | ''
  titulo: string
  descricao: string
  dataOcorrido: string
  localOcorrido: string
  pessoasEnvolvidas: string
  tentativaAnterior: 'sim' | 'nao' | 'nao_aplica' | ''
  descricaoTentativa: string
  situacaoEmAndamento: 'sim' | 'nao' | 'nao_sei' | ''
  riscoImediato: 'sim' | 'nao' | 'nao_sei' | ''
  anexos: File[]
  linksEvidencias: string
  observacoesAnexos: string
  desejaRetorno: ReturnPreference
  melhorHorario: string
  consentimentoLgpd: boolean
  declaracaoVerdade: boolean
}

const initialState: FormState = {
  tipoIdentificacao: '',
  nome: '',
  cpfCnpj: '',
  email: '',
  telefone: '',
  relacaoArtGlass: '',
  natureza: '',
  assunto: '',
  titulo: '',
  descricao: '',
  dataOcorrido: '',
  localOcorrido: '',
  pessoasEnvolvidas: '',
  tentativaAnterior: '',
  descricaoTentativa: '',
  situacaoEmAndamento: '',
  riscoImediato: '',
  anexos: [],
  linksEvidencias: '',
  observacoesAnexos: '',
  desejaRetorno: '',
  melhorHorario: '',
  consentimentoLgpd: false,
  declaracaoVerdade: false,
}

export function ManifestationForm() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [state, setState] = useState<FormState>(initialState)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setState((current) => ({ ...current, [field]: value }))
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }))
    }
  }

  function validate(currentStep: number) {
    const nextErrors: Partial<Record<keyof FormState, string>> = {}

    if (currentStep === 1) {
      if (!state.tipoIdentificacao) {
        nextErrors.tipoIdentificacao = 'Selecione como deseja se identificar.'
      }
      if (state.tipoIdentificacao !== 'anonima') {
        if (!state.nome.trim()) {
          nextErrors.nome = 'Informe seu nome.'
        }
        if (!state.email.trim()) {
          nextErrors.email = 'Informe seu e-mail.'
        }
      }
    }

    if (currentStep === 2) {
      if (!state.natureza) {
        nextErrors.natureza = 'Selecione a natureza da manifestacao.'
      }
      if (!state.assunto) {
        nextErrors.assunto = 'Selecione o assunto principal.'
      }
    }

    if (currentStep === 3) {
      if (!state.titulo.trim()) {
        nextErrors.titulo = 'Informe um titulo resumido.'
      }
      if (!state.descricao.trim()) {
        nextErrors.descricao = 'Descreva a manifestacao.'
      }
      if (!state.tentativaAnterior) {
        nextErrors.tentativaAnterior = 'Selecione uma opcao.'
      }
      if (!state.situacaoEmAndamento) {
        nextErrors.situacaoEmAndamento = 'Selecione uma opcao.'
      }
      if (!state.riscoImediato) {
        nextErrors.riscoImediato = 'Selecione uma opcao.'
      }
    }

    if (currentStep === 5) {
      if (state.tipoIdentificacao !== 'anonima' && !state.desejaRetorno) {
        nextErrors.desejaRetorno = 'Selecione a preferencia de retorno.'
      }
      if (!state.consentimentoLgpd) {
        nextErrors.consentimentoLgpd = 'E necessario autorizar o tratamento dos dados.'
      }
      if (!state.declaracaoVerdade) {
        nextErrors.declaracaoVerdade = 'Confirme a veracidade das informacoes.'
      }
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function handleNext() {
    if (validate(step)) {
      setStep((current) => Math.min(current + 1, 6))
    }
  }

  function handleBack() {
    setStep((current) => Math.max(current - 1, 1))
  }

  async function handleSubmit() {
    if (!validate(5)) {
      return
    }

    setSubmitError('')
    setIsSubmitting(true)

    try {
      const payload = new globalThis.FormData()
      Object.entries({
        tipoIdentificacao: state.tipoIdentificacao,
        nome: state.nome,
        cpfCnpj: state.cpfCnpj,
        email: state.email,
        telefone: state.telefone,
        relacaoArtGlass: state.relacaoArtGlass,
        natureza: state.natureza,
        assunto: state.assunto,
        titulo: state.titulo,
        descricao: state.descricao,
        dataOcorrido: state.dataOcorrido,
        localOcorrido: state.localOcorrido,
        pessoasEnvolvidas: state.pessoasEnvolvidas,
        tentativaAnterior: state.tentativaAnterior,
        descricaoTentativa: state.descricaoTentativa,
        situacaoEmAndamento: state.situacaoEmAndamento,
        riscoImediato: state.riscoImediato,
        linksEvidencias: state.linksEvidencias,
        observacoesAnexos: state.observacoesAnexos,
        desejaRetorno: state.desejaRetorno,
        melhorHorario: state.melhorHorario,
        consentimentoLgpd: String(state.consentimentoLgpd),
        declaracaoVerdade: String(state.declaracaoVerdade),
      }).forEach(([key, value]) => {
        payload.append(key, value)
      })

      state.anexos.forEach((file) => payload.append('anexos', file))

      const response = await fetch('/api/public/manifestacoes', {
        method: 'POST',
        body: payload,
      })
      const result = await response.json()

      if (!response.ok) {
        const message = result.message || 'Nao foi possivel registrar a manifestacao.'
        setSubmitError(message)
        toast.error(message)
        return
      }

      toast.success('Manifestacao registrada com sucesso.')
      const params = new URLSearchParams({
        protocolo: result.protocolo,
        natureza: state.natureza || 'reclamacao',
        email: state.tipoIdentificacao !== 'anonima' && state.email ? 'true' : 'false',
      })
      router.push(`/ouvidoria/sucesso?${params.toString()}`)
    } catch {
      const message = 'Nao foi possivel registrar a manifestacao no momento. Tente novamente.'
      setSubmitError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  function renderStep() {
    if (step === 1) {
      return (
        <div className="space-y-6">
          <div>
            <Label className="text-base font-semibold">
              Como deseja se identificar? <span className="text-destructive">*</span>
            </Label>
            <RadioGroup
              value={state.tipoIdentificacao}
              onValueChange={(value) => updateField('tipoIdentificacao', value as TipoIdentificacao)}
              className="mt-4 space-y-3"
            >
              {(Object.entries(IDENTIFICACAO_LABELS) as [TipoIdentificacao, string][]).map(([value, label]) => (
                <div key={value} className="flex items-start gap-3 rounded-lg border p-4">
                  <RadioGroupItem value={value} id={value} className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor={value} className="cursor-pointer font-medium">
                      {label}
                    </Label>
                    <p className="text-sm text-muted-foreground">{IDENTIFICACAO_DESCRICOES[value]}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
            {errors.tipoIdentificacao && <p className="mt-2 text-sm text-destructive">{errors.tipoIdentificacao}</p>}
          </div>

          {state.tipoIdentificacao === 'anonima' && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Manifestacao anonima</AlertTitle>
              <AlertDescription>
                O acompanhamento podera ser limitado caso as informacoes nao sejam suficientes.
              </AlertDescription>
            </Alert>
          )}

          {state.tipoIdentificacao && state.tipoIdentificacao !== 'anonima' && (
            <div className="grid gap-4 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="nome">Nome completo *</Label>
                <Input
                  id="nome"
                  value={state.nome}
                  onChange={(event) => updateField('nome', event.target.value)}
                  className={cn(errors.nome && 'border-destructive')}
                />
                {errors.nome && <p className="mt-1 text-sm text-destructive">{errors.nome}</p>}
              </div>
              <div>
                <Label htmlFor="cpfCnpj">CPF ou CNPJ</Label>
                <Input
                  id="cpfCnpj"
                  value={state.cpfCnpj}
                  onChange={(event) => updateField('cpfCnpj', event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={state.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  className={cn(errors.email && 'border-destructive')}
                />
                {errors.email && <p className="mt-1 text-sm text-destructive">{errors.email}</p>}
              </div>
              <div>
                <Label htmlFor="telefone">Telefone / WhatsApp</Label>
                <Input
                  id="telefone"
                  value={state.telefone}
                  onChange={(event) => updateField('telefone', event.target.value)}
                />
              </div>
              <div>
                <Label>Relacao com a ArtGlass</Label>
                <Select
                  value={state.relacaoArtGlass}
                  onValueChange={(value) => updateField('relacaoArtGlass', value as RelacaoArtGlass)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(RELACAO_LABELS) as [RelacaoArtGlass, string][]).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      )
    }

    if (step === 2) {
      return (
        <div className="space-y-6">
          <div>
            <Label className="text-base font-semibold">
              Natureza da manifestacao <span className="text-destructive">*</span>
            </Label>
            <RadioGroup
              value={state.natureza}
              onValueChange={(value) => updateField('natureza', value as NaturezaManifestacao)}
              className="mt-4 grid gap-3 sm:grid-cols-2"
            >
              {(Object.entries(NATUREZA_LABELS) as [NaturezaManifestacao, string][]).map(([value, label]) => (
                <div
                  key={value}
                  className={cn(
                    'rounded-lg border p-4',
                    state.natureza === value ? 'border-primary bg-primary/5' : 'bg-background',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value={value} id={`natureza-${value}`} className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor={`natureza-${value}`} className="cursor-pointer font-medium">
                        {label}
                      </Label>
                      <p className="mt-1 text-xs text-muted-foreground">{NATUREZA_DESCRICOES[value]}</p>
                    </div>
                  </div>
                </div>
              ))}
            </RadioGroup>
            {errors.natureza && <p className="mt-2 text-sm text-destructive">{errors.natureza}</p>}
          </div>

          {state.natureza === 'denuncia' && (
            <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Importante</AlertTitle>
              <AlertDescription>
                Denuncias sao recebidas, classificadas e encaminhadas obrigatoriamente ao Comite de Etica.
              </AlertDescription>
            </Alert>
          )}

          <div>
            <Label>Assunto principal *</Label>
            <Select value={state.assunto} onValueChange={(value) => updateField('assunto', value as AssuntoManifestacao)}>
              <SelectTrigger className={cn(errors.assunto && 'border-destructive')}>
                <SelectValue placeholder="Selecione o assunto..." />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(ASSUNTO_LABELS) as [AssuntoManifestacao, string][]).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.assunto && <p className="mt-1 text-sm text-destructive">{errors.assunto}</p>}
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Classificacao interna</AlertTitle>
            <AlertDescription>
              A complexidade do caso sera definida internamente pela Ouvidoria e pelas areas responsaveis durante a analise da manifestacao.
            </AlertDescription>
          </Alert>
        </div>
      )
    }

    if (step === 3) {
      return (
        <div className="space-y-6">
          <div>
            <Label htmlFor="titulo">Titulo resumido *</Label>
            <Input
              id="titulo"
              value={state.titulo}
              onChange={(event) => updateField('titulo', event.target.value)}
              className={cn(errors.titulo && 'border-destructive')}
            />
            {errors.titulo && <p className="mt-1 text-sm text-destructive">{errors.titulo}</p>}
          </div>
          <div>
            <Label htmlFor="descricao">Descricao detalhada *</Label>
            <Textarea
              id="descricao"
              rows={6}
              value={state.descricao}
              onChange={(event) => updateField('descricao', event.target.value)}
              className={cn(errors.descricao && 'border-destructive')}
            />
            {errors.descricao && <p className="mt-1 text-sm text-destructive">{errors.descricao}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="dataOcorrido">Data aproximada do ocorrido</Label>
              <Input
                id="dataOcorrido"
                type="date"
                value={state.dataOcorrido}
                onChange={(event) => updateField('dataOcorrido', event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="localOcorrido">Local do ocorrido</Label>
              <Input
                id="localOcorrido"
                value={state.localOcorrido}
                onChange={(event) => updateField('localOcorrido', event.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="pessoasEnvolvidas">Pessoas ou areas envolvidas</Label>
            <Textarea
              id="pessoasEnvolvidas"
              rows={3}
              value={state.pessoasEnvolvidas}
              onChange={(event) => updateField('pessoasEnvolvidas', event.target.value)}
            />
          </div>

          <div>
            <Label className="text-base font-semibold">Houve tentativa anterior de solucao? *</Label>
            <RadioGroup
              value={state.tentativaAnterior}
              onValueChange={(value) => updateField('tentativaAnterior', value as 'sim' | 'nao' | 'nao_aplica')}
              className="mt-3 flex flex-wrap gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="sim" id="tentativa-sim" />
                <Label htmlFor="tentativa-sim">Sim</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="nao" id="tentativa-nao" />
                <Label htmlFor="tentativa-nao">Nao</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="nao_aplica" id="tentativa-na" />
                <Label htmlFor="tentativa-na">Nao se aplica</Label>
              </div>
            </RadioGroup>
            {errors.tentativaAnterior && <p className="mt-1 text-sm text-destructive">{errors.tentativaAnterior}</p>}
          </div>

          {state.tentativaAnterior === 'sim' && (
            <div>
              <Label htmlFor="descricaoTentativa">Descreva a tentativa anterior</Label>
              <Textarea
                id="descricaoTentativa"
                rows={3}
                value={state.descricaoTentativa}
                onChange={(event) => updateField('descricaoTentativa', event.target.value)}
              />
            </div>
          )}

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <Label className="text-base font-semibold">A situacao ainda esta acontecendo? *</Label>
              <RadioGroup
                value={state.situacaoEmAndamento}
                onValueChange={(value) => updateField('situacaoEmAndamento', value as 'sim' | 'nao' | 'nao_sei')}
                className="mt-3 flex flex-wrap gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="sim" id="situacao-sim" />
                  <Label htmlFor="situacao-sim">Sim</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="nao" id="situacao-nao" />
                  <Label htmlFor="situacao-nao">Nao</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="nao_sei" id="situacao-ns" />
                  <Label htmlFor="situacao-ns">Nao sei</Label>
                </div>
              </RadioGroup>
              {errors.situacaoEmAndamento && (
                <p className="mt-1 text-sm text-destructive">{errors.situacaoEmAndamento}</p>
              )}
            </div>

            <div>
              <Label className="text-base font-semibold">Existe risco imediato? *</Label>
              <RadioGroup
                value={state.riscoImediato}
                onValueChange={(value) => updateField('riscoImediato', value as 'sim' | 'nao' | 'nao_sei')}
                className="mt-3 flex flex-wrap gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="sim" id="risco-sim" />
                  <Label htmlFor="risco-sim">Sim</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="nao" id="risco-nao" />
                  <Label htmlFor="risco-nao">Nao</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="nao_sei" id="risco-ns" />
                  <Label htmlFor="risco-ns">Nao sei</Label>
                </div>
              </RadioGroup>
              {errors.riscoImediato && <p className="mt-1 text-sm text-destructive">{errors.riscoImediato}</p>}
            </div>
          </div>
        </div>
      )
    }

    if (step === 4) {
      return (
        <div className="space-y-6">
          <div>
            <Label className="text-base font-semibold">Upload de arquivos</Label>
            <p className="mb-4 text-sm text-muted-foreground">
              Permitido: PDF, PNG, JPG, JPEG, DOC, DOCX, XLS, XLSX e TXT. Limite de 10MB por arquivo.
            </p>
            <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
              <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Selecione arquivos de apoio para a analise.</p>
              <input
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.txt"
                onChange={(event) => {
                  const files = event.target.files ? Array.from(event.target.files) : []
                  updateField('anexos', [...state.anexos, ...files])
                }}
                className="mt-4 text-sm"
              />
            </div>
            {state.anexos.length > 0 && (
              <div className="mt-4 space-y-2">
                {state.anexos.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                    <span className="truncate text-sm">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => updateField('anexos', state.anexos.filter((_, currentIndex) => currentIndex !== index))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="linksEvidencias">Links ou evidencias externas</Label>
            <Textarea
              id="linksEvidencias"
              rows={3}
              value={state.linksEvidencias}
              onChange={(event) => updateField('linksEvidencias', event.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="observacoesAnexos">Observacoes sobre anexos</Label>
            <Textarea
              id="observacoesAnexos"
              rows={3}
              value={state.observacoesAnexos}
              onChange={(event) => updateField('observacoesAnexos', event.target.value)}
            />
          </div>
        </div>
      )
    }

    if (step === 5) {
      return (
        <div className="space-y-6">
          {state.tipoIdentificacao !== 'anonima' && (
            <div>
              <Label className="text-base font-semibold">Deseja receber retorno? *</Label>
              <RadioGroup
                value={state.desejaRetorno}
                onValueChange={(value) => updateField('desejaRetorno', value as ReturnPreference)}
                className="mt-4 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="email" id="retorno-email" />
                  <Label htmlFor="retorno-email">Sim, por e-mail</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="telefone" id="retorno-telefone" />
                  <Label htmlFor="retorno-telefone">Sim, por telefone / WhatsApp</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="nao" id="retorno-nao" />
                  <Label htmlFor="retorno-nao">Nao desejo retorno</Label>
                </div>
              </RadioGroup>
              {errors.desejaRetorno && <p className="mt-1 text-sm text-destructive">{errors.desejaRetorno}</p>}
            </div>
          )}

          {(state.desejaRetorno === 'email' || state.desejaRetorno === 'telefone') && (
            <div>
              <Label htmlFor="melhorHorario">Melhor horario para contato</Label>
              <Input
                id="melhorHorario"
                value={state.melhorHorario}
                onChange={(event) => updateField('melhorHorario', event.target.value)}
              />
            </div>
          )}

          <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="lgpd"
                checked={state.consentimentoLgpd}
                onCheckedChange={(checked) => updateField('consentimentoLgpd', Boolean(checked))}
              />
              <div>
                <Label htmlFor="lgpd" className="cursor-pointer">
                  Autorizo o tratamento dos meus dados para analise da manifestacao *
                </Label>
                <p className="text-xs text-muted-foreground">
                  Os dados serao tratados de acordo com a LGPD e as diretrizes da Ouvidoria.
                </p>
              </div>
            </div>
            {errors.consentimentoLgpd && (
              <p className="text-sm text-destructive">{errors.consentimentoLgpd}</p>
            )}

            <div className="flex items-start gap-3">
              <Checkbox
                id="verdade"
                checked={state.declaracaoVerdade}
                onCheckedChange={(checked) => updateField('declaracaoVerdade', Boolean(checked))}
              />
              <div>
                <Label htmlFor="verdade" className="cursor-pointer">
                  Declaro que as informacoes fornecidas sao verdadeiras e de boa-fe *
                </Label>
              </div>
            </div>
            {errors.declaracaoVerdade && (
              <p className="text-sm text-destructive">{errors.declaracaoVerdade}</p>
            )}
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Identificacao</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <strong>Tipo:</strong>{' '}
              {state.tipoIdentificacao ? IDENTIFICACAO_LABELS[state.tipoIdentificacao] : '-'}
            </p>
            {state.tipoIdentificacao !== 'anonima' && (
              <>
                <p>
                  <strong>Nome:</strong> {state.nome || '-'}
                </p>
                <p>
                  <strong>E-mail:</strong> {state.email || '-'}
                </p>
                {state.relacaoArtGlass && (
                  <p>
                    <strong>Relacao:</strong> {RELACAO_LABELS[state.relacaoArtGlass]}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Classificacao</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <strong>Natureza:</strong> {state.natureza ? NATUREZA_LABELS[state.natureza] : '-'}
            </p>
            <p>
              <strong>Assunto:</strong> {state.assunto ? ASSUNTO_LABELS[state.assunto] : '-'}
            </p>
            <p>
              <strong>Complexidade:</strong> Definida internamente pela Ouvidoria
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Relato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <strong>Titulo:</strong> {state.titulo || '-'}
            </p>
            <p>
              <strong>Descricao:</strong> {state.descricao || '-'}
            </p>
            <p>
              <strong>Risco imediato:</strong> {state.riscoImediato || '-'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Evidencias e contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <strong>Anexos:</strong> {state.anexos.length}
            </p>
            <p>
              <strong>Retorno:</strong>{' '}
              {state.tipoIdentificacao === 'anonima' ? 'Manifestacao anonima' : state.desejaRetorno || '-'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <CardHeader className="border-b bg-muted/30">
          <CardTitle>Registrar Manifestacao</CardTitle>
          <CardDescription>
            Preencha as informacoes com clareza. Ao final, voce recebera um protocolo para acompanhamento.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Este canal e seguro, confidencial e imparcial. As informacoes serao utilizadas exclusivamente para analise e tratativa da manifestacao.
            </AlertDescription>
          </Alert>

          {submitError && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <FormStepIndicator steps={STEPS} currentStep={step} />

          <div className="mt-8">{renderStep()}</div>

          <div className="mt-8 flex items-center justify-between border-t pt-6">
            <Button type="button" variant="outline" onClick={handleBack} disabled={step === 1 || isSubmitting}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>

            {step < 6 ? (
              <Button type="button" onClick={handleNext} disabled={isSubmitting}>
                Proximo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Enviar manifestacao
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
