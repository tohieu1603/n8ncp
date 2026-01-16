import { MoreThan, IsNull } from 'typeorm'
import { User } from '../entities/user.entity'
import { BaseRepository } from './base.repository'

/**
 * Repository for User entity operations
 */
export class UserRepository extends BaseRepository<User> {
  constructor() {
    super(User)
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } })
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.repository.findOne({ where: { googleId } })
  }

  async findVerifiedByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({
      where: { email, isEmailVerified: true }
    })
  }

  async updateCredits(userId: string, creditsUsed: number, tokenBalance: number): Promise<void> {
    await this.repository.update(userId, { creditsUsed, tokenBalance })
  }

  async incrementCreditsUsed(userId: string, amount: number): Promise<void> {
    await this.repository.increment({ id: userId }, 'creditsUsed', amount)
  }

  async decrementTokenBalance(userId: string, amount: number): Promise<void> {
    await this.repository.decrement({ id: userId }, 'tokenBalance', amount)
  }

  async addTokenBalance(userId: string, amount: number): Promise<void> {
    await this.repository.increment({ id: userId }, 'tokenBalance', amount)
  }

  async setProStatus(userId: string, isPro: boolean, expiresAt: Date | null): Promise<void> {
    await this.repository.update(userId, { isPro, proExpiresAt: expiresAt })
  }

  async findActiveProUsers(): Promise<User[]> {
    return this.repository.find({
      where: [
        { isPro: true, proExpiresAt: IsNull() }, // Lifetime pro
        { isPro: true, proExpiresAt: MoreThan(new Date()) } // Active pro
      ]
    })
  }

  /**
   * Check if user has active Pro subscription
   */
  hasProAccess(user: User): boolean {
    if (!user.isPro) return false
    if (!user.proExpiresAt) return true // Lifetime
    return new Date(user.proExpiresAt) > new Date()
  }
}

// Singleton instance
export const userRepository = new UserRepository()
