import jwt, { SignOptions, Algorithm } from 'jsonwebtoken'
import { logger } from './logger'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key'
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn']
const JWT_ALGORITHM: Algorithm = 'HS256'

// Warn if using default/weak secret in production
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'your-super-secret-jwt-key') {
  logger.error('SECURITY WARNING: Using default JWT secret in production! Set JWT_SECRET env variable.')
}
if (process.env.NODE_ENV === 'production' && JWT_SECRET.length < 32) {
  logger.warn('SECURITY WARNING: JWT_SECRET should be at least 32 characters long')
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
