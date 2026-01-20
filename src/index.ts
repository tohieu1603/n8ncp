import 'reflect-metadata'
import 'dotenv/config'

// SECURITY: Validate environment variables before anything else
import { validateEnvironment } from './utils/env-validation'
validateEnvironment()

import express from 'express'
import cors from 'cors'
import { AppDataSource } from './data-source'
import { authRoutes, generateRoutes, usageRoutes, downloadRoutes, chatRoutes, keysRoutes, billingRoutes, convertRoutes, adminRoutes, articleImageRoutes, blogRoutes } from './routes'
import openaiRoutes from './routes/openai.routes'
import googleAuthRoutes from './routes/google-auth.routes'
import { billingController } from './controllers/billing.controller'
import passport from 'passport'
import {
  requestLogger,
  generalLimiter,
  authLimiter,
  registerLimiter,
  generateLimiter,
  billingLimiter,
  chatLimiter,
  keysLimiter,
  openaiApiLimiter,
  securityHeaders,
  inputSanitization,
} from './middlewares'
import { logger } from './utils'
import { setupSwagger } from './swagger'

const app = express()
const PORT = process.env.PORT || 4000

// Security & Core Middleware
app.use(securityHeaders) // Security headers (XSS, clickjacking, etc.)
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json({ limit: '5mb' })) // Reduced from 10mb for security
app.use(requestLogger)

// Swagger API Documentation
setupSwagger(app)
app.use(inputSanitization) // Check for attack patterns

// SePay webhook routes - BEFORE rate limiter to allow external callbacks
app.post('/api/billing/webhook', (req, res) => billingController.handleWebhook(req, res))
app.post('/api/sepay/webhook', (req, res) => billingController.handleWebhook(req, res))

app.use(generalLimiter) // Apply general rate limit to all routes
app.use(passport.initialize()) // Initialize passport for Google OAuth

// Routes with specific rate limits
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', registerLimiter)
app.use('/api/auth', authRoutes)
app.use('/api/auth', googleAuthRoutes) // Google OAuth routes
app.use('/api/generate', generateLimiter, generateRoutes)
app.use('/api/usage', usageRoutes)
app.use('/api/download', downloadRoutes)
app.use('/api/chat', chatLimiter, chatRoutes)
app.use('/api/keys', keysLimiter, keysRoutes)
app.use('/api/billing', billingLimiter, billingRoutes)
app.use('/api/sepay', billingRoutes) // Alias for SePay webhook
app.use('/api/convert', convertRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/article-images', generateLimiter, articleImageRoutes)
app.use('/api/blog', blogRoutes)

// OpenAI-compatible API (for external API key access)
app.use('/v1', openaiApiLimiter, openaiRoutes)

// Health check
app.get('/health', (_, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  })
})

// 404 handler
app.use((_, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
  })
})

// Initialize database and start server
AppDataSource.initialize()
  .then(() => {
    logger.info('Database connected successfully')

    app.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`)
    })
  })
  .catch((error) => {
    logger.error('Database connection failed', error)
    process.exit(1)
  })
