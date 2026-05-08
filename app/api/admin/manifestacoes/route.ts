import { NextResponse } from 'next/server'

import { hasAnyAdminCapability } from '@/lib/admin-access'
import { requireAuthenticatedUser } from '@/lib/server/auth'
import { getManifestationSummary, getSupportingMetadata, listManifestations } from '@/lib/server/manifestations'
import { readDb } from '@/lib/server/store'

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser()
    if (
      !hasAnyAdminCapability(
        user.perfil,
        ['manifestacoes', 'denuncias', 'areas_tecnicas'],
        user.capabilities,
      )
    ) {
      return NextResponse.json({ message: 'Acesso negado.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const filters = {
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      natureza: searchParams.get('natureza') || undefined,
      origem: searchParams.get('origem') || undefined,
      area: searchParams.get('area') || undefined,
      responsavel: searchParams.get('responsavel') || undefined,
      complexidade: searchParams.get('complexidade') || undefined,
      queue: searchParams.get('queue') || undefined,
      denunciasOnly: searchParams.get('denunciasOnly') === 'true',
      atrasadasOnly: searchParams.get('atrasadas') === 'true',
      arquivadasOnly: searchParams.get('arquivadas') === 'true',
      anonimasOnly: searchParams.get('anonimas') === 'true',
      sigilosasOnly: searchParams.get('sigilosas') === 'true',
      improcedentesOnly: searchParams.get('improcedentes') === 'true',
    }

    const [database, manifestations] = await Promise.all([readDb(), listManifestations(filters, user)])
    const { departmentsById, usersById } = getSupportingMetadata(database)

    return NextResponse.json({
      items: manifestations.map((manifestation) => {
        const summary = getManifestationSummary(manifestation)
        return {
          ...summary,
          areaNome: summary.area ? departmentsById[summary.area]?.nome : 'Ouvidoria',
          responsavelNome: summary.responsavel ? usersById[summary.responsavel]?.nome : 'Nao atribuido',
        }
      }),
      departamentos: database.departamentos,
      usuarios: database.usuarios.map((user) => ({
        id: user.id,
        nome: user.nome,
        email: user.email,
        perfil: user.perfil,
        areaId: user.areaId,
        ativo: user.ativo,
      })),
    })
  } catch {
    return NextResponse.json({ message: 'Nao autenticado.' }, { status: 401 })
  }
}
