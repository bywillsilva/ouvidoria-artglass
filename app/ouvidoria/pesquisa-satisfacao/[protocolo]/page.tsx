'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { NATUREZA_LABELS } from '@/lib/constants'
import type { NaturezaManifestacao } from '@/lib/types'

interface SurveyContext {
  manifestation: {
    protocolo: string
    natureza: NaturezaManifestacao
    titulo: string
    concluidoEm?: string
  }
  jaRespondida: boolean
}

type SurveyState = {
  notaGeral: string
  clareza: string
  tempoResposta: string
  respeito: string
  demandaCompreendida: 'sim' | 'parcialmente' | 'nao' | ''
  desejaReabrir: 'sim' | 'nao' | ''
  comentario: string
}

const initialState: SurveyState = {
  notaGeral: '',
  clareza: '',
  tempoResposta: '',
  respeito: '',
  demandaCompreendida: '',
  desejaReabrir: '',
  comentario: '',
}

function ScoreField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione de 1 a 5" />
        </SelectTrigger>
        <SelectContent>
          {[1, 2, 3, 4, 5].map((score) => (
            <SelectItem key={score} value={String(score)}>
              {score}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default function PesquisaSatisfacaoPage() {
  const params = useParams<{ protocolo: string }>()
  const protocolo = useMemo(() => String(params?.protocolo || ''), [params])
  const [context, setContext] = useState<SurveyContext | null>(null)
  const [form, setForm] = useState<SurveyState>(initialState)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadContext() {
      try {
        const response = await fetch(`/api/public/pesquisas/${protocolo}`, {
          cache: 'no-store',
        })
        const result = await response.json()

        if (!mounted) {
          return
        }

        if (!response.ok) {
          setError(result.message || 'Nao foi possivel localizar a pesquisa.')
          return
        }

        setContext(result)
      } catch {
        if (mounted) {
          setError('Nao foi possivel carregar a pesquisa neste momento.')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    if (protocolo) {
      loadContext()
    }

    return () => {
      mounted = false
    }
  }, [protocolo])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const response = await fetch(`/api/public/pesquisas/${protocolo}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notaGeral: Number(form.notaGeral),
          clareza: Number(form.clareza),
          tempoResposta: Number(form.tempoResposta),
          respeito: Number(form.respeito),
          demandaCompreendida: form.demandaCompreendida,
          desejaReabrir: form.desejaReabrir === 'sim',
          comentario: form.comentario,
        }),
      })
      const result = await response.json()

      if (!response.ok) {
        const message = result.message || 'Nao foi possivel registrar sua avaliacao.'
        setError(message)
        toast.error(message)
        return
      }

      setSuccess(true)
      toast.success('Pesquisa enviada com sucesso.')
    } catch {
      const message = 'Nao foi possivel enviar sua avaliacao neste momento.'
      setError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-lg border bg-card px-5 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Carregando pesquisa...</span>
        </div>
      </div>
    )
  }

  if (error && !context) {
    return (
      <div className="py-10">
        <div className="mx-auto max-w-2xl px-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Pesquisa indisponivel</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (!context) {
    return null
  }

  if (context.jaRespondida || success) {
    return (
      <div className="py-10">
        <div className="mx-auto max-w-2xl px-4">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <CardTitle>Pesquisa registrada</CardTitle>
              <CardDescription>
                Obrigado por avaliar o atendimento da Ouvidoria ArtGlass.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="py-8 md:py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Pesquisa de satisfacao</CardTitle>
            <CardDescription>
              Protocolo {context.manifestation.protocolo} •{' '}
              {NATUREZA_LABELS[context.manifestation.natureza]}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm font-medium text-foreground">
                {context.manifestation.titulo}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Sua opiniao nos ajuda a aprimorar a qualidade, a clareza e o tempo de resposta
                do canal da Ouvidoria.
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <ScoreField
                  label="Nota geral do atendimento"
                  value={form.notaGeral}
                  onChange={(value) => setForm((current) => ({ ...current, notaGeral: value }))}
                />
                <ScoreField
                  label="Clareza da resposta"
                  value={form.clareza}
                  onChange={(value) => setForm((current) => ({ ...current, clareza: value }))}
                />
                <ScoreField
                  label="Tempo de resposta"
                  value={form.tempoResposta}
                  onChange={(value) => setForm((current) => ({ ...current, tempoResposta: value }))}
                />
                <ScoreField
                  label="Respeito no atendimento"
                  value={form.respeito}
                  onChange={(value) => setForm((current) => ({ ...current, respeito: value }))}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>A demanda foi compreendida?</Label>
                  <Select
                    value={form.demandaCompreendida}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        demandaCompreendida: value as SurveyState['demandaCompreendida'],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="parcialmente">Parcialmente</SelectItem>
                      <SelectItem value="nao">Nao</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Deseja reabrir ou apresentar novos fatos?</Label>
                  <Select
                    value={form.desejaReabrir}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        desejaReabrir: value as SurveyState['desejaReabrir'],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nao">Nao</SelectItem>
                      <SelectItem value="sim">Sim</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comentario">Comentario livre</Label>
                <Textarea
                  id="comentario"
                  rows={5}
                  value={form.comentario}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, comentario: event.target.value }))
                  }
                  placeholder="Compartilhe percepcoes sobre o atendimento recebido."
                />
              </div>

              <Button
                type="submit"
                disabled={
                  submitting ||
                  !form.notaGeral ||
                  !form.clareza ||
                  !form.tempoResposta ||
                  !form.respeito ||
                  !form.demandaCompreendida ||
                  !form.desejaReabrir
                }
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando avaliacao...
                  </>
                ) : (
                  'Enviar pesquisa'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
