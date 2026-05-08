import { NextResponse } from 'next/server'

import { requireCapability } from '@/lib/server/auth'
import { buildDashboardData } from '@/lib/server/analytics'

export async function GET() {
  try {
    const user = await requireCapability('dashboard')
    const data = await buildDashboardData(user)
    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nao autenticado.'
    const status = message === 'FORBIDDEN' ? 403 : 401
    return NextResponse.json(
      { message: status === 403 ? 'Acesso negado.' : 'Nao autenticado.' },
      { status },
    )
  }
}
