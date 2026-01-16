import { Request, Response, NextFunction } from 'express'
import { AppError } from './app.error'
import { logger } from '../utils/logger'
import { response } from '../utils/response'

/**
 * Centralized error handling middleware
 * Catches all errors thrown in route handlers
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error details
  logger.error('Error caught by handler', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  })

  // Handle known application errors
  if (err instanceof AppError) {
    response.error(res, err.message, err.statusCode, { code: err.code })
    return
  }

  // Handle TypeORM errors
  if (err.name === 'QueryFailedError') {
    response.error(res, 'Database operation failed', 500, { code: 'DB_ERROR' })
    return
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    response.error(res, 'Invalid token', 401, { code: 'INVALID_TOKEN' })
    return
  }

  if (err.name === 'TokenExpiredError') {
    response.error(res, 'Token expired', 401, { code: 'TOKEN_EXPIRED' })
    return
  }

  // Handle unexpected errors
  response.serverError(res, 'An unexpected error occurred')
}

/**
 * Async handler wrapper to catch async errors
 * Wraps async route handlers to forward errors to error middleware
 */
export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * Not found handler for undefined routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  response.notFound(res, `Route ${req.method} ${req.path} not found`)
}
