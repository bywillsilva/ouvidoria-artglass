import { NextResponse } from 'next/server'

import { hasAnyAdminCapability } from '@/lib/admin-access'
import { requireAuthenticatedUser } from '@/lib/server/auth'
import { getManifestationSummary, listManifestations } from '@/lib/server/manifestations'

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser()
    if (
      !hasAnyAdminCapability(
        user.perfil,
        ['manifestacoes', 'denuncias', 'relatorios'],
        user.capabilities,
      )
    ) {
      return NextResponse.json({ message: 'Acesso negado.' }, { status: 403 })
    }
    const { searchParams } = new URL(request.url)
    const items = await listManifestations({
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      natureza: searchParams.get('natureza') || undefined,
      denunciasOnly: searchParams.get('denunciasOnly') === 'true',
    }, user)

    const rows = [
      ['Protocolo', 'Natureza', 'Assunto', 'Prioridade', 'Status', 'DataAbertura', 'PrazoFinal'],
      ...items.map((manifestation) => {
        const summary = getManifestationSummary(manifestation)
        return [
          summary.protocolo,
          summary.naturezaLabel,
          summary.assunto,
          summary.prioridadeLabel,
          summary.statusLabel,
          summary.dataAbertura,
          summary.prazoFinal,
        ]
      }),
    ]

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(','),
      )
      .join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="relatorio-ouvidoria.csv"',
      },
    })
  } catch {
    return NextResponse.json({ message: 'Nao autenticado.' }, { status: 401 })
  }
}
