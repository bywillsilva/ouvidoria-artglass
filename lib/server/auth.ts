import { cookies } from 'next/headers'

import { getCapabilitiesForProfile, hasAdminCapability } from '@/lib/admin-access'
import { SESSION_COOKIE_NAME } from '@/lib/auth-constants'
import { createToken, hashOpaqueToken, hashPassword, verifyPassword } from '@/lib/server/security'
import {
  createSessionRecord,
  deleteSessionRecord,
  findActiveUserForAuthentication,
  findSessionContext,
  markUserLoginFailure,
} from '@/lib/server/store'
import type { AppUserRecord, AuthenticatedUserView } from '@/lib/server/schema'
import type { AdminCapability } from '@/lib/admin-access'

export { SESSION_COOKIE_NAME }

const SESSION_DURATION_DAYS = 7
const MAX_FAILED_LOGIN_ATTEMPTS = 5
const ACCOUNT_LOCK_MINUTES = 15
const DUMMY_PASSWORD_HASH = hashPassword('ArtGlass#InvalidDummyCredential2026')

function toUserView(user: AppUserRecord, matrix?: Parameters<typeof getCapabilitiesForProfile>[1]): AuthenticatedUserView {
  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    perfil: user.perfil,
    areaId: user.areaId,
    deveTrocarSenha: Boolean(user.deveTrocarSenha),
    capabilities: getCapabilitiesForProfile(user.perfil, matrix),
  }
}

export async function authenticateUser(email: string, password: string) {
  const user = await findActiveUserForAuthentication(email)
  const passwordIsValid = verifyPassword(password, user?.senhaHash ?? DUMMY_PASSWORD_HASH)

  if (!user) {
    return null
  }

  if (user.bloqueadoAte && new Date(user.bloqueadoAte).getTime() > Date.now()) {
    throw new Error('ACCOUNT_LOCKED')
  }

  if (!passwordIsValid) {
    await markUserLoginFailure(user.id, MAX_FAILED_LOGIN_ATTEMPTS, ACCOUNT_LOCK_MINUTES)
    return null
  }

  return {
    id: user.id,
    perfil: user.perfil,
    deveTrocarSenha: Boolean(user.deveTrocarSenha),
  }
}

export async function createSession(usuarioId: string) {
  const token = createToken()
  const tokenHash = hashOpaqueToken(token)
  const createdAt = new Date()
  const expiresAt = new Date(createdAt.getTime())
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS)

  await createSessionRecord({
      token: tokenHash,
      usuarioId,
      expiraEm: expiresAt.toISOString(),
      criadoEm: createdAt.toISOString(),
  })

  return {
    token,
    expiresAt: expiresAt.toISOString(),
  }
}

export async function destroySession(token: string) {
  const tokenHash = hashOpaqueToken(token)
  await deleteSessionRecord(tokenHash)
}

export async function getUserBySessionToken(token?: string | null) {
  if (!token) {
    return null
  }

  const tokenHash = hashOpaqueToken(token)
  const context = await findSessionContext(tokenHash)
  if (!context) {
    return null
  }

  if (new Date(context.session.expiraEm).getTime() <= Date.now()) {
    await destroySession(token)
    return null
  }

  return toUserView(context.user, context.accessMatrix)
}

export async function getAuthenticatedUser() {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
  return getUserBySessionToken(sessionToken)
}

export async function requireAuthenticatedUser() {
  const user = await getAuthenticatedUser()
  if (!user) {
    throw new Error('UNAUTHORIZED')
  }
  return user
}

export async function requireAdminUser() {
  const user = await requireAuthenticatedUser()
  if (user.perfil !== 'admin') {
    throw new Error('FORBIDDEN')
  }
  return user
}

export async function requireCapability(capability: AdminCapability) {
  const user = await requireAuthenticatedUser()
  if (!hasAdminCapability(user.perfil, capability, user.capabilities)) {
    throw new Error('FORBIDDEN')
  }
  return user
}
