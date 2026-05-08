import { NextResponse } from 'next/server'

import { createManifestationFromFormData } from '@/lib/server/manifestations'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const manifestation = await createManifestationFromFormData(formData)
    return NextResponse.json({
      protocolo: manifestation.protocolo,
      id: manifestation.id,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nao foi possivel registrar a manifestacao.'
    return NextResponse.json({ message }, { status: 400 })
  }
}
