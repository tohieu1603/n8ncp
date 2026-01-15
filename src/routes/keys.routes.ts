import { Router, Response } from 'express'
import crypto from 'crypto'
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware'
import { response } from '../utils/response'
import { validate } from '../utils/validation'
import { AppDataSource } from '../data-source'
import { ApiKey } from '../entities'
import { logger } from '../utils/logger'

const router = Router()
const apiKeyRepo = () => AppDataSource.getRepository(ApiKey)

// Generate a secure API key
function generateApiKey(): string {
  return 'sk_' + crypto.randomBytes(32).toString('hex')
}

// Hash API key for storage
function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

/**
 * GET /api/keys
 * Get all API keys for the current user
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const keys = await apiKeyRepo().find({
      where: { userId: req.user!.userId, isActive: true },
      order: { createdAt: 'DESC' },
    })

    // Return keys with masked values
    const maskedKeys = keys.map((key: ApiKey) => ({
      id: key.id,
      name: key.name,
      key: key.keyPrefix + '...' + key.keyHash.substring(0, 4),
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt,
    }))

    return response.success(res, maskedKeys)
  } catch (error) {
    logger.error('Failed to fetch API keys', error as Error)
    return response.serverError(res, 'Failed to fetch API keys')
  }
})

/**
 * POST /api/keys
 * Create a new API key
 */
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body

    // Validate name
    if (!name || typeof name !== 'string') {
      return response.badRequest(res, 'Key name is required')
    }

    // Sanitize and validate name length
    const sanitizedName = validate.sanitizeString(name, 50)
    if (sanitizedName.length < 1 || sanitizedName.length > 50) {
      return response.badRequest(res, 'Key name must be 1-50 characters')
    }

    // Check for XSS in name
    if (validate.containsXSS(name)) {
      logger.warn('XSS attempt in API key name', { ip: req.ip, userId: req.user!.userId })
      return response.badRequest(res, 'Invalid key name')
    }

    // Check limit (max 5 keys per user)
    const existingCount = await apiKeyRepo().count({
      where: { userId: req.user!.userId, isActive: true },
    })

    if (existingCount >= 5) {
      return response.badRequest(res, 'Maximum 5 API keys allowed per account')
    }

    // Generate new key
    const rawKey = generateApiKey()
    const keyHash = hashApiKey(rawKey)
    const keyPrefix = rawKey.substring(0, 8)

    const apiKey = apiKeyRepo().create({
      userId: req.user!.userId,
      name: sanitizedName,
      keyHash,
      keyPrefix,
    })

    await apiKeyRepo().save(apiKey)
    logger.info('API key created', { userId: req.user!.userId, keyId: apiKey.id })

    return response.success(res, {
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        key: keyPrefix + '...' + keyHash.substring(0, 4),
        createdAt: apiKey.createdAt,
        lastUsedAt: null,
      },
      key: rawKey, // Only returned once!
    })
  } catch (error) {
    logger.error('Failed to create API key', error as Error)
    return response.serverError(res, 'Failed to create API key')
  }
})

/**
 * DELETE /api/keys/:id
 * Delete an API key
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    // Validate UUID format to prevent injection
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return response.badRequest(res, 'Invalid key ID format')
    }

    const apiKey = await apiKeyRepo().findOne({
      where: { id, userId: req.user!.userId },
    })

    if (!apiKey) {
      return response.notFound(res, 'API key not found')
    }

    // Soft delete
    apiKey.isActive = false
    await apiKeyRepo().save(apiKey)
    logger.info('API key deleted', { userId: req.user!.userId, keyId: id })

    return response.success(res, { message: 'API key deleted' })
  } catch (error) {
    logger.error('Failed to delete API key', error as Error)
    return response.serverError(res, 'Failed to delete API key')
  }
})

export default router
