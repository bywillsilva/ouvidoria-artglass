'use client'

import { useMemo, useState } from 'react'
import { Download, FileSpreadsheet, Filter } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function RelatoriosPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [natureza, setNatureza] = useState('all')
  const [denunciasOnly, setDenunciasOnly] = useState('false')

  const csvHref = useMemo(() => {
    const params = new URLSearchParams()
    if (search.trim()) params.set('search', search.trim())
    if (status !== 'all') params.set('status', status)
    if (natureza !== 'all') params.set('natureza', natureza)
    if (denunciasOnly === 'true') params.set('denunciasOnly', 'true')
    return `/api/admin/reports/export?${params.toString()}`
  }, [denunciasOnly, natureza, search, status])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Relatorios</h1>
        <p className="text-muted-foreground">
          Gere exportacoes operacionais para acompanhamento periodico da Ouvidoria.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros da exportacao
          </CardTitle>
          <CardDescription>
            Monte o recorte desejado para gerar um arquivo compatível com CSV e Excel.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2 xl:col-span-2">
            <Label>Busca textual</Label>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Protocolo, assunto, titulo ou nome do manifestante"
            />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="recebida">Recebida</SelectItem>
                <SelectItem value="concluida">Concluida</SelectItem>
                <SelectItem value="arquivada">Arquivada</SelectItem>
                <SelectItem value="improcedente">Improcedente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Natureza</Label>
            <Select value={natureza} onValueChange={setNatureza}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as naturezas</SelectItem>
                <SelectItem value="reclamacao">Reclamacao</SelectItem>
                <SelectItem value="denuncia">Denuncia</SelectItem>
                <SelectItem value="sugestao">Sugestao</SelectItem>
                <SelectItem value="elogio">Elogio</SelectItem>
                <SelectItem value="consulta">Consulta</SelectItem>
                <SelectItem value="solicitacao_complexa">Solicitacao complexa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Escopo especial</Label>
            <Select value={denunciasOnly} onValueChange={setDenunciasOnly}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">Fila geral</SelectItem>
                <SelectItem value="true">Somente denuncias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Exportacao operacional</CardTitle>
            <CardDescription>
              Arquivo pronto para planilhas, consolidacao interna e apoio gerencial.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full justify-start">
              <a href={csvHref}>
                <Download className="mr-2 h-4 w-4" />
                Baixar CSV
              </a>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <a href={csvHref}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Abrir no Excel
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Relatorios recomendados</CardTitle>
            <CardDescription>
              Recortes prontos para uso recorrente da equipe de Ouvidoria.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border p-4">
              <p className="font-medium">Fila geral do periodo</p>
              <p className="text-sm text-muted-foreground">
                Acompanhamento mensal da operacao e do status de cada protocolo.
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="font-medium">Relatorio de denuncias</p>
              <p className="text-sm text-muted-foreground">
                Recorte de casos sigilosos para analise do Comite de Etica e Diretoria.
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="font-medium">Manifestacoes concluidas</p>
              <p className="text-sm text-muted-foreground">
                Base de produtividade, encerramentos e retorno ao manifestante.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
