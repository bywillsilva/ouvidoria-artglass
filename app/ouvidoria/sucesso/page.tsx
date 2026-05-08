'use client'

import Link from 'next/link'
import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Copy, FileSearch, Home, Mail, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NATUREZA_LABELS } from '@/lib/constants'
import type { NaturezaManifestacao } from '@/lib/types'

function SuccessContent() {
  const searchParams = useSearchParams()
  const protocolo = searchParams.get('protocolo') || 'OUV-2026-000001'
  const natureza = (searchParams.get('natureza') || 'reclamacao') as NaturezaManifestacao
  const hasEmail = searchParams.get('email') === 'true'
  const [copied, setCopied] = useState(false)

  const dataHora = useMemo(
    () =>
      new Date().toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [],
  )

  async function copyProtocol() {
    await navigator.clipboard.writeText(protocolo)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center py-12">
      <div className="mx-auto max-w-lg px-4">
        <Card className="text-center shadow-sm">
          <CardHeader className="pb-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-10 w-10 text-success" />
            </div>
            <CardTitle className="text-2xl">Manifestacao registrada com sucesso</CardTitle>
            <CardDescription>
              Sua manifestacao foi recebida pela Ouvidoria da ArtGlass.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-xl border bg-muted/30 p-6">
              <p className="mb-2 text-sm text-muted-foreground">Numero do protocolo</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-bold text-primary">{protocolo}</span>
                <Button variant="ghost" size="sm" onClick={copyProtocol} className="h-8 w-8 p-0">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {copied && <p className="mt-2 text-xs text-success">Protocolo copiado.</p>}

              <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <div>
                  <span className="block text-xs uppercase tracking-wide">Natureza</span>
                  <span className="font-medium text-foreground">
                    {NATUREZA_LABELS[natureza] ?? 'Manifestacao'}
                  </span>
                </div>
                <div>
                  <span className="block text-xs uppercase tracking-wide">Registro</span>
                  <span className="font-medium text-foreground">{dataHora}</span>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Guarde o protocolo para acompanhar o andamento da sua manifestacao com seguranca.
            </p>

            {hasEmail && (
              <div className="rounded-lg border border-info/20 bg-info/5 p-4 text-left text-sm">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <Mail className="h-4 w-4 text-info" />
                  Confirmacao enviada por e-mail
                </div>
                <p className="mt-1 text-muted-foreground">
                  Uma mensagem de confirmacao foi enviada ao contato informado no cadastro.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button asChild className="w-full">
                <Link href="/ouvidoria/acompanhar">
                  <FileSearch className="mr-2 h-4 w-4" />
                  Acompanhar manifestacao
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link href="/ouvidoria/nova-manifestacao">
                  <Plus className="mr-2 h-4 w-4" />
                  Registrar nova manifestacao
                </Link>
              </Button>
              <Button variant="ghost" asChild className="w-full">
                <Link href="/ouvidoria">
                  <Home className="mr-2 h-4 w-4" />
                  Voltar ao inicio
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function SucessoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  )
}
