import { NextResponse } from 'next/server'

import { requireCapability } from '@/lib/server/auth'
import { listAuditEntries } from '@/lib/server/audit'

export async function GET(request: Request) {
  try {
    await requireCapability('auditoria')
    const { searchParams } = new URL(request.url)
    const items = await listAuditEntries({
      protocolo: searchParams.get('protocolo') || undefined,
      usuario: searchParams.get('usuario') || undefined,
      acao: searchParams.get('acao') || undefined,
    })

    return NextResponse.json({ items })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nao autenticado.'
    const status = message === 'FORBIDDEN' ? 403 : 401
    return NextResponse.json(
      { message: status === 403 ? 'Acesso negado.' : 'Nao autenticado.' },
      { status },
    )
  }
}
