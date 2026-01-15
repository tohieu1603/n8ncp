import { Response } from 'express'

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export const response = {
  /**
   * Send success response
   */
  success<T>(res: Response, data: T, statusCode = 200): Response {
    return res.status(statusCode).json({
      success: true,
      data,
    } as ApiResponse<T>)
  },

  /**
   * Send success with message
   */
  message(res: Response, message: string, statusCode = 200): Response {
    return res.status(statusCode).json({
      success: true,
      message,
    } as ApiResponse)
  },

  /**
   * Send created response (201)
   */
  created<T>(res: Response, data: T, message?: string): Response {
    return res.status(201).json({
      success: true,
      data,
      message,
    } as ApiResponse<T>)
  },

  /**
   * Send error response
   */
  error(res: Response, message: string, statusCode = 500): Response {
    return res.status(statusCode).json({
      success: false,
      error: message,
    } as ApiResponse)
  },

  /**
   * Send bad request error (400)
   */
  badRequest(res: Response, message: string): Response {
    return this.error(res, message, 400)
  },

  /**
   * Send unauthorized error (401)
   */
  unauthorized(res: Response, message = 'Unauthorized'): Response {
    return this.error(res, message, 401)
  },

  /**
   * Send forbidden error (403)
   */
  forbidden(res: Response, message = 'Forbidden'): Response {
    return this.error(res, message, 403)
  },

  /**
   * Send not found error (404)
   */
  notFound(res: Response, message = 'Not found'): Response {
    return this.error(res, message, 404)
  },

  /**
   * Send internal server error (500)
   */
  serverError(res: Response, message = 'Internal server error'): Response {
    return this.error(res, message, 500)
  },
}

export default response
