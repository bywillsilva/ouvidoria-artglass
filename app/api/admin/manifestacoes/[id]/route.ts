import { NextResponse } from 'next/server'

import { hasAnyAdminCapability } from '@/lib/admin-access'
import { requireAuthenticatedUser } from '@/lib/server/auth'
import { getManifestationById, updateManifestation } from '@/lib/server/manifestations'
import { parseJsonBody } from '@/lib/server/request'
import { readDb } from '@/lib/server/store'

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser()
    if (!hasAnyAdminCapability(user.perfil, ['manifestacoes', 'denuncias', 'areas_tecnicas'], user.capabilities)) {
      return NextResponse.json({ message: 'Acesso negado.' }, { status: 403 })
    }
    const { id } = await context.params
    const manifestation = await getManifestationById(id, user)
    if (!manifestation) {
      return NextResponse.json({ message: 'Manifestacao nao encontrada.' }, { status: 404 })
    }

    const database = await readDb()
    const departamentos = database.departamentos.map((department) => ({
      id: department.id,
      nome: department.nome,
      responsavel: department.responsavel,
      email: department.email,
    }))
    const usuarios = database.usuarios
      .filter((user) => user.ativo)
      .map((user) => ({
        id: user.id,
        nome: user.nome,
        email: user.email,
        perfil: user.perfil,
        areaId: user.areaId,
      }))

    return NextResponse.json({
      manifestation,
      departamentos,
      usuarios,
      currentUser: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        perfil: user.perfil,
        areaId: user.areaId,
        capabilities: user.capabilities,
      },
    })
  } catch {
    return NextResponse.json({ message: 'Nao autenticado.' }, { status: 401 })
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser()
    if (!hasAnyAdminCapability(user.perfil, ['manifestacoes', 'denuncias', 'areas_tecnicas'], user.capabilities)) {
      return NextResponse.json({ message: 'Acesso negado.' }, { status: 403 })
    }
    const { id } = await context.params
    const body = await parseJsonBody<Parameters<typeof updateManifestation>[1]>(request)
    const manifestation = await updateManifestation(id, body, user)
    return NextResponse.json({ manifestation })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message === 'FORBIDDEN'
          ? 'Acesso negado.'
          : error.message === 'UNAUTHORIZED'
            ? 'Nao autenticado.'
            : error.message === 'INVALID_JSON'
              ? 'Corpo da requisicao invalido.'
            : error.message
        : 'Nao foi possivel atualizar a manifestacao.'
    const status =
      error instanceof Error
        ? error.message === 'UNAUTHORIZED'
          ? 401
          : error.message === 'FORBIDDEN'
            ? 403
            : 400
        : 400
    return NextResponse.json({ message }, { status })
  }
}
