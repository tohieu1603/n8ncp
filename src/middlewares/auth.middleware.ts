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
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authReq = req as AuthRequest
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Auth failed: No token provided', { path: req.path })
    response.unauthorized(res, 'No token provided')
    return
  }

  const token = authHeader.split(' ')[1]
  const result = verifyToken(token)

  if (!result.success || !result.payload) {
    logger.warn('Auth failed: Invalid token', { path: req.path, error: result.error })
    response.unauthorized(res, result.error || 'Invalid token')
    return
  }

  authReq.user = result.payload
  next()
}

/**
 * Optional auth middleware - doesn't fail if no token
 */
export function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authReq = req as AuthRequest
  const authHeader = req.headers.authorization

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    const result = verifyToken(token)

    if (result.success && result.payload) {
      authReq.user = result.payload
    }
  }

  next()
}

export default authMiddleware
