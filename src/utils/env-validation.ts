/**
 * Environment Variable Validation
 * SECURITY: Validates all required env vars on startup
 * Fails fast if critical configuration is missing
 */

import { logger } from './logger'

interface EnvVar {
  name: string
  required: boolean
  minLength?: number
  pattern?: RegExp
  description: string
}

const ENV_VARS: EnvVar[] = [
  // Database
  { name: 'DB_HOST', required: true, description: 'Database host' },
  { name: 'DB_PORT', required: true, pattern: /^\d+$/, description: 'Database port' },
  { name: 'DB_USERNAME', required: true, description: 'Database username' },
  { name: 'DB_PASSWORD', required: true, minLength: 8, description: 'Database password' },
  { name: 'DB_DATABASE', required: true, description: 'Database name' },

  // JWT Security
  { name: 'JWT_SECRET', required: true, minLength: 64, description: 'JWT signing secret (min 64 chars)' },

  // API Security
  { name: 'API_KEY_PEPPER', required: true, minLength: 32, description: 'API key hashing pepper (min 32 chars)' },

  // Payment (SePay)
  { name: 'SEPAY_WEBHOOK_SECRET', required: true, minLength: 16, description: 'SePay webhook signature secret' },
  { name: 'SEPAY_BANK_ACCOUNT', required: false, description: 'SePay bank account number' },

  // Google OAuth
  { name: 'GOOGLE_CLIENT_ID', required: true, description: 'Google OAuth client ID' },
  { name: 'GOOGLE_CLIENT_SECRET', required: true, minLength: 10, description: 'Google OAuth client secret' },

  // External APIs
  { name: 'KIE_API_KEY', required: false, description: 'KIE API key for image generation' },

  // Email (SMTP)
  { name: 'SMTP_HOST', required: false, description: 'SMTP server host' },
  { name: 'SMTP_USER', required: false, description: 'SMTP username' },
  { name: 'SMTP_PASS', required: false, description: 'SMTP password' },

  // URLs
  { name: 'FRONTEND_URL', required: true, pattern: /^https?:\/\//, description: 'Frontend URL for redirects' },
  { name: 'ALLOWED_ORIGINS', required: true, description: 'Comma-separated allowed CORS origins' },
]

/**
 * Validate all environment variables
 * @throws Error if critical env vars are missing/invalid in production
 */
export function validateEnvironment(): void {
  const isProduction = process.env.NODE_ENV === 'production'
  const errors: string[] = []
  const warnings: string[] = []

  for (const envVar of ENV_VARS) {
    const value = process.env[envVar.name]

    // Check required vars
    if (envVar.required && !value) {
      if (isProduction) {
        errors.push(`Missing required env var: ${envVar.name} (${envVar.description})`)
      } else {
        warnings.push(`Missing env var: ${envVar.name} (${envVar.description})`)
      }
      continue
    }

    if (!value) continue

    // Check minimum length
    if (envVar.minLength && value.length < envVar.minLength) {
      if (isProduction) {
        errors.push(`${envVar.name} must be at least ${envVar.minLength} characters (current: ${value.length})`)
      } else {
        warnings.push(`${envVar.name} should be at least ${envVar.minLength} characters`)
      }
    }

    // Check pattern
    if (envVar.pattern && !envVar.pattern.test(value)) {
      if (isProduction) {
        errors.push(`${envVar.name} has invalid format`)
      } else {
        warnings.push(`${envVar.name} may have invalid format`)
      }
    }
  }

  // Check for default/weak values in production
  if (isProduction) {
    const weakValues = [
      'your-super-secret-jwt-key',
      'default-api-key-pepper-change-in-production',
      'password',
      '123456',
      'secret',
    ]

    for (const envVar of ENV_VARS) {
      const value = process.env[envVar.name]
      if (value && weakValues.some(weak => value.toLowerCase().includes(weak))) {
        errors.push(`${envVar.name} contains weak/default value - must be changed in production`)
      }
    }
  }

  // Log warnings
  for (const warning of warnings) {
    logger.warn(`ENV WARNING: ${warning}`)
  }

  // Throw errors in production
  if (errors.length > 0) {
    const errorMessage = `Environment validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`
    logger.error(errorMessage)

    if (isProduction) {
      throw new Error(errorMessage)
    }
  }

  logger.info('Environment validation passed', {
    mode: isProduction ? 'production' : 'development',
    warnings: warnings.length,
  })
}

export default validateEnvironment
