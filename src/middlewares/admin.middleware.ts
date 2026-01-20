import { Response, NextFunction } from 'express'
import { AuthRequest } from './auth.middleware'
import { response } from '../utils/response'
import { logger } from '../utils/logger'
import { AppDataSource } from '../data-source'
import { User } from '../entities'

/**
 * Admin authorization middleware
 * Must be used AFTER authMiddleware
 * SECURITY: Verifies admin role from DATABASE, not just JWT payload
 * This prevents forged tokens and ensures role changes are reflected immediately
 */
export async function adminMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    logger.warn('Admin check failed: No user in request', { path: req.path })
    response.unauthorized(res, 'Authentication required')
    return
  }

  // Quick check from JWT first
  if (req.user.role !== 'admin') {
    logger.warn('Admin check failed: User is not admin', {
      path: req.path,
      userId: req.user.userId,
      role: req.user.role,
    })
    response.forbidden(res, 'Admin access required')
    return
  }

  // SECURITY: Verify role from database (in case JWT was forged or role changed)
  try {
    const userRepo = AppDataSource.getRepository(User)
    const user = await userRepo.findOne({
      where: { id: req.user.userId, isActive: true },
      select: ['id', 'role', 'isActive'],
    })

    if (!user) {
      logger.warn('Admin check failed: User not found in DB', { userId: req.user.userId })
      response.unauthorized(res, 'User not found')
      return
    }

    if (user.role !== 'admin') {
      logger.warn('Admin check failed: Role mismatch (JWT vs DB)', {
        userId: req.user.userId,
        jwtRole: req.user.role,
        dbRole: user.role,
      })
      response.forbidden(res, 'Admin access required')
      return
    }

    logger.debug('Admin access granted (DB verified)', { userId: req.user.userId })
    next()
  } catch (error) {
    logger.error('Admin middleware DB error', error as Error)
    response.serverError(res, 'Authorization check failed')
  }
}

export default adminMiddleware
