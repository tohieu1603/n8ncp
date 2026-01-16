import { Between, FindOptionsWhere } from 'typeorm'
import { UsageLog, ActionType } from '../entities/usage-log.entity'
import { BaseRepository } from './base.repository'

export interface UsageStats {
  totalCredits: number
  totalRequests: number
  byAction: Record<string, { count: number; credits: number }>
}

/**
 * Repository for UsageLog entity operations
 */
export class UsageLogRepository extends BaseRepository<UsageLog> {
  constructor() {
    super(UsageLog)
  }

  async findByUserId(userId: string, limit = 100): Promise<UsageLog[]> {
    return this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit
    })
  }

  async findByUserIdAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<UsageLog[]> {
    return this.repository.find({
      where: {
        userId,
        createdAt: Between(startDate, endDate)
      },
      order: { createdAt: 'DESC' }
    })
  }

  async getUsageStats(userId: string, startDate?: Date, endDate?: Date): Promise<UsageStats> {
    const where: FindOptionsWhere<UsageLog> = { userId }

    if (startDate && endDate) {
      where.createdAt = Between(startDate, endDate)
    }

    const logs = await this.repository.find({ where })

    const stats: UsageStats = {
      totalCredits: 0,
      totalRequests: logs.length,
      byAction: {}
    }

    for (const log of logs) {
      stats.totalCredits += Number(log.creditsUsed)

      if (!stats.byAction[log.action]) {
        stats.byAction[log.action] = { count: 0, credits: 0 }
      }
      stats.byAction[log.action].count++
      stats.byAction[log.action].credits += Number(log.creditsUsed)
    }

    return stats
  }

  async logUsage(
    userId: string,
    action: ActionType,
    creditsUsed: number,
    metadata?: UsageLog['metadata']
  ): Promise<UsageLog> {
    return this.create({
      userId,
      action,
      creditsUsed,
      metadata
    })
  }

  async getTotalCreditsUsed(userId: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('log')
      .select('SUM(log.creditsUsed)', 'total')
      .where('log.userId = :userId', { userId })
      .getRawOne()

    return Number(result?.total) || 0
  }
}

// Singleton instance
export const usageLogRepository = new UsageLogRepository()
