import { ApiKey } from '../entities/api-key.entity'
import { BaseRepository } from './base.repository'

/**
 * Repository for ApiKey entity operations
 */
export class ApiKeyRepository extends BaseRepository<ApiKey> {
  constructor() {
    super(ApiKey)
  }

  async findByUserId(userId: string): Promise<ApiKey[]> {
    return this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' }
    })
  }

  async findByKeyHash(keyHash: string): Promise<ApiKey | null> {
    return this.repository.findOne({
      where: { keyHash },
      relations: ['user']
    })
  }

  async findActiveByKeyHash(keyHash: string): Promise<ApiKey | null> {
    return this.repository.findOne({
      where: { keyHash, isActive: true },
      relations: ['user']
    })
  }

  async deactivate(keyId: string): Promise<void> {
    await this.repository.update(keyId, { isActive: false })
  }

  async updateLastUsed(keyId: string): Promise<void> {
    await this.repository.update(keyId, { lastUsedAt: new Date() })
  }

  async countByUserId(userId: string): Promise<number> {
    return this.repository.count({ where: { userId, isActive: true } })
  }

  async deleteByUserId(userId: string, keyId: string): Promise<boolean> {
    const result = await this.repository.delete({ id: keyId, userId })
    return (result.affected ?? 0) > 0
  }
}

// Singleton instance
export const apiKeyRepository = new ApiKeyRepository()
