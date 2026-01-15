import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { AppDataSource } from '../data-source'
import { User } from '../entities'
import { signToken } from '../utils/jwt'
import { response } from '../utils/response'
import { validate } from '../utils/validation'
import { logger } from '../utils/logger'
import { logUsage } from '../services/usage.service'
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware'

const router = Router()
const userRepository = () => AppDataSource.getRepository(User)

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body

    // Validation
    if (validate.isEmpty(email) || validate.isEmpty(password)) {
      return response.badRequest(res, 'Email and password are required')
    }

    // Sanitize and validate email
    const sanitizedEmail = validate.sanitizeString(email, 255).toLowerCase()
    if (!validate.isEmail(sanitizedEmail)) {
      return response.badRequest(res, 'Invalid email format')
    }

    // Check for XSS/SQL injection in email
    if (validate.containsXSS(email) || validate.containsSQLInjection(email)) {
      logger.warn('Malicious input in registration', { ip: req.ip, email: email.substring(0, 50) })
      return response.badRequest(res, 'Invalid input')
    }

    // Password validation - must have at least 8 chars, 1 number, 1 letter
    if (typeof password !== 'string' || password.length < 8) {
      return response.badRequest(res, 'Password must be at least 8 characters')
    }
    if (!/[0-9]/.test(password) || !/[a-zA-Z]/.test(password)) {
      return response.badRequest(res, 'Password must contain at least 1 letter and 1 number')
    }
    if (password.length > 128) {
      return response.badRequest(res, 'Password is too long')
    }

    // Check existing user (use sanitized email)
    const existingUser = await userRepository().findOne({ where: { email: sanitizedEmail } })
    if (existingUser) {
      return response.badRequest(res, 'Email already registered')
    }

    // Create user
    const hashedPassword = await bcrypt.hash(password, 12)
    const user = userRepository().create({
      email: sanitizedEmail,
      password: hashedPassword,
      name: name ? validate.sanitizeString(name, 100) : null,
    })

    await userRepository().save(user)
    logger.info('User registered', { userId: user.id, email: user.email })

    // Log activity
    await logUsage({
      userId: user.id,
      action: 'register',
      success: true,
      metadata: { ip: req.ip, userAgent: req.get('user-agent') },
    })

    // Generate token
    const token = signToken({ userId: user.id, email: user.email })

    return response.created(res, {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    }, 'Registration successful')
  } catch (error) {
    logger.error('Register error', error as Error)
    return response.serverError(res, 'Registration failed')
  }
})

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    // Validation
    if (validate.isEmpty(email) || validate.isEmpty(password)) {
      return response.badRequest(res, 'Email and password are required')
    }

    // Sanitize email
    const sanitizedEmail = validate.sanitizeString(email, 255).toLowerCase()
    if (!validate.isEmail(sanitizedEmail)) {
      return response.unauthorized(res, 'Invalid credentials')
    }

    // Check for malicious patterns (log but use generic error)
    if (validate.containsXSS(email) || validate.containsSQLInjection(email)) {
      logger.warn('Malicious input in login', { ip: req.ip })
      return response.unauthorized(res, 'Invalid credentials')
    }

    // Find user (use sanitized email)
    const user = await userRepository().findOne({ where: { email: sanitizedEmail } })
    if (!user) {
      return response.unauthorized(res, 'Invalid credentials')
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return response.unauthorized(res, 'Invalid credentials')
    }

    // Check if active
    if (!user.isActive) {
      return response.unauthorized(res, 'Account is disabled')
    }

    logger.info('User logged in', { userId: user.id, email: user.email })

    // Log activity
    await logUsage({
      userId: user.id,
      action: 'login',
      success: true,
      metadata: { ip: req.ip, userAgent: req.get('user-agent') },
    })

    // Generate token
    const token = signToken({ userId: user.id, email: user.email })

    return response.success(res, {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        creditsUsed: user.creditsUsed,
        totalSpentUsd: user.totalSpentUsd,
        tokenBalance: Number(user.tokenBalance),
        tokenLimit: Number(user.tokenLimit),
        isPro: user.isPro,
        proExpiresAt: user.proExpiresAt,
      },
    })
  } catch (error) {
    logger.error('Login error', error as Error)
    return response.serverError(res, 'Login failed')
  }
})

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await userRepository().findOne({
      where: { id: req.user!.userId },
    })

    if (!user) {
      return response.notFound(res, 'User not found')
    }

    return response.success(res, {
      id: user.id,
      email: user.email,
      name: user.name,
      creditsUsed: user.creditsUsed,
      totalSpentUsd: user.totalSpentUsd,
      tokenBalance: Number(user.tokenBalance),
      tokenLimit: Number(user.tokenLimit),
      isPro: user.isPro,
      proExpiresAt: user.proExpiresAt,
      createdAt: user.createdAt,
    })
  } catch (error) {
    logger.error('Get user error', error as Error)
    return response.serverError(res, 'Failed to get user')
  }
})

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body
    const user = await userRepository().findOne({
      where: { id: req.user!.userId },
    })

    if (!user) {
      return response.notFound(res, 'User not found')
    }

    // Update fields
    if (name !== undefined) {
      user.name = name ? validate.sanitizeString(name, 100) : null
    }

    await userRepository().save(user)
    logger.info('User profile updated', { userId: user.id })

    return response.success(res, {
      id: user.id,
      email: user.email,
      name: user.name,
      creditsUsed: user.creditsUsed,
      totalSpentUsd: user.totalSpentUsd,
      isPro: user.isPro,
      proExpiresAt: user.proExpiresAt,
      createdAt: user.createdAt,
    })
  } catch (error) {
    logger.error('Update profile error', error as Error)
    return response.serverError(res, 'Failed to update profile')
  }
})

export default router
