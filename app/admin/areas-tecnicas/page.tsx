'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Clock, Eye, FileText } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { STATUS_COLORS } from '@/lib/constants'

type AreaItem = {
  id: string
  protocolo: string
  assunto: string
  areaNome: string
  responsavelNome: string
  status: string
  statusLabel: string
  prazoFinal: string
  filaAtualLabel: string
}

export default function AreasTecnicasPage() {
  const [items, setItems] = useState<AreaItem[]>([])

  useEffect(() => {
    let mounted = true

    async function loadItems() {
      const response = await fetch('/api/admin/manifestacoes?queue=areas_tecnicas', {
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
  }, [])

  const byArea = useMemo(() => {
    const grouped = items.reduce<Record<string, number>>((accumulator, item) => {
      accumulator[item.areaNome] = (accumulator[item.areaNome] ?? 0) + 1
      return accumulator
    }, {})

    return Object.entries(grouped)
  }, [items])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Areas tecnicas</h1>
        <p className="text-muted-foreground">
          Fila de manifestacoes encaminhadas para resposta tecnica, minuta ou ajuste.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{items.length}</p>
              <p className="text-xs text-muted-foreground">Casos em tratativa tecnica</p>
            </div>
          </CardContent>
        </Card>
        {byArea.slice(0, 2).map(([area, total]) => (
          <Card key={area}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{area}</p>
              <p className="mt-2 text-2xl font-bold">{total}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fila por area</CardTitle>
          <CardDescription>
            Acompanhe minutas pendentes, prazos e responsaveis da tratativa tecnica.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Protocolo</TableHead>
                  <TableHead>Assunto</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Responsavel</TableHead>
                  <TableHead>Fila</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.protocolo}</TableCell>
                    <TableCell>{item.assunto}</TableCell>
                    <TableCell>{item.areaNome}</TableCell>
                    <TableCell>{item.responsavelNome}</TableCell>
                    <TableCell>{item.filaAtualLabel}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLORS[item.status] || 'bg-muted'}>
                        {item.statusLabel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        {new Date(item.prazoFinal).toLocaleDateString('pt-BR')}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/areas-tecnicas/${item.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Abrir
                        </Link>
                      </Button>
                    </TableCell>
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
