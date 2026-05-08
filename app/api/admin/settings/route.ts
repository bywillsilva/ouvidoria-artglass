import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'

import { normalizeAdminAccessMatrix } from '@/lib/admin-access'
import { requireAdminUser } from '@/lib/server/auth'
import { parseJsonBody } from '@/lib/server/request'
import { hashPassword } from '@/lib/server/security'
import { readDb, updateDb } from '@/lib/server/store'
import type { AppSettingsRecord } from '@/lib/server/schema'
import type { PerfilUsuario } from '@/lib/types'

const PERFIS_VALIDOS = new Set<PerfilUsuario>([
  'admin',
  'ouvidoria',
  'comite_etica',
  'area_tecnica',
  'rh',
  'gestor',
  'diretoria',
  'auditor',
  'visualizador',
])

type SettingsPayload = {
  settings?: AppSettingsRecord
  departamentos?: Array<Record<string, string | boolean | undefined>>
  templates?: Array<Record<string, string | boolean | undefined>>
  usuarios?: Array<Record<string, string | boolean | undefined>>
}

function validatePasswordStrength(password: string) {
  if (password.length < 8) {
    throw new Error('A senha temporaria deve ter pelo menos 8 caracteres.')
  }

  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    throw new Error('A senha temporaria deve conter letras maiusculas, minusculas e numeros.')
  }
}

export async function GET() {
  try {
    await requireAdminUser()
    const database = await readDb()
    return NextResponse.json({
      settings: database.settings,
      departamentos: database.departamentos,
      usuarios: database.usuarios.map((user) => ({
        id: user.id,
        nome: user.nome,
        email: user.email,
        perfil: user.perfil,
        areaId: user.areaId,
        ativo: user.ativo,
        deveTrocarSenha: Boolean(user.deveTrocarSenha),
        ultimoAcessoEm: user.ultimoAcessoEm,
      })),
      templates: database.templates,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nao autenticado.'
    const status = message === 'FORBIDDEN' ? 403 : 401
    return NextResponse.json(
      { message: status === 403 ? 'Acesso negado.' : 'Nao autenticado.' },
      { status },
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const currentUser = await requireAdminUser()
    const body = await parseJsonBody<SettingsPayload>(request)

    const result = await updateDb((database) => {
      if (body.settings) {
        database.settings = {
          ...body.settings,
          acessos: normalizeAdminAccessMatrix(body.settings.acessos),
        }
      }

      if (Array.isArray(body.departamentos)) {
        database.departamentos = body.departamentos.map((department) => ({
          id: typeof department.id === 'string' && department.id ? department.id : randomUUID(),
          nome: typeof department.nome === 'string' ? department.nome : '',
          responsavel: typeof department.responsavel === 'string' ? department.responsavel : '',
          email: typeof department.email === 'string' ? department.email : '',
          ativo: department.ativo !== false,
          criadoEm:
            typeof department.criadoEm === 'string' ? department.criadoEm : new Date().toISOString(),
          atualizadoEm: new Date().toISOString(),
        }))
      }

      if (Array.isArray(body.templates)) {
        database.templates = body.templates.map((template) => ({
          id: typeof template.id === 'string' && template.id ? template.id : randomUUID(),
          titulo: typeof template.titulo === 'string' ? template.titulo : '',
          descricao: typeof template.descricao === 'string' ? template.descricao : '',
          assunto: typeof template.assunto === 'string' ? template.assunto : '',
          corpo: typeof template.corpo === 'string' ? template.corpo : '',
          tipo:
            template.tipo === 'inicial' ||
            template.tipo === 'intermediaria' ||
            template.tipo === 'conclusiva' ||
            template.tipo === 'esclarecimento'
              ? template.tipo
              : 'intermediaria',
          envioAutomatico: Boolean(template.envioAutomatico),
          categoria: template.categoria === 'automatico' ? 'automatico' : 'manual',
          criadoEm:
            typeof template.criadoEm === 'string' ? template.criadoEm : new Date().toISOString(),
          atualizadoEm: new Date().toISOString(),
        }))
      }

      if (Array.isArray(body.usuarios)) {
        const submittedUsers = body.usuarios as Array<Record<string, string | boolean | undefined>>
        const previousUsers = [...database.usuarios]
        const normalizedEmails = new Set<string>()
        const activeAdminCount = submittedUsers.filter(
          (user) => user.perfil === 'admin' && user.ativo !== false,
        ).length

        if (activeAdminCount === 0) {
          throw new Error('O sistema deve manter pelo menos um administrador ativo.')
        }

        const temporaryCredentials: Array<{ nome: string; email: string; senhaTemporaria: string }> = []

        database.usuarios = submittedUsers.map((user) => {
          const previous = previousUsers.find((candidate) => candidate.id === user.id)
          const nome = typeof user.nome === 'string' ? user.nome.trim() : ''
          const email =
            typeof user.email === 'string' ? user.email.trim().toLowerCase() : ''
          const perfil = typeof user.perfil === 'string' ? user.perfil.trim() : ''
          const areaId =
            typeof user.areaId === 'string' && user.areaId.trim().length > 0 ? user.areaId : undefined
          const senhaTemporaria =
            typeof user.senhaTemporaria === 'string' ? user.senhaTemporaria.trim() : ''

          if (!nome || !email || !perfil) {
            throw new Error('Todos os usuarios devem ter nome, e-mail e perfil.')
          }

          if (!PERFIS_VALIDOS.has(perfil as PerfilUsuario)) {
            throw new Error(`Perfil invalido informado para o usuario ${email}.`)
          }

          if (normalizedEmails.has(email)) {
            throw new Error(`Ja existe um usuario configurado com o e-mail ${email}.`)
          }
          normalizedEmails.add(email)

          if (!previous && !senhaTemporaria) {
            throw new Error(`Informe uma senha temporaria para o novo usuario ${email}.`)
          }

          if (senhaTemporaria) {
            validatePasswordStrength(senhaTemporaria)
            temporaryCredentials.push({
              nome,
              email,
              senhaTemporaria,
            })
          }

          if (previous?.id === currentUser.id && user.ativo === false) {
            throw new Error('Nao e permitido inativar o administrador que esta salvando a configuracao atual.')
          }

          return {
            id: (typeof user.id === 'string' && user.id) || randomUUID(),
            nome,
            email,
            perfil: perfil as PerfilUsuario,
            areaId,
            senhaHash: senhaTemporaria
              ? hashPassword(senhaTemporaria)
              : previous?.senhaHash || hashPassword('ArtGlass@123'),
            deveTrocarSenha: senhaTemporaria ? true : Boolean(previous?.deveTrocarSenha),
            tentativasFalhasLogin: senhaTemporaria ? 0 : previous?.tentativasFalhasLogin ?? 0,
            bloqueadoAte: senhaTemporaria ? undefined : previous?.bloqueadoAte,
            ativo: user.ativo !== false,
            ultimoAcessoEm: previous?.ultimoAcessoEm,
            criadoEm: previous?.criadoEm || new Date().toISOString(),
            atualizadoEm: new Date().toISOString(),
          }
        })

        return {
          settings: database.settings,
          departamentos: database.departamentos,
          usuarios: database.usuarios.map((user) => ({
            id: user.id,
            nome: user.nome,
            email: user.email,
            perfil: user.perfil,
            areaId: user.areaId,
            ativo: user.ativo,
            deveTrocarSenha: Boolean(user.deveTrocarSenha),
            ultimoAcessoEm: user.ultimoAcessoEm,
          })),
          templates: database.templates,
          credenciaisTemporarias: temporaryCredentials,
        }
      }

      return {
        settings: database.settings,
        departamentos: database.departamentos,
        usuarios: database.usuarios.map((user) => ({
          id: user.id,
          nome: user.nome,
          email: user.email,
          perfil: user.perfil,
          areaId: user.areaId,
          ativo: user.ativo,
          deveTrocarSenha: Boolean(user.deveTrocarSenha),
          ultimoAcessoEm: user.ultimoAcessoEm,
        })),
        templates: database.templates,
        credenciaisTemporarias: [],
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message === 'INVALID_JSON'
          ? 'Corpo da requisicao invalido.'
          : error.message
        : 'Nao foi possivel salvar as configuracoes.'
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'FORBIDDEN' ? 403 : 400
    return NextResponse.json({ message }, { status })
  }
}
