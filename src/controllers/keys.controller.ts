import { Response } from 'express'
import crypto from 'crypto'
import { apiKeyRepository } from '../repositories/api-key.repository'
import { response } from '../utils/response'
import { validate } from '../utils/validation'
import { logger } from '../utils/logger'
import { AuthRequest } from '../middlewares/auth.middleware'

// Generate a secure API key
function generateApiKey(): string {
  return 'sk_' + crypto.randomBytes(32).toString('hex')
}

// Hash API key for storage
function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

/**
 * Keys Controller - handles API keys HTTP layer
 */
export class KeysController {
  /**
   * GET /api/keys
   */
  async getKeys(req: AuthRequest, res: Response): Promise<void> {
    try {
      const keys = await apiKeyRepository.raw.find({
        where: { userId: req.user!.userId, isActive: true },
        order: { createdAt: 'DESC' },
      })

      // Return keys with masked values
      const maskedKeys = keys.map((key) => ({
        id: key.id,
        name: key.name,
        key: key.keyPrefix + '...' + key.keyHash.substring(0, 4),
        createdAt: key.createdAt,
        lastUsedAt: key.lastUsedAt,
      }))

      response.success(res, maskedKeys)
    } catch (error) {
      logger.error('Failed to fetch API keys', error as Error)
      response.serverError(res, 'Failed to fetch API keys')
    }
  }

  /**
   * POST /api/keys
   */
  async createKey(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name } = req.body

      if (!name || typeof name !== 'string') {
        response.badRequest(res, 'Key name is required')
        return
      }

      const sanitizedName = validate.sanitizeString(name, 50)
      if (sanitizedName.length < 1 || sanitizedName.length > 50) {
        response.badRequest(res, 'Key name must be 1-50 characters')
        return
      }

      if (validate.containsXSS(name)) {
        logger.warn('XSS attempt in API key name', { ip: req.ip, userId: req.user!.userId })
        response.badRequest(res, 'Invalid key name')
        return
      }

      // Check limit (max 10 keys per user)
      const existingCount = await apiKeyRepository.countByUserId(req.user!.userId)

      if (existingCount >= 10) {
        response.badRequest(res, 'Maximum 10 API keys allowed per account')
        return
      }

      // Generate new key
      const rawKey = generateApiKey()
      const keyHash = hashApiKey(rawKey)
      const keyPrefix = rawKey.substring(0, 8)

      const apiKey = await apiKeyRepository.create({
        userId: req.user!.userId,
        name: sanitizedName,
        keyHash,
        keyPrefix,
      })

      logger.info('API key created', { userId: req.user!.userId, keyId: apiKey.id })

      response.success(res, {
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
      response.serverError(res, 'Failed to create API key')
    }
  }

  /**
   * DELETE /api/keys/:id
   */
  async deleteKey(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params

      // Validate UUID format
      if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        response.badRequest(res, 'Invalid key ID format')
        return
      }

      const apiKey = await apiKeyRepository.raw.findOne({
        where: { id, userId: req.user!.userId },
      })

      if (!apiKey) {
        response.notFound(res, 'API key not found')
        return
      }

      // Soft delete
      apiKey.isActive = false
      await apiKeyRepository.save(apiKey)
      logger.info('API key deleted', { userId: req.user!.userId, keyId: id })

      response.success(res, { message: 'API key deleted' })
    } catch (error) {
      logger.error('Failed to delete API key', error as Error)
      response.serverError(res, 'Failed to delete API key')
    }
  }
}

// Singleton instance
export const keysController = new KeysController()
