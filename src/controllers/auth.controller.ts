import { Request, Response } from 'express'
import { authService } from '../services/auth.service'
import { response } from '../utils/response'
import { validate } from '../utils/validation'
import { logger } from '../utils/logger'
import { AuthRequest } from '../middlewares/auth.middleware'
import { AppError } from '../errors/app.error'

/**
 * Auth Controller - handles HTTP layer for authentication
 * Delegates business logic to AuthService
 */
export class AuthController {
  /**
   * POST /api/auth/register
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, name } = req.body

      // Validation
      if (validate.isEmpty(email) || validate.isEmpty(password)) {
        response.badRequest(res, 'Email and password are required')
        return
      }

      // Sanitize and validate email
      const sanitizedEmail = validate.sanitizeString(email, 255).toLowerCase()
      if (!validate.isEmail(sanitizedEmail)) {
        response.badRequest(res, 'Invalid email format')
        return
      }

      // Check for malicious input
      if (validate.containsXSS(email) || validate.containsSQLInjection(email)) {
        logger.warn('Malicious input in registration', { ip: req.ip, email: email.substring(0, 50) })
        response.badRequest(res, 'Invalid input')
        return
      }

      // Password validation
      if (typeof password !== 'string' || password.length < 8) {
        response.badRequest(res, 'Password must be at least 8 characters')
        return
      }
      if (!/[0-9]/.test(password) || !/[a-zA-Z]/.test(password)) {
        response.badRequest(res, 'Password must contain at least 1 letter and 1 number')
        return
      }
      if (password.length > 128) {
        response.badRequest(res, 'Password is too long')
        return
      }

      // Rate limit check
      authService.checkRegistrationRateLimit(req.ip || 'unknown', sanitizedEmail)

      const result = await authService.register(
        sanitizedEmail,
        password,
        name ? validate.sanitizeString(name, 100) : undefined,
        { ip: req.ip, userAgent: req.get('user-agent') }
      )

      response.created(res, result, 'Please check your email for verification code')
    } catch (error) {
      this.handleError(res, error, 'Registration failed')
    }
  }

  /**
   * POST /api/auth/verify-email
   */
  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { email, code } = req.body

      if (validate.isEmpty(email) || validate.isEmpty(code)) {
        response.badRequest(res, 'Email and verification code are required')
        return
      }

      const sanitizedEmail = validate.sanitizeString(email, 255).toLowerCase()
      if (!validate.isEmail(sanitizedEmail)) {
        response.badRequest(res, 'Invalid email format')
        return
      }

      if (!/^\d{6}$/.test(code)) {
        response.badRequest(res, 'Invalid verification code format')
        return
      }

      const result = await authService.verifyEmail(sanitizedEmail, code)
      response.success(res, result)
    } catch (error) {
      this.handleError(res, error, 'Verification failed')
    }
  }

  /**
   * POST /api/auth/resend-verification
   */
  async resendVerification(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body

      if (validate.isEmpty(email)) {
        response.badRequest(res, 'Email is required')
        return
      }

      const sanitizedEmail = validate.sanitizeString(email, 255).toLowerCase()
      if (!validate.isEmail(sanitizedEmail)) {
        response.badRequest(res, 'Invalid email format')
        return
      }

      const result = await authService.resendVerification(sanitizedEmail)
      response.success(res, result)
    } catch (error) {
      this.handleError(res, error, 'Failed to resend verification code')
    }
  }

  /**
   * POST /api/auth/login
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body

      if (validate.isEmpty(email) || validate.isEmpty(password)) {
        response.badRequest(res, 'Email and password are required')
        return
      }

      const sanitizedEmail = validate.sanitizeString(email, 255).toLowerCase()
      if (!validate.isEmail(sanitizedEmail)) {
        response.unauthorized(res, 'Invalid credentials')
        return
      }

      // Check for malicious patterns
      if (validate.containsXSS(email) || validate.containsSQLInjection(email)) {
        logger.warn('Malicious input in login', { ip: req.ip })
        response.unauthorized(res, 'Invalid credentials')
        return
      }

      const result = await authService.login(
        sanitizedEmail,
        password,
        { ip: req.ip, userAgent: req.get('user-agent') }
      )

      response.success(res, result)
    } catch (error) {
      // For login, use generic error to not reveal info
      if (error instanceof AppError && error.code === 'FORBIDDEN') {
        response.error(res, error.message, 403, {
          requiresVerification: true,
        })
        return
      }
      this.handleError(res, error, 'Login failed', true)
    }
  }

  /**
   * GET /api/auth/me
   */
  async getMe(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await authService.getCurrentUser(req.user!.userId)
      response.success(res, result)
    } catch (error) {
      this.handleError(res, error, 'Failed to get user')
    }
  }

  /**
   * PUT /api/auth/profile
   */
  async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name } = req.body
      const sanitizedName = name ? validate.sanitizeString(name, 100) : undefined

      const result = await authService.updateProfile(req.user!.userId, { name: sanitizedName })
      response.success(res, result)
    } catch (error) {
      this.handleError(res, error, 'Failed to update profile')
    }
  }

  /**
   * DELETE /api/auth/account
   * Deactivate account (soft delete)
   */
  async deactivateAccount(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await authService.deactivateAccount(req.user!.userId)
      response.success(res, result)
    } catch (error) {
      this.handleError(res, error, 'Failed to deactivate account')
    }
  }

  /**
   * Centralized error handler
   */
  private handleError(res: Response, error: unknown, defaultMessage: string, useGeneric = false): void {
    if (error instanceof AppError) {
      if (useGeneric && error.statusCode === 401) {
        response.unauthorized(res, 'Invalid credentials')
      } else {
        response.error(res, error.message, error.statusCode, { code: error.code })
      }
      return
    }

    logger.error(defaultMessage, error as Error)
    response.serverError(res, defaultMessage)
  }
}

// Singleton instance
export const authController = new AuthController()
