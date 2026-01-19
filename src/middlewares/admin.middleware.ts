import { Response, NextFunction } from 'express'
import { AuthRequest } from './auth.middleware'
import { response } from '../utils/response'
import { logger } from '../utils/logger'

/**
 * Admin authorization middleware
 * Must be used AFTER authMiddleware
 * Checks if authenticated user has admin role
 */
export function adminMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    logger.warn('Admin check failed: No user in request', { path: req.path })
    response.unauthorized(res, 'Authentication required')
    return
  }

  if (req.user.role !== 'admin') {
    logger.warn('Admin check failed: User is not admin', {
      path: req.path,
      userId: req.user.userId,
      role: req.user.role,
    })
    response.forbidden(res, 'Admin access required')
    return
  }

  logger.debug('Admin access granted', { userId: req.user.userId })
  next()
}

export default adminMiddleware
