import { NextResponse } from 'next/server'

import { requireCapability } from '@/lib/server/auth'
import { buildNotifications } from '@/lib/server/notifications'

export async function GET() {
  try {
    const user = await requireCapability('notificacoes')
    const items = await buildNotifications(user)
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
