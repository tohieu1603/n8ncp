import { Response } from 'express'
import crypto from 'crypto'
import { apiKeyRepository } from '../repositories/api-key.repository'
import { response } from '../utils/response'
import { validate } from '../utils/validation'
import { logger } from '../utils/logger'
import { AuthRequest } from '../middlewares/auth.middleware'

// SECURITY: Pepper for API key hashing (must match apikey.middleware.ts)
const API_KEY_PEPPER = process.env.API_KEY_PEPPER || 'default-api-key-pepper-change-in-production'

// SECURITY: Encryption key for storing full API key (32 bytes for AES-256)
const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_KEY || 'default-encryption-key-32-bytes!'

// Generate a secure API key
function generateApiKey(): string {
  return 'sk_' + crypto.randomBytes(32).toString('hex')
}

// Hash API key for storage with pepper
// SECURITY: Uses HMAC-SHA256 with pepper instead of plain SHA256
function hashApiKey(key: string): string {
  return crypto.createHmac('sha256', API_KEY_PEPPER).update(key).digest('hex')
}

// Encrypt API key for storage
function encryptApiKey(key: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv)
  let encrypted = cipher.update(key, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

// Decrypt API key for retrieval
function decryptApiKey(encryptedKey: string): string {
  try {
    const [ivHex, encrypted] = encryptedKey.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch {
    return ''
  }
}

/**
 * Keys Controller - handles API keys HTTP layer
 */
export class KeysController {
  /**
   * GET /api/keys
   * Returns masked keys by default for security
   */
  async getKeys(req: AuthRequest, res: Response): Promise<void> {
    try {
      const keys = await apiKeyRepository.raw.find({
        where: { userId: req.user!.userId, isActive: true },
        order: { createdAt: 'DESC' },
      })

      // Return masked keys only - full key requires separate endpoint
      const maskedKeys = keys.map((key) => ({
        id: key.id,
        name: key.name,
        key: key.keyPrefix + '...' + key.keyHash.substring(0, 4),
        canReveal: !!key.encryptedKey, // Indicate if full key can be revealed
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
   * GET /api/keys/:id/reveal
   * Reveals full API key - requires authentication
   */
  async revealKey(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params

      // Validate UUID format
      if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        response.badRequest(res, 'Invalid key ID format')
        return
      }

      const apiKey = await apiKeyRepository.raw.findOne({
        where: { id, userId: req.user!.userId, isActive: true },
      })

      if (!apiKey) {
        response.notFound(res, 'API key not found')
        return
      }

      if (!apiKey.encryptedKey) {
        response.badRequest(res, 'Full key not available for this API key')
        return
      }

      const fullKey = decryptApiKey(apiKey.encryptedKey)
      if (!fullKey) {
        response.serverError(res, 'Failed to decrypt API key')
        return
      }

      logger.info('API key revealed', { userId: req.user!.userId, keyId: id })
      response.success(res, { key: fullKey })
    } catch (error) {
      logger.error('Failed to reveal API key', error as Error)
      response.serverError(res, 'Failed to reveal API key')
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
      const encryptedKey = encryptApiKey(rawKey)

      const apiKey = await apiKeyRepository.create({
        userId: req.user!.userId,
        name: sanitizedName,
        keyHash,
        keyPrefix,
        encryptedKey,
      })

      logger.info('API key created', { userId: req.user!.userId, keyId: apiKey.id, hasEncryptedKey: !!apiKey.encryptedKey })

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
