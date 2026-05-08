import { NextResponse } from 'next/server'

import { getCapabilitiesForProfile } from '@/lib/admin-access'
import { requireAuthenticatedUser } from '@/lib/server/auth'
import { parseJsonBody } from '@/lib/server/request'
import { hashPassword, verifyPassword } from '@/lib/server/security'
import { updateDb } from '@/lib/server/store'

function validatePasswordStrength(password: string) {
  if (password.length < 8) {
    throw new Error('A nova senha deve ter pelo menos 8 caracteres.')
  }

  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    throw new Error('A nova senha deve conter letras maiusculas, minusculas e numeros.')
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser()
    const body = await parseJsonBody<{
      senhaAtual?: string
      novaSenha?: string
      confirmarSenha?: string
    }>(request)

    const senhaAtual = body.senhaAtual?.trim() || ''
    const novaSenha = body.novaSenha?.trim() || ''
    const confirmarSenha = body.confirmarSenha?.trim() || ''

    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      return NextResponse.json(
        { message: 'Informe a senha atual, a nova senha e a confirmacao.' },
        { status: 400 },
      )
    }

    if (novaSenha !== confirmarSenha) {
      return NextResponse.json({ message: 'A confirmacao da senha nao confere.' }, { status: 400 })
    }

    validatePasswordStrength(novaSenha)

    const result = await updateDb((database) => {
      const target = database.usuarios.find((candidate) => candidate.id === user.id)
      if (!target || !target.ativo) {
        throw new Error('UNAUTHORIZED')
      }

      if (!verifyPassword(senhaAtual, target.senhaHash)) {
        throw new Error('INVALID_CURRENT_PASSWORD')
      }

      if (verifyPassword(novaSenha, target.senhaHash)) {
        throw new Error('SAME_PASSWORD')
      }

      target.senhaHash = hashPassword(novaSenha)
      target.deveTrocarSenha = false
      target.atualizadoEm = new Date().toISOString()

      return {
        id: target.id,
        nome: target.nome,
        email: target.email,
        perfil: target.perfil,
        areaId: target.areaId,
        deveTrocarSenha: false,
        capabilities: getCapabilitiesForProfile(target.perfil, database.settings.acessos),
      }
    })

    return NextResponse.json({ user: result })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Nao foi possivel atualizar a senha.'

    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ message: 'Nao autenticado.' }, { status: 401 })
    }

    if (message === 'INVALID_CURRENT_PASSWORD') {
      return NextResponse.json({ message: 'A senha atual informada esta incorreta.' }, { status: 400 })
    }

    if (message === 'SAME_PASSWORD') {
      return NextResponse.json(
        { message: 'A nova senha deve ser diferente da senha atual.' },
        { status: 400 },
      )
    }

    if (message === 'INVALID_JSON') {
      return NextResponse.json({ message: 'Corpo da requisicao invalido.' }, { status: 400 })
    }

    return NextResponse.json({ message }, { status: 400 })
  }
}
