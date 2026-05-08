'use client'

import { useEffect, useMemo, useState } from 'react'
import { MessageSquareHeart, RotateCcw, Star } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { NATUREZA_LABELS } from '@/lib/constants'
import type { NaturezaManifestacao } from '@/lib/types'

type SurveyItem = {
  id: string
  protocolo: string
  natureza: NaturezaManifestacao
  titulo: string
  notaGeral: number
  clareza: number
  tempoResposta: number
  respeito: number
  demandaCompreendida: string
  desejaReabrir: boolean
  comentario?: string
  criadoEm: string
}

export default function PesquisasSatisfacaoPage() {
  const [items, setItems] = useState<SurveyItem[]>([])

  useEffect(() => {
    let mounted = true

    async function loadItems() {
      const response = await fetch('/api/admin/pesquisas', { cache: 'no-store' })
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

  const average = useMemo(() => {
    if (items.length === 0) {
      return 0
    }

    return items.reduce((sum, item) => sum + item.notaGeral, 0) / items.length
  }, [items])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pesquisas de satisfacao</h1>
        <p className="text-muted-foreground">
          Feedback dos manifestantes apos a conclusao dos protocolos.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <MessageSquareHeart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{items.length}</p>
              <p className="text-xs text-muted-foreground">Pesquisas respondidas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <Star className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{average.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Nota media geral</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
              <RotateCcw className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{items.filter((item) => item.desejaReabrir).length}</p>
              <p className="text-xs text-muted-foreground">Pedidos de reabertura</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Respostas recebidas</CardTitle>
          <CardDescription>
            Historico das avaliacoes com foco em clareza, prazo, respeito e reabertura.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Protocolo</TableHead>
                  <TableHead>Natureza</TableHead>
                  <TableHead>Nota geral</TableHead>
                  <TableHead>Compreensao</TableHead>
                  <TableHead>Reabrir?</TableHead>
                  <TableHead>Comentario</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.protocolo}</TableCell>
                    <TableCell>{NATUREZA_LABELS[item.natureza]}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.notaGeral}/5</Badge>
                    </TableCell>
                    <TableCell>{item.demandaCompreendida}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={item.desejaReabrir ? 'bg-warning/10 text-warning border-warning/20' : 'bg-success/10 text-success border-success/20'}>
                        {item.desejaReabrir ? 'Sim' : 'Nao'}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate">{item.comentario || '-'}</TableCell>
                    <TableCell>{new Date(item.criadoEm).toLocaleDateString('pt-BR')}</TableCell>
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
