import bcrypt from 'bcryptjs'
import { userRepository } from '../repositories/user.repository'
import { emailVerificationRepository } from '../repositories/email-verification.repository'
import { signToken } from '../utils/jwt'
import { logger } from '../utils/logger'
import { logUsage } from './usage.service'
import { generateVerificationCode, sendVerificationEmail } from './email.service'
import {
  ValidationError,
  UnauthorizedError,
  ConflictError,
  NotFoundError,
  RateLimitError,
  ForbiddenError
} from '../errors/app.error'
import { User } from '../entities/user.entity'

// Verification code expiry time (15 minutes)
const VERIFICATION_EXPIRY_MINUTES = 15

// Rate limiting for registration (prevent spam)
const registrationAttempts = new Map<string, { count: number; firstAttempt: number }>()
const REGISTRATION_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const MAX_REGISTRATIONS_PER_IP = 5
const MAX_REGISTRATIONS_PER_EMAIL = 3

// Cleanup old rate limit entries every 10 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, data] of registrationAttempts.entries()) {
    if (now - data.firstAttempt > REGISTRATION_WINDOW_MS) {
      registrationAttempts.delete(key)
    }
  }
}, 10 * 60 * 1000)

export interface UserResponse {
  id: string
  email: string
  name: string | null
  role: 'user' | 'admin'
  creditsUsed: number
  totalSpentUsd: number
  tokenBalance: number
  isPro: boolean
  proExpiresAt: Date | null
  createdAt?: Date
}

export interface AuthResponse {
  token: string
  user: UserResponse
}

export interface RegisterResponse {
  message: string
  email: string
  requiresVerification: boolean
}

/**
 * Format user data for API response
 */
function formatUserResponse(user: User, includeCreatedAt = false): UserResponse {
  const response: UserResponse = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    creditsUsed: user.creditsUsed,
    totalSpentUsd: user.totalSpentUsd,
    tokenBalance: Number(user.tokenBalance),
    isPro: user.isPro,
    proExpiresAt: user.proExpiresAt,
  }
  if (includeCreatedAt) {
    response.createdAt = user.createdAt
  }
  return response
}

/**
 * Auth Service - handles all authentication business logic
 */
export class AuthService {
  /**
   * Check rate limit for registration
   */
  checkRegistrationRateLimit(ip: string, email: string): void {
    const now = Date.now()
    const ipKey = `ip:${ip}`
    const emailKey = `email:${email.toLowerCase()}`

    // Check IP rate limit
    const ipData = registrationAttempts.get(ipKey)
    if (ipData) {
      if (now - ipData.firstAttempt > REGISTRATION_WINDOW_MS) {
        registrationAttempts.set(ipKey, { count: 1, firstAttempt: now })
      } else if (ipData.count >= MAX_REGISTRATIONS_PER_IP) {
        const waitMinutes = Math.ceil((REGISTRATION_WINDOW_MS - (now - ipData.firstAttempt)) / 60000)
        throw new RateLimitError(`Quá nhiều lần đăng ký. Vui lòng thử lại sau ${waitMinutes} phút.`)
      } else {
        ipData.count++
      }
    } else {
      registrationAttempts.set(ipKey, { count: 1, firstAttempt: now })
    }

    // Check email rate limit
    const emailData = registrationAttempts.get(emailKey)
    if (emailData) {
      if (now - emailData.firstAttempt > REGISTRATION_WINDOW_MS) {
        registrationAttempts.set(emailKey, { count: 1, firstAttempt: now })
      } else if (emailData.count >= MAX_REGISTRATIONS_PER_EMAIL) {
        const waitMinutes = Math.ceil((REGISTRATION_WINDOW_MS - (now - emailData.firstAttempt)) / 60000)
        throw new RateLimitError(`Email này đã yêu cầu quá nhiều lần. Vui lòng thử lại sau ${waitMinutes} phút.`)
      } else {
        emailData.count++
      }
    } else {
      registrationAttempts.set(emailKey, { count: 1, firstAttempt: now })
    }
  }

  /**
   * Register a new user
   */
  async register(
    email: string,
    password: string,
    name?: string,
    metadata?: { ip?: string; userAgent?: string }
  ): Promise<RegisterResponse> {
    // Check existing user
    const existingUser = await userRepository.findByEmail(email)
    if (existingUser) {
      if (!existingUser.isEmailVerified) {
        // Allow re-registration for unverified users
        await emailVerificationRepository.deleteByUserId(existingUser.id)
        await userRepository.delete(existingUser.id)
      } else {
        throw new ConflictError('Email already registered')
      }
    }

    // Create user
    const hashedPassword = await bcrypt.hash(password, 12)
    const user = await userRepository.create({
      email,
      password: hashedPassword,
      name: name || null,
      isEmailVerified: false,
    })

    logger.info('User registered (pending verification)', { userId: user.id, email: user.email })

    // Generate and save verification code
    const code = generateVerificationCode()
    await emailVerificationRepository.createVerification(user.id, code, VERIFICATION_EXPIRY_MINUTES)

    // Send verification email
    await sendVerificationEmail(email, code)

    // Log activity
    await logUsage({
      userId: user.id,
      action: 'register',
      success: true,
      metadata,
    })

    return {
      message: 'Verification code sent to your email',
      email,
      requiresVerification: true,
    }
  }

  /**
   * Verify email with code
   */
  async verifyEmail(email: string, code: string): Promise<AuthResponse> {
    const user = await userRepository.findByEmail(email)
    if (!user) {
      throw new NotFoundError('User')
    }

    if (user.isEmailVerified) {
      throw new ValidationError('Email already verified')
    }

    // Check verification code
    const isValid = await emailVerificationRepository.isCodeValid(user.id, code)
    if (!isValid) {
      throw new ValidationError('Invalid or expired verification code')
    }

    // Mark user as verified
    user.isEmailVerified = true
    await userRepository.save(user)

    // Delete used verification codes
    await emailVerificationRepository.deleteByUserId(user.id)

    logger.info('Email verified', { userId: user.id, email: user.email })

    // Generate token
    const token = signToken({ userId: user.id, email: user.email, role: user.role })

    return {
      token,
      user: formatUserResponse(user),
    }
  }

  /**
   * Resend verification code
   */
  async resendVerification(email: string): Promise<{ message: string }> {
    const user = await userRepository.findByEmail(email)
    if (!user) {
      // Don't reveal if user exists
      return { message: 'If the email exists, a new code will be sent' }
    }

    if (user.isEmailVerified) {
      throw new ValidationError('Email already verified')
    }

    // Rate limit: Check if code was sent recently (within 1 minute)
    const recentVerification = await emailVerificationRepository.findByUserId(user.id)
    if (recentVerification) {
      const timeSinceLastCode = Date.now() - recentVerification.createdAt.getTime()
      if (timeSinceLastCode < 60 * 1000) {
        const waitSeconds = Math.ceil((60 * 1000 - timeSinceLastCode) / 1000)
        throw new RateLimitError(`Please wait ${waitSeconds} seconds before requesting a new code`)
      }
    }

    // Generate new code (this also deletes old codes)
    const code = generateVerificationCode()
    await emailVerificationRepository.createVerification(user.id, code, VERIFICATION_EXPIRY_MINUTES)

    // Send email
    await sendVerificationEmail(email, code)

    logger.info('Verification code resent', { userId: user.id, email: user.email })

    return { message: 'Verification code sent' }
  }

  /**
   * Login user
   */
  async login(
    email: string,
    password: string,
    metadata?: { ip?: string; userAgent?: string }
  ): Promise<AuthResponse> {
    const user = await userRepository.findByEmail(email)
    if (!user || !user.password) {
      throw new UnauthorizedError('Invalid credentials')
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials')
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      throw new ForbiddenError('Please verify your email before logging in')
    }

    // Check if active
    if (!user.isActive) {
      throw new UnauthorizedError('Account is disabled')
    }

    logger.info('User logged in', { userId: user.id, email: user.email })

    // Log activity
    await logUsage({
      userId: user.id,
      action: 'login',
      success: true,
      metadata,
    })

    // Generate token
    const token = signToken({ userId: user.id, email: user.email, role: user.role })

    return {
      token,
      user: formatUserResponse(user),
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser(userId: string): Promise<UserResponse> {
    const user = await userRepository.findById(userId)
    if (!user) {
      throw new NotFoundError('User')
    }
    return formatUserResponse(user, true)
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: { name?: string }): Promise<UserResponse> {
    const user = await userRepository.findById(userId)
    if (!user) {
      throw new NotFoundError('User')
    }

    if (data.name !== undefined) {
      user.name = data.name || null
    }

    await userRepository.save(user)
    logger.info('User profile updated', { userId: user.id })

    return formatUserResponse(user, true)
  }

  /**
   * Deactivate user account (soft delete)
   */
  async deactivateAccount(userId: string): Promise<{ message: string }> {
    const user = await userRepository.findById(userId)
    if (!user) {
      throw new NotFoundError('User')
    }

    user.isActive = false
    await userRepository.save(user)

    logger.info('User account deactivated', { userId: user.id, email: user.email })

    return { message: 'Account deactivated successfully' }
  }

  /**
   * Login with Google OAuth
   */
  async loginWithGoogle(
    googleId: string,
    email: string,
    name?: string,
    avatarUrl?: string
  ): Promise<AuthResponse> {
    // Find user by Google ID or email
    let user = await userRepository.findByGoogleId(googleId)

    if (!user) {
      // Check if email already exists (link accounts)
      user = await userRepository.findByEmail(email)
      if (user) {
        // Link Google ID to existing account
        user.googleId = googleId
        if (avatarUrl) user.avatarUrl = avatarUrl
        if (!user.isEmailVerified) user.isEmailVerified = true
        await userRepository.save(user)
      } else {
        // Create new user
        user = await userRepository.create({
          email,
          googleId,
          name: name || null,
          avatarUrl: avatarUrl || null,
          password: null,
          isEmailVerified: true, // Google accounts are pre-verified
        })
      }
      logger.info('Google OAuth user created/linked', { userId: user.id, email })
    }

    // Generate token
    const token = signToken({ userId: user.id, email: user.email, role: user.role })

    return {
      token,
      user: formatUserResponse(user),
    }
  }
}

// Singleton instance
export const authService = new AuthService()
