'use client'

import { useState } from 'react'
import { Search, AlertCircle, Info, CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { NATUREZA_LABELS, STATUS_PUBLICO_LABELS } from '@/lib/constants'
import type { NaturezaManifestacao, StatusPublico } from '@/lib/types'

interface TrackingView {
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

const statusColors: Record<StatusPublico, string> = {
  recebida: 'bg-info/10 text-info border-info/20',
  em_analise: 'bg-info/10 text-info border-info/20',
  encaminhada_tratativa: 'bg-warning/10 text-warning border-warning/20',
  em_apuracao: 'bg-committee/10 text-committee border-committee/20',
  aguardando_informacoes: 'bg-warning/10 text-warning border-warning/20',
  prorrogada: 'bg-primary/10 text-primary border-primary/20',
  resposta_elaboracao: 'bg-primary/10 text-primary border-primary/20',
  concluida: 'bg-success/10 text-success border-success/20',
  arquivada: 'bg-muted text-muted-foreground border-muted',
}

function formatDate(value?: string) {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleString('pt-BR')
}

export default function AcompanharPage() {
  const [protocolo, setProtocolo] = useState('')
  const [email, setEmail] = useState('')
  const [manifestacao, setManifestacao] = useState<TrackingView | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setManifestacao(null)

    try {
      const response = await fetch('/api/public/manifestacoes/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          protocolo,
          email,
        }),
      })
      const result = await response.json()

      if (!response.ok) {
        setError(result.message || 'Nao foi possivel localizar o protocolo informado.')
        return
      }

      setManifestacao(result)
    } catch {
      setError('Nao foi possivel consultar o protocolo neste momento. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="py-8 md:py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Acompanhar manifestacao
          </h1>
          <p className="mt-2 text-muted-foreground">
            Informe o protocolo e, quando aplicavel, o e-mail utilizado no registro.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Consultar protocolo</CardTitle>
            <CardDescription>
              As informacoes publicas exibidas respeitam os criterios de sigilo da Ouvidoria.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="protocolo">Numero do protocolo</Label>
                  <Input
                    id="protocolo"
                    value={protocolo}
                    onChange={(event) => setProtocolo(event.target.value.toUpperCase())}
                    placeholder="OUV-2026-000001"
                    className="uppercase"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="email">E-mail do manifestante</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Opcional para manifestacoes anonimas"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Consultando...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Buscar andamento
                  </>
                )}
              </Button>
            </form>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Consulta nao localizada</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {manifestacao && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="border-b bg-muted/30">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-xl">{manifestacao.protocolo}</CardTitle>
                    <CardDescription>
                      Abertura em {formatDate(manifestacao.dataAbertura)}
                    </CardDescription>
                  </div>
                  <Badge className={statusColors[manifestacao.status]}>
                    {STATUS_PUBLICO_LABELS[manifestacao.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Natureza</p>
                  <p className="font-medium">{NATUREZA_LABELS[manifestacao.natureza]}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status publico</p>
                  <p className="font-medium">{STATUS_PUBLICO_LABELS[manifestacao.status]}</p>
                </div>
              </CardContent>
            </Card>

            {manifestacao.respostaInicial && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resposta inicial</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {manifestacao.respostaInicial}
                  </p>
                </CardContent>
              </Card>
            )}

            {manifestacao.respostaIntermediaria && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resposta intermediaria</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {manifestacao.respostaIntermediaria}
                  </p>
                </CardContent>
              </Card>
            )}

            {manifestacao.respostaConclusiva && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resposta conclusiva</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {manifestacao.respostaConclusiva}
                  </p>
                  <Button asChild variant="outline">
                    <a href={`/ouvidoria/pesquisa-satisfacao/${manifestacao.protocolo}`}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Avaliar atendimento
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Linha do tempo</CardTitle>
                <CardDescription>
                  Acompanhamento publico sem exposicao de dados internos ou sigilosos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  {manifestacao.timeline.map((item, index) => (
                    <div key={`${item.data}-${index}`} className="relative flex gap-4">
                      {index < manifestacao.timeline.length - 1 && (
                        <div className="absolute left-[11px] top-6 h-full w-0.5 bg-border" />
                      )}
                      <div className="relative z-10 mt-1 h-6 w-6 rounded-full bg-primary/15 ring-4 ring-background">
                        <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <span className="font-medium">{item.status}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(item.data)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{item.descricao}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Sigilo e confidencialidade</AlertTitle>
              <AlertDescription>
                O acompanhamento publico nao exibe nomes de envolvidos, medidas internas,
                deliberacoes de comite ou qualquer dado protegido.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>
    </div>
  )
}
