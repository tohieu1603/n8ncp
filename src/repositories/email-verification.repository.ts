import { LessThan, MoreThan } from 'typeorm'
import { EmailVerification } from '../entities/email-verification.entity'
import { BaseRepository } from './base.repository'

/**
 * Repository for EmailVerification entity operations
 */
export class EmailVerificationRepository extends BaseRepository<EmailVerification> {
  constructor() {
    super(EmailVerification)
  }

  async findByUserId(userId: string): Promise<EmailVerification | null> {
    return this.repository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' }
    })
  }

  async findValidCode(userId: string, code: string): Promise<EmailVerification | null> {
    return this.repository.findOne({
      where: {
        userId,
        code,
        expiresAt: MoreThan(new Date())
      }
    })
  }

  async createVerification(userId: string, code: string, expiresInMinutes = 15): Promise<EmailVerification> {
    // Delete any existing verification for this user
    await this.repository.delete({ userId })

    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes)

    return this.create({
      userId,
      code,
      expiresAt
    })
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.repository.delete({ userId })
  }

  async deleteExpired(): Promise<number> {
    const result = await this.repository.delete({
      expiresAt: LessThan(new Date())
    })
    return result.affected ?? 0
  }

  async isCodeValid(userId: string, code: string): Promise<boolean> {
    const verification = await this.findValidCode(userId, code)
    return verification !== null
  }
}

// Singleton instance
export const emailVerificationRepository = new EmailVerificationRepository()
