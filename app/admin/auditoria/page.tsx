'use client'

import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type AuditItem = {
  id: string
  protocolo: string
  modulo: string
  usuario: string
  acao: string
  descricao: string
  visibilidade: string
  criadoEm: string
}

export default function AuditoriaPage() {
  const [items, setItems] = useState<AuditItem[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadItems() {
      const params = new URLSearchParams()
      if (search.trim()) {
        params.set('acao', search.trim())
      }

      const response = await fetch(`/api/admin/auditoria?${params.toString()}`, {
        cache: 'no-store',
      })
      const result = await response.json()

      if (mounted && response.ok) {
        setItems(result.items || [])
      }
    }

    loadItems()
    return () => {
      mounted = false
    }
  }, [search])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Auditoria</h1>
        <p className="text-muted-foreground">
          Trilha de movimentacoes dos casos para rastreabilidade operacional.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtro de eventos</CardTitle>
          <CardDescription>
            Pesquise por acao, usuario ou protocolo diretamente na trilha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Digite um termo para filtrar a trilha..."
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Protocolo</TableHead>
                  <TableHead>Modulo</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Acao</TableHead>
                  <TableHead>Descricao</TableHead>
                  <TableHead>Visibilidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{new Date(item.criadoEm).toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="font-medium">{item.protocolo}</TableCell>
                    <TableCell>{item.modulo}</TableCell>
                    <TableCell>{item.usuario}</TableCell>
                    <TableCell>{item.acao}</TableCell>
                    <TableCell className="max-w-[320px] truncate">{item.descricao}</TableCell>
                    <TableCell>{item.visibilidade}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
