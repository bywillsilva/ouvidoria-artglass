import { NextResponse } from 'next/server'

import { hasAnyAdminCapability } from '@/lib/admin-access'
import { requireAuthenticatedUser } from '@/lib/server/auth'
import { buildAnalyticsData } from '@/lib/server/analytics'

export async function GET() {
  try {
    const user = await requireAuthenticatedUser()
    if (!hasAnyAdminCapability(user.perfil, ['dashboard', 'indicadores'], user.capabilities)) {
      return NextResponse.json({ message: 'Acesso negado.' }, { status: 403 })
    }

    const data = await buildAnalyticsData(user)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ message: 'Nao autenticado.' }, { status: 401 })
  }
}
