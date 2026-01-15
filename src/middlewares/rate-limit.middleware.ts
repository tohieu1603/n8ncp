import rateLimit from 'express-rate-limit'
import { response } from '../utils/response'
import { logger } from '../utils/logger'

/**
 * Rate limiting configuration for different endpoints
 * Protects against brute force, DoS, and abuse
 */

// General API rate limit: 100 requests per minute
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      type: 'general',
    })
    response.error(res, 'Too many requests, please try again later', 429)
  },
})

// Strict rate limit for auth endpoints: 5 requests per minute
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      email: req.body?.email,
    })
    response.error(res, 'Too many login attempts, please try again after 1 minute', 429)
  },
})

// Rate limit for registration: 3 per hour per IP
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many accounts created, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Registration rate limit exceeded', {
      ip: req.ip,
    })
    response.error(res, 'Too many accounts created, please try again later', 429)
  },
})

// Rate limit for image generation: 30 per minute
export const generateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: 'Too many generation requests',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Generate rate limit exceeded', {
      ip: req.ip,
      userId: (req as any).user?.userId,
    })
    response.error(res, 'Too many generation requests, please slow down', 429)
  },
})

// Rate limit for billing/payment: 10 per minute
export const billingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many payment requests',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Billing rate limit exceeded', {
      ip: req.ip,
    })
    response.error(res, 'Too many payment requests, please try again later', 429)
  },
})

// Rate limit for chat: 60 per minute
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: 'Too many chat requests',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Chat rate limit exceeded', {
      ip: req.ip,
      userId: (req as any).user?.userId,
    })
    response.error(res, 'Too many chat requests, please slow down', 429)
  },
})

// Rate limit for API key management: 20 per minute
export const keysLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: 'Too many API key requests',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Keys rate limit exceeded', {
      ip: req.ip,
    })
    response.error(res, 'Too many requests, please try again later', 429)
  },
})

// Rate limit for OpenAI-compatible API: 120 per minute
export const openaiApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  message: 'Too many API requests',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use API key as identifier if available, otherwise IP
    const apiKey = req.headers.authorization?.replace('Bearer ', '')
    return apiKey || req.ip || 'unknown'
  },
  handler: (req, res) => {
    logger.warn('OpenAI API rate limit exceeded', {
      ip: req.ip,
    })
    response.error(res, 'Rate limit exceeded. Please slow down.', 429)
  },
})
