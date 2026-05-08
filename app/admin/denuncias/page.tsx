'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, AlertTriangle, Clock, Eye, Search, Shield } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PRIORIDADE_COLORS, STATUS_COLORS } from '@/lib/constants'
import type { Prioridade } from '@/lib/types'

type DenunciaItem = {
  id: string
  protocolo: string
  assunto: string
  dataAbertura: string
  prioridade: Prioridade
  prioridadeLabel: string
  status: string
  statusLabel: string
  responsavelNome: string
  prazoFinal: string
  atrasada: boolean
  riscoImediato: 'sim' | 'nao' | 'nao_sei'
  origem: string
}

type ListResponse = {
  items: DenunciaItem[]
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR')
}

export default function DenunciasPage() {
  const [items, setItems] = useState<DenunciaItem[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadData() {
      setLoading(true)
      setError('')

      const params = new URLSearchParams({ denunciasOnly: 'true' })
      if (search.trim()) params.set('search', search.trim())
      if (status !== 'all') params.set('status', status)

      try {
        const response = await fetch(`/api/admin/manifestacoes?${params.toString()}`, {
          cache: 'no-store',
        })
        const result = (await response.json()) as ListResponse

        if (!mounted) {
          return
        }

        if (!response.ok) {
          setError('Nao foi possivel carregar o modulo de denuncias.')
          return
        }

        setItems(result.items || [])
      } catch {
        if (mounted) {
          setError('Nao foi possivel carregar o modulo de denuncias.')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadData()
    return () => {
      mounted = false
    }
  }, [search, status])

  const stats = useMemo(() => {
    const late = items.filter((item) => item.atrasada).length
    const pertinence = items.filter((item) => item.status === 'em_analise_pertinencia').length
    const investigation = items.filter((item) =>
      ['investigacao_iniciada', 'em_investigacao', 'relatorio_elaboracao'].includes(item.status),
    ).length
    const concluded = items.filter((item) =>
      ['acoes_concluidas', 'arquivada', 'resposta_manifestante_enviada'].includes(item.status),
    ).length

    return [
      { label: 'Recebidas', value: items.length },
      { label: 'Analise de pertinencia', value: pertinence },
      { label: 'Em investigacao', value: investigation },
      { label: 'Concluidas', value: concluded },
      { label: 'Vencidas', value: late },
    ]
  }, [items])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Denuncias</h1>
        <p className="text-muted-foreground">
          Controle sigiloso de denuncias, analise de pertinencia e fluxo com o Comite de Etica.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="mt-2 text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fila sigilosa</CardTitle>
          <CardDescription>
            Consulte protocolos, prazos criticos e responsaveis pelo fluxo de apuracao.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por protocolo ou assunto..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status da denuncia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="em_analise_pertinencia">Analise de pertinencia</SelectItem>
              <SelectItem value="em_analise_comite">Em analise pelo comite</SelectItem>
              <SelectItem value="plano_trabalho_definicao">Plano de trabalho</SelectItem>
              <SelectItem value="em_investigacao">Em investigacao</SelectItem>
              <SelectItem value="encaminhada_diretoria">Aguardando diretoria</SelectItem>
              <SelectItem value="improcedente">Improcedente</SelectItem>
              <SelectItem value="arquivada">Arquivada</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Falha ao carregar</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Protocolo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Assunto</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Risco</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Responsavel</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Sigilo</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className={item.atrasada ? 'bg-destructive/5' : ''}>
                    <TableCell className="font-medium">
                      <Link href={`/admin/denuncias/${item.id}`} className="text-primary hover:underline">
                        {item.protocolo}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(item.dataAbertura)}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate">{item.assunto}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={PRIORIDADE_COLORS[item.prioridade]}>
                        {item.prioridadeLabel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          item.riscoImediato === 'sim'
                            ? 'bg-destructive/10 text-destructive border-destructive/20'
                            : item.riscoImediato === 'nao_sei'
                              ? 'bg-warning/10 text-warning border-warning/20'
                              : 'bg-success/10 text-success border-success/20'
                        }
                      >
                        {item.riscoImediato === 'sim'
                          ? 'Alto'
                          : item.riscoImediato === 'nao_sei'
                            ? 'A avaliar'
                            : 'Controlado'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={STATUS_COLORS[item.status] || 'bg-muted'}>
                          {item.statusLabel}
                        </Badge>
                        {item.atrasada && <AlertTriangle className="h-4 w-4 text-destructive" />}
                      </div>
                    </TableCell>
                    <TableCell>{item.responsavelNome}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className={item.atrasada ? 'font-medium text-destructive' : ''}>
                          {formatDate(item.prazoFinal)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-committee/10 text-committee border-committee/20">
                        <Shield className="mr-1 h-3 w-3" />
                        Restrito
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/denuncias/${item.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Visualizar
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {!loading && items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                      Nenhuma denuncia encontrada para os filtros aplicados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
