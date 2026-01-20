import { Router, Request, Response } from 'express'
import passport from 'passport'
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20'
import { AppDataSource } from '../data-source'
import { User } from '../entities'
import { signToken } from '../utils/jwt'
import { response } from '../utils/response'
import { logger } from '../utils/logger'
import { logUsage } from '../services/usage.service'

const router = Router()
const userRepository = () => AppDataSource.getRepository(User)

// Allowed frontend URLs for redirect after OAuth
const ALLOWED_FRONTENDS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(url => url.trim())
const DEFAULT_FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

// Get valid frontend URL from query param, referer, or default
function getRedirectUrl(req: Request): string {
  // Priority 1: Check redirect_uri query parameter (passed from frontend)
  const redirectUri = req.query.redirect_uri as string
  if (redirectUri && ALLOWED_FRONTENDS.includes(redirectUri)) {
    return redirectUri
  }

  // Priority 2: Check referer/origin header
  const referer = req.get('referer') || req.get('origin') || ''
  for (const allowed of ALLOWED_FRONTENDS) {
    if (referer.startsWith(allowed)) {
      return allowed
    }
  }

  return DEFAULT_FRONTEND_URL
}

// Configure Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile: Profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase()
        if (!email) {
          return done(new Error('No email found in Google profile'), undefined)
        }

        // Check if user exists
        let user = await userRepository().findOne({ where: { email } })

        if (user) {
          // Update Google ID and avatar if not set
          if (!user.googleId) {
            user.googleId = profile.id
            user.isEmailVerified = true // Google emails are verified
          }
          if (!user.avatarUrl && profile.photos?.[0]?.value) {
            user.avatarUrl = profile.photos[0].value
          }
          if (!user.name && profile.displayName) {
            user.name = profile.displayName
          }
          await userRepository().save(user)
        } else {
          // Create new user
          user = userRepository().create({
            email,
            googleId: profile.id,
            name: profile.displayName || null,
            avatarUrl: profile.photos?.[0]?.value || null,
            isEmailVerified: true, // Google emails are verified
            password: null, // No password for Google users
          })
          await userRepository().save(user)
          logger.info('New user created via Google OAuth', { userId: user.id, email })
        }

        return done(null, user)
      } catch (error) {
        logger.error('Google OAuth error', error as Error)
        return done(error as Error, undefined)
      }
    }
  )
)

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, (user as User).id)
})

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await userRepository().findOne({ where: { id } })
    done(null, user)
  } catch (error) {
    done(error, null)
  }
})

/**
 * GET /api/auth/google
 * Initiate Google OAuth flow
 * Encodes redirect URL in state to return user to correct frontend
 */
router.get('/google', (req: Request, res, next) => {
  const redirectUrl = getRedirectUrl(req)
  const state = Buffer.from(JSON.stringify({ redirectUrl })).toString('base64')

  logger.debug('Google OAuth initiated', { redirectUrl })

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    state,
    prompt: 'select_account', // Always show account selector
  })(req, res, next)
})

/**
 * GET /api/auth/google/callback
 * Google OAuth callback - redirects to frontend with token
 */
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${DEFAULT_FRONTEND_URL}?error=google_auth_failed`,
  }),
  async (req: Request, res: Response) => {
    // Parse redirect URL from state parameter
    let frontendUrl = DEFAULT_FRONTEND_URL
    try {
      const state = req.query.state as string
      if (state) {
        const decoded = JSON.parse(Buffer.from(state, 'base64').toString())
        if (decoded.redirectUrl && ALLOWED_FRONTENDS.includes(decoded.redirectUrl)) {
          frontendUrl = decoded.redirectUrl
        }
      }
    } catch {
      // Use default if state parsing fails
    }

    try {
      const user = req.user as User
      if (!user) {
        return res.redirect(`${frontendUrl}?error=no_user`)
      }

      // Generate JWT token
      const token = signToken({ userId: user.id, email: user.email, role: user.role })

      // Log activity
      await logUsage({
        userId: user.id,
        action: 'google_login',
        success: true,
        metadata: { ip: req.ip, userAgent: req.get('user-agent') },
      })

      logger.info('User logged in via Google', { userId: user.id, email: user.email, redirectTo: frontendUrl })

      // Redirect to frontend with token
      res.redirect(`${frontendUrl}/auth/callback?token=${token}`)
    } catch (error) {
      logger.error('Google callback error', error as Error)
      res.redirect(`${frontendUrl}?error=callback_failed`)
    }
  }
)

/**
 * POST /api/auth/google/token
 * Exchange Google ID token for JWT (for frontend Google Sign-In)
 */
router.post('/google/token', async (req: Request, res: Response) => {
  try {
    const { credential, clientId } = req.body

    if (!credential) {
      return response.badRequest(res, 'Google credential is required')
    }

    // Verify the Google ID token
    const { OAuth2Client } = await import('google-auth-library')
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId || process.env.GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()
    if (!payload || !payload.email) {
      return response.badRequest(res, 'Invalid Google token')
    }

    const email = payload.email.toLowerCase()
    const googleId = payload.sub
    const name = payload.name || null
    const avatarUrl = payload.picture || null

    // Check if user exists
    let user = await userRepository().findOne({ where: { email } })

    if (user) {
      // Update Google ID if not set
      if (!user.googleId) {
        user.googleId = googleId
        user.isEmailVerified = true
      }
      if (!user.avatarUrl && avatarUrl) {
        user.avatarUrl = avatarUrl
      }
      if (!user.name && name) {
        user.name = name
      }
      await userRepository().save(user)
    } else {
      // Create new user
      user = userRepository().create({
        email,
        googleId,
        name,
        avatarUrl,
        isEmailVerified: true,
        password: null,
      })
      await userRepository().save(user)
      logger.info('New user created via Google Sign-In', { userId: user.id, email })
    }

    // Generate JWT token
    const token = signToken({ userId: user.id, email: user.email, role: user.role })

    // Log activity
    await logUsage({
      userId: user.id,
      action: 'google_login',
      success: true,
      metadata: { ip: req.ip, userAgent: req.get('user-agent') },
    })

    logger.info('User logged in via Google Sign-In', { userId: user.id, email: user.email })

    return response.success(res, {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        creditsUsed: user.creditsUsed,
        totalSpentUsd: user.totalSpentUsd,
        tokenBalance: Number(user.tokenBalance),
        isPro: user.isPro,
        proExpiresAt: user.proExpiresAt,
      },
    })
  } catch (error) {
    logger.error('Google token exchange error', error as Error)
    return response.serverError(res, 'Google authentication failed')
  }
})

export default router
