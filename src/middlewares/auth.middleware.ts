import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt'
import { response } from '../utils/response'
import { logger } from '../utils/logger'
import type { JwtPayload } from '../utils/jwt'

export interface AuthRequest extends Request {
  user?: JwtPayload
}

/**
 * JWT Authentication middleware
 * Validates Bearer token and attaches user to request
 */
export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Auth failed: No token provided', { path: req.path })
    return response.unauthorized(res, 'No token provided')
  }

  const token = authHeader.split(' ')[1]
  const result = verifyToken(token)

  if (!result.success || !result.payload) {
    logger.warn('Auth failed: Invalid token', { path: req.path, error: result.error })
    return response.unauthorized(res, result.error || 'Invalid token')
  }

  req.user = result.payload
  next()
}

/**
 * Optional auth middleware - doesn't fail if no token
 */
export function optionalAuthMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    const result = verifyToken(token)

    if (result.success && result.payload) {
      req.user = result.payload
    }
  }

  next()
}

export default authMiddleware
