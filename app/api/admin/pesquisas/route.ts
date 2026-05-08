import { NextResponse } from 'next/server'

import { requireCapability } from '@/lib/server/auth'
import { listSatisfactionSurveys } from '@/lib/server/surveys'

export async function GET() {
  try {
    const user = await requireCapability('pesquisas')
    const items = await listSatisfactionSurveys(user)
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
