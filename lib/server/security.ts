import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto'

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, saved] = storedHash.split(':')
  if (!salt || !saved) {
    return false
  }

  const hashedBuffer = scryptSync(password, salt, 64)
  const savedBuffer = Buffer.from(saved, 'hex')

  if (hashedBuffer.length !== savedBuffer.length) {
    return false
  }

  return timingSafeEqual(hashedBuffer, savedBuffer)
}

export function createToken(length = 32) {
  return randomBytes(length).toString('hex')
}

export function hashOpaqueToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}
