import { NextResponse } from 'next/server'

import { hasAnyAdminCapability, canUserAccessManifestation } from '@/lib/admin-access'
import { requireAuthenticatedUser } from '@/lib/server/auth'
import { getSupportingMetadata } from '@/lib/server/manifestations'
import { buildManifestationDossierPdf } from '@/lib/server/pdf-report'
import { readDb } from '@/lib/server/store'

export const runtime = 'nodejs'

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser()
    if (
      !hasAnyAdminCapability(
        user.perfil,
        ['manifestacoes', 'denuncias', 'areas_tecnicas', 'relatorios'],
        user.capabilities,
      )
    ) {
      return NextResponse.json({ message: 'Acesso negado.' }, { status: 403 })
    }

    const { id } = await context.params
    const database = await readDb()
    const manifestation =
      database.manifestacoes.find((candidate) => candidate.id === id) ?? null

    if (!manifestation || !canUserAccessManifestation(user, manifestation)) {
      return NextResponse.json({ message: 'Manifestacao nao encontrada.' }, { status: 404 })
    }

    const { departmentsById, usersById } = getSupportingMetadata(database)
    const survey = database.pesquisas.find((candidate) => candidate.manifestacaoId === manifestation.id)
    const pdf = buildManifestationDossierPdf({
      companyName: database.settings.empresa.nomeEmpresa,
      manifestation,
      areaNome: manifestation.areaResponsavelId
        ? departmentsById[manifestation.areaResponsavelId]?.nome
        : 'Ouvidoria',
      responsavelNome: manifestation.responsavelAtualId
        ? usersById[manifestation.responsavelAtualId]?.nome
        : 'Nao atribuido',
      survey,
    })

    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${manifestation.protocolo}-dossie.pdf"`,
      },
    })
  } catch {
    return NextResponse.json({ message: 'Nao autenticado.' }, { status: 401 })
  }
}
