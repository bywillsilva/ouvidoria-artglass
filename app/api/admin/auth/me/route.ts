import { NextResponse } from 'next/server'

import { requireAuthenticatedUser } from '@/lib/server/auth'

export async function GET() {
  try {
    const user = await requireAuthenticatedUser()
    return NextResponse.json({ user })
  } catch {
    return NextResponse.json({ message: 'Nao autenticado.' }, { status: 401 })
  }
}
