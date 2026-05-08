'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AlertCircle, Clock, Download, Eye, Filter, Search } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  COMPLEXIDADE_LABELS,
  NATUREZA_COLORS,
  NATUREZA_LABELS,
  PRIORIDADE_COLORS,
  STATUS_COLORS,
} from '@/lib/constants'
import type { Complexidade, NaturezaManifestacao, Prioridade, TipoIdentificacao } from '@/lib/types'

type ManifestationItem = {
  id: string
  protocolo: string
  dataAbertura: string
  natureza: NaturezaManifestacao
  naturezaLabel: string
  assunto: string
  origem: string
  origemKey: TipoIdentificacao
  complexidade: string
  complexidadeKey: Complexidade
  prioridade: Prioridade
  prioridadeLabel: string
  status: string
  statusLabel: string
  filaAtualLabel: string
  responsavelNome: string
  areaNome: string
  prazoInicial: string
  prazoFinal: string
  diasAberto: number
  atrasada: boolean
  canal: string
}

type ListResponse = {
  items: ManifestationItem[]
  departamentos: Array<{ id: string; nome: string }>
  usuarios: Array<{ id: string; nome: string }>
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR')
}

export default function ManifestacoesPage() {
  const searchParams = useSearchParams()
  const [items, setItems] = useState<ManifestationItem[]>([])
  const [departamentos, setDepartamentos] = useState<ListResponse['departamentos']>([])
  const [usuarios, setUsuarios] = useState<ListResponse['usuarios']>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [status, setStatus] = useState(searchParams.get('status') || 'all')
  const [natureza, setNatureza] = useState(searchParams.get('natureza') || 'all')
  const [origem, setOrigem] = useState(searchParams.get('origem') || 'all')
  const [complexidade, setComplexidade] = useState(searchParams.get('complexidade') || 'all')
  const [area, setArea] = useState(searchParams.get('area') || 'all')
  const [responsavel, setResponsavel] = useState(searchParams.get('responsavel') || 'all')
  const [atrasadas, setAtrasadas] = useState(searchParams.get('atrasadas') === 'true')

  useEffect(() => {
    let mounted = true

    async function loadItems() {
      setLoading(true)
      setError('')

      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (status !== 'all') params.set('status', status)
      if (natureza !== 'all') params.set('natureza', natureza)
      if (origem !== 'all') params.set('origem', origem)
      if (complexidade !== 'all') params.set('complexidade', complexidade)
      if (area !== 'all') params.set('area', area)
      if (responsavel !== 'all') params.set('responsavel', responsavel)
      if (atrasadas) params.set('atrasadas', 'true')

      try {
        const response = await fetch(`/api/admin/manifestacoes?${params.toString()}`, {
          cache: 'no-store',
        })
        const result = (await response.json()) as ListResponse

        if (!mounted) {
          return
        }

        if (!response.ok) {
          setError('Nao foi possivel carregar a fila de manifestacoes.')
          return
        }

        setItems(result.items || [])
        setDepartamentos(result.departamentos || [])
        setUsuarios(result.usuarios || [])
      } catch {
        if (mounted) {
          setError('Nao foi possivel carregar a fila de manifestacoes.')
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
  }, [area, atrasadas, complexidade, natureza, origem, responsavel, search, status])

  const exportHref = useMemo(() => {
    const params = new URLSearchParams()
    if (search.trim()) params.set('search', search.trim())
    if (status !== 'all') params.set('status', status)
    if (natureza !== 'all') params.set('natureza', natureza)
    if (origem !== 'all') params.set('origem', origem)
    if (complexidade !== 'all') params.set('complexidade', complexidade)
    if (atrasadas) params.set('atrasadas', 'true')
    if (area !== 'all') params.set('area', area)
    if (responsavel !== 'all') params.set('responsavel', responsavel)
    return `/api/admin/reports/export?${params.toString()}`
  }, [area, atrasadas, complexidade, natureza, origem, responsavel, search, status])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manifestacoes</h1>
          <p className="text-muted-foreground">
            Fila completa da Ouvidoria com filtros, prioridades e prazos de atendimento.
          </p>
        </div>
        <Button variant="outline" asChild>
          <a href={exportHref}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </a>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros operacionais</CardTitle>
          <CardDescription>
            Refine a fila por natureza, origem, prioridade de prazo e responsavel atual.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por protocolo, nome, titulo ou assunto..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="recebida">Recebida</SelectItem>
              <SelectItem value="em_analise_ouvidoria">Em analise</SelectItem>
              <SelectItem value="encaminhada_area">Encaminhada a area</SelectItem>
              <SelectItem value="aguardando_minuta">Aguardando minuta</SelectItem>
              <SelectItem value="em_analise_pertinencia">Analise de pertinencia</SelectItem>
              <SelectItem value="em_investigacao">Em investigacao</SelectItem>
              <SelectItem value="concluida">Concluida</SelectItem>
              <SelectItem value="arquivada">Arquivada</SelectItem>
              <SelectItem value="improcedente">Improcedente</SelectItem>
            </SelectContent>
          </Select>

          <Select value={natureza} onValueChange={setNatureza}>
            <SelectTrigger>
              <SelectValue placeholder="Natureza" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as naturezas</SelectItem>
              {Object.entries(NATUREZA_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={origem} onValueChange={setOrigem}>
            <SelectTrigger>
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as origens</SelectItem>
              <SelectItem value="identificada">Identificada</SelectItem>
              <SelectItem value="anonima">Anonima</SelectItem>
              <SelectItem value="sigilosa">Sigilosa</SelectItem>
            </SelectContent>
          </Select>

          <Select value={complexidade} onValueChange={setComplexidade}>
            <SelectTrigger>
              <SelectValue placeholder="Complexidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as complexidades</SelectItem>
              {Object.entries(COMPLEXIDADE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={area} onValueChange={setArea}>
            <SelectTrigger>
              <SelectValue placeholder="Area" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as areas</SelectItem>
              {departamentos.map((department) => (
                <SelectItem key={department.id} value={department.id}>
                  {department.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={responsavel} onValueChange={setResponsavel}>
            <SelectTrigger>
              <SelectValue placeholder="Responsavel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os responsaveis</SelectItem>
              {usuarios.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant={atrasadas ? 'default' : 'outline'}
            onClick={() => setAtrasadas((current) => !current)}
          >
            <Filter className="mr-2 h-4 w-4" />
            {atrasadas ? 'Mostrando atrasadas' : 'Filtrar atrasadas'}
          </Button>
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
        <CardHeader>
          <CardTitle className="text-base">Fila de atendimento</CardTitle>
          <CardDescription>
            {loading ? 'Atualizando manifestacoes...' : `${items.length} manifestacoes encontradas`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Protocolo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Natureza</TableHead>
                  <TableHead>Assunto</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Complexidade</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fila atual</TableHead>
                  <TableHead>Responsavel</TableHead>
                  <TableHead>Prazo final</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className={item.atrasada ? 'bg-destructive/5' : ''}>
                    <TableCell className="font-medium">
                      <Link href={`/admin/manifestacoes/${item.id}`} className="text-primary hover:underline">
                        {item.protocolo}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(item.dataAbertura)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={NATUREZA_COLORS[item.natureza]}>
                        {item.naturezaLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate">{item.assunto}</TableCell>
                    <TableCell>{item.origem}</TableCell>
                    <TableCell>{item.complexidade}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={PRIORIDADE_COLORS[item.prioridade]}>
                        {item.prioridadeLabel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLORS[item.status] || 'bg-muted'}>
                        {item.statusLabel}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.filaAtualLabel}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{item.responsavelNome}</p>
                        <p className="text-xs text-muted-foreground">{item.areaNome}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className={item.atrasada ? 'font-medium text-destructive' : ''}>
                          {formatDate(item.prazoFinal)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/manifestacoes/${item.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver caso
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {!loading && items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={12} className="py-10 text-center text-muted-foreground">
                      Nenhuma manifestacao encontrada para os filtros aplicados.
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
