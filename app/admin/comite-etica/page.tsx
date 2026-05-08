'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, Clock, FileCheck, Play, Send, Shield } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { STATUS_COLORS } from '@/lib/constants'

type ComitItem = {
  id: string
  protocolo: string
  assunto: string
  origem: string
  status: string
  statusLabel: string
  dataAbertura: string
  prazoFinal: string
  responsavelNome: string
  prioridadeLabel: string
  atrasada: boolean
}

export default function ComiteEticaPage() {
  const [items, setItems] = useState<ComitItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadItems() {
      try {
        const response = await fetch(
          '/api/admin/manifestacoes?denunciasOnly=true&queue=comite_etica',
          {
          cache: 'no-store',
          },
        )
        const result = await response.json()

        if (!mounted) {
          return
        }

        if (!response.ok) {
          setError('Nao foi possivel carregar a fila do Comite de Etica.')
          return
        }

        setItems(result.items || [])
      } catch {
        if (mounted) {
          setError('Nao foi possivel carregar a fila do Comite de Etica.')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadItems()
    return () => {
      mounted = false
    }
  }, [])

  const grouped = useMemo(
    () => ({
      aguardando: items.filter((item) =>
        ['em_analise_pertinencia', 'comite_convocado', 'em_analise_comite'].includes(item.status),
      ),
      investigacoes: items.filter((item) =>
        ['plano_trabalho_definicao', 'investigacao_iniciada', 'em_investigacao', 'relatorio_elaboracao'].includes(item.status),
      ),
      relatorios: items.filter((item) =>
        ['relatorio_concluido', 'em_avaliacao_comite'].includes(item.status),
      ),
      diretoria: items.filter((item) =>
        ['encaminhada_diretoria', 'decisao_recebida'].includes(item.status),
      ),
    }),
    [items],
  )

  const stats = [
    { label: 'Aguardando analise', value: grouped.aguardando.length, icon: Shield },
    { label: 'Investigacoes em andamento', value: grouped.investigacoes.length, icon: Play },
    { label: 'Relatorios aguardando avaliacao', value: grouped.relatorios.length, icon: FileCheck },
    { label: 'Casos na Diretoria', value: grouped.diretoria.length, icon: Send },
    { label: 'Prazos criticos', value: items.filter((item) => item.atrasada).length, icon: Clock },
  ]

  const renderList = (list: ComitItem[]) => (
    <div className="space-y-4">
      {list.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum caso nesta etapa.
          </CardContent>
        </Card>
      )}
      {list.map((item) => (
        <Card key={item.id} className={item.atrasada ? 'border-destructive/50' : ''}>
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  <Link href={`/admin/denuncias/${item.id}`} className="text-primary hover:underline">
                    {item.protocolo}
                  </Link>
                  <Badge variant="outline" className={STATUS_COLORS[item.status] || 'bg-muted'}>
                    {item.statusLabel}
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1">{item.assunto}</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/denuncias/${item.id}`}>Abrir caso</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>Origem: {item.origem}</span>
              <span>Responsavel: {item.responsavelNome}</span>
              <span>Prioridade: {item.prioridadeLabel}</span>
              <span>Prazo: {new Date(item.prazoFinal).toLocaleDateString('pt-BR')}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-committee/10">
          <Shield className="h-6 w-6 text-committee" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Comite de Etica</h1>
          <p className="text-muted-foreground">
            Ambiente de triagem, investigacao e deliberacao das denuncias encaminhadas.
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Falha ao carregar</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="aguardando" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="aguardando">Aguardando analise</TabsTrigger>
          <TabsTrigger value="investigacoes">Investigacoes</TabsTrigger>
          <TabsTrigger value="relatorios">Relatorios</TabsTrigger>
          <TabsTrigger value="diretoria">Diretoria</TabsTrigger>
        </TabsList>

        <TabsContent value="aguardando">{renderList(grouped.aguardando)}</TabsContent>
        <TabsContent value="investigacoes">{renderList(grouped.investigacoes)}</TabsContent>
        <TabsContent value="relatorios">{renderList(grouped.relatorios)}</TabsContent>
        <TabsContent value="diretoria">{renderList(grouped.diretoria)}</TabsContent>
      </Tabs>

      {loading && (
        <p className="text-sm text-muted-foreground">Atualizando fila do comite...</p>
      )}
    </div>
  )
}
