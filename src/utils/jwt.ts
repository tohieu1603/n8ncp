import jwt, { SignOptions, Algorithm } from 'jsonwebtoken'
import { logger } from './logger'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key'
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '4h') as SignOptions['expiresIn'] // Reduced from 7d to 4h
const JWT_ALGORITHM: Algorithm = 'HS256'
const MIN_SECRET_LENGTH = 64

// SECURITY: Enforce strong JWT secret in production - THROW ERROR, not just log
if (process.env.NODE_ENV === 'production') {
  if (JWT_SECRET === 'your-super-secret-jwt-key') {
    throw new Error('CRITICAL SECURITY ERROR: Using default JWT secret in production! Set JWT_SECRET env variable.')
  }
  if (JWT_SECRET.length < MIN_SECRET_LENGTH) {
    throw new Error(`CRITICAL SECURITY ERROR: JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters in production (current: ${JWT_SECRET.length})`)
  }
}

export interface JwtPayload {
  userId: string
  email: string
  role: 'user' | 'admin'
  iat?: number
  exp?: number
}

export interface JwtResult {
  success: boolean
  payload?: JwtPayload
  error?: string
}

/**
 * Sign JWT token
 */
export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  logger.debug('Signing JWT token', { userId: payload.userId })
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: JWT_ALGORITHM,
  })
}

/**
 * Verify JWT token with error handling
 */
export function verifyToken(token: string): JwtResult {
  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: [JWT_ALGORITHM],
    }) as JwtPayload
    logger.debug('JWT token verified', { userId: payload.userId })
    return { success: true, payload }
  } catch (error) {
    const err = error as Error
    if (err.name === 'TokenExpiredError') {
      logger.warn('JWT token expired')
      return { success: false, error: 'Token expired' }
    }
    if (err.name === 'JsonWebTokenError') {
      logger.warn('JWT token invalid', { message: err.message })
      return { success: false, error: 'Invalid token' }
    }
    logger.error('JWT verification error', err)
    return { success: false, error: 'Token verification failed' }
  }
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload
  } catch {
    return null
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token)
  if (!decoded || !decoded.exp) return true
  return Date.now() >= decoded.exp * 1000
}

export default { signToken, verifyToken, decodeToken, isTokenExpired }
