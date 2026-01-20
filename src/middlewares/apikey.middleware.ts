import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { response } from '../utils/response'
import { logger } from '../utils/logger'
import { AppDataSource } from '../data-source'
import { ApiKey, User } from '../entities'

// SECURITY: Pepper for API key hashing (adds extra layer of protection)
const API_KEY_PEPPER = process.env.API_KEY_PEPPER || 'default-api-key-pepper-change-in-production'

// Warn in production if using default pepper
if (process.env.NODE_ENV === 'production' && API_KEY_PEPPER === 'default-api-key-pepper-change-in-production') {
  throw new Error('CRITICAL SECURITY ERROR: API_KEY_PEPPER must be set in production')
}

export interface ApiKeyRequest extends Request {
  apiUser?: {
    userId: string
    user: User
    apiKeyId: string
  }
}

/**
 * Hash API key for comparison with pepper
 * SECURITY: Uses HMAC-SHA256 with pepper instead of plain SHA256
 */
function hashApiKey(key: string): string {
  return crypto.createHmac('sha256', API_KEY_PEPPER).update(key).digest('hex')
}

/**
 * API Key Authentication middleware
 * Validates Bearer token as API key and attaches user to request
 */
export async function apiKeyMiddleware(
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('API Key auth failed: No token provided', { path: req.path })
    return response.unauthorized(res, 'API key required')
  }

  const apiKey = authHeader.split(' ')[1]

  // Check if it starts with our prefix
  if (!apiKey.startsWith('sk_')) {
    return response.unauthorized(res, 'Invalid API key format')
  }

  try {
    const keyHash = hashApiKey(apiKey)
    const apiKeyRepo = AppDataSource.getRepository(ApiKey)
    const userRepo = AppDataSource.getRepository(User)

    // Find API key by hash
    const keyRecord = await apiKeyRepo.findOne({
      where: { keyHash, isActive: true },
    })

    if (!keyRecord) {
      logger.warn('API Key auth failed: Invalid key', { path: req.path })
      return response.unauthorized(res, 'Invalid API key')
    }

    // Get user
    const user = await userRepo.findOne({
      where: { id: keyRecord.userId, isActive: true },
    })

    if (!user) {
      return response.unauthorized(res, 'User not found or inactive')
    }

    // Update last used
    keyRecord.lastUsedAt = new Date()
    await apiKeyRepo.save(keyRecord)

    // Attach user info to request
    req.apiUser = {
      userId: keyRecord.userId,
      user,
      apiKeyId: keyRecord.id,
    }

    next()
  } catch (error) {
    logger.error('API Key middleware error', error as Error)
    return response.serverError(res, 'Authentication failed')
  }
}

export default apiKeyMiddleware
