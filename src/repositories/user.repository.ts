import { MoreThan, IsNull, ILike } from 'typeorm'
import { User, UserRole } from '../entities/user.entity'
import { BaseRepository } from './base.repository'

export interface UserFilters {
  role?: UserRole
  isActive?: boolean
  isPro?: boolean
  isEmailVerified?: boolean
  search?: string
}

export interface UserPaginationOptions {
  page?: number
  limit?: number
  sortBy?: 'createdAt' | 'updatedAt' | 'email' | 'name' | 'creditsUsed'
  sortOrder?: 'ASC' | 'DESC'
}

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

  async findAllPaginated(
    filters: UserFilters = {},
    pagination: UserPaginationOptions = {}
  ): Promise<{ users: User[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = pagination

    const query = this.repository.createQueryBuilder('user')

    if (filters.role) {
      query.andWhere('user.role = :role', { role: filters.role })
    }

    if (filters.isActive !== undefined) {
      query.andWhere('user.isActive = :isActive', { isActive: filters.isActive })
    }

    if (filters.isPro !== undefined) {
      query.andWhere('user.isPro = :isPro', { isPro: filters.isPro })
    }

    if (filters.isEmailVerified !== undefined) {
      query.andWhere('user.isEmailVerified = :isEmailVerified', { isEmailVerified: filters.isEmailVerified })
    }

    if (filters.search) {
      query.andWhere(
        '(user.email ILIKE :search OR user.name ILIKE :search)',
        { search: `%${filters.search}%` }
      )
    }

    const [users, total] = await query
      .orderBy(`user.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount()

    return { users, total }
  }

  async updateRole(userId: string, role: UserRole): Promise<void> {
    await this.repository.update(userId, { role })
  }

  async setActiveStatus(userId: string, isActive: boolean): Promise<void> {
    await this.repository.update(userId, { isActive })
  }

  async countByRole(role: UserRole): Promise<number> {
    return this.repository.count({ where: { role } })
  }

  async getStats(): Promise<{
    total: number
    active: number
    pro: number
    verified: number
    admins: number
  }> {
    const [total, active, pro, verified, admins] = await Promise.all([
      this.repository.count(),
      this.repository.count({ where: { isActive: true } }),
      this.repository.count({ where: { isPro: true } }),
      this.repository.count({ where: { isEmailVerified: true } }),
      this.repository.count({ where: { role: 'admin' } }),
    ])
    return { total, active, pro, verified, admins }
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
