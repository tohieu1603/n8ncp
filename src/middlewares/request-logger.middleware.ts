import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'
import { AuthRequest } from './auth.middleware'

/**
 * Request logging middleware
 * Logs all incoming requests with timing
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now()

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime
    const userId = (req as AuthRequest).user?.userId

    logger.request(
      req.method,
      req.originalUrl,
      res.statusCode,
      duration,
      userId
    )
  })

  next()
}

export default requestLogger
