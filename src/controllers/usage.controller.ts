import { Response } from 'express'
import { getUserUsage, getUserLogs } from '../services/usage.service'
import { usageLogRepository } from '../repositories/usage-log.repository'
import { response } from '../utils/response'
import { logger } from '../utils/logger'
import { AuthRequest } from '../middlewares/auth.middleware'
import { MoreThanOrEqual } from 'typeorm'

/**
 * Usage Controller - handles usage statistics HTTP layer
 */
export class UsageController {
  /**
   * GET /api/usage/summary
   */
  async getSummary(req: AuthRequest, res: Response): Promise<void> {
    try {
      const usage = await getUserUsage(req.user!.userId)
      response.success(res, usage)
    } catch (error) {
      logger.error('Usage summary error', error as Error)
      response.serverError(res, 'Failed to get usage summary')
    }
  }

  /**
   * GET /api/usage/logs
   */
  async getLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1)
      const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 20), 100)

      const logs = await getUserLogs(req.user!.userId, page, limit)
      response.success(res, logs)
    } catch (error) {
      logger.error('Usage logs error', error as Error)
      response.serverError(res, 'Failed to get usage logs')
    }
  }

  /**
   * GET /api/usage/stats
   */
  async getStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const period = req.query.period as string || 'week'
      const userId = req.user!.userId

      // Calculate date range
      const now = new Date()
      let startDate: Date
      switch (period) {
        case 'day':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'week':
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      }

      // Get logs for the period
      const logs = await usageLogRepository.raw.find({
        where: {
          userId,
          createdAt: MoreThanOrEqual(startDate),
        },
        order: { createdAt: 'ASC' },
      })

      // Calculate stats
      let totalCredits = 0
      let totalTokens = 0
      let imageCount = 0
      let chatCount = 0
      let imageCredits = 0
      let chatCredits = 0
      let chatTokens = 0
      let imageCost = 0
      let chatCost = 0

      const dailyMap = new Map<string, number>()

      for (const log of logs) {
        const credits = Number(log.creditsUsed) || 0
        const cost = Number(log.costUsd) || 0
        totalCredits += credits
        totalTokens += log.metadata?.tokens || log.metadata?.estimatedTokens || 0

        // By action type
        if (log.action === 'generate_image') {
          imageCount++
          imageCredits += credits
          imageCost += cost
        } else if (log.action === 'chat' || log.action === 'chat_stream') {
          chatCount++
          chatCredits += credits
          chatCost += cost
          chatTokens += log.metadata?.tokens || log.metadata?.estimatedTokens || 0
        }

        // Daily aggregation
        const dateKey = log.createdAt.toISOString().split('T')[0]
        dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + credits)
      }

      // Build daily usage array
      const dailyUsage: { date: string; credits: number }[] = []
      const daysCount = period === 'day' ? 1 : period === 'week' ? 7 : 30

      for (let i = daysCount - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const dateKey = date.toISOString().split('T')[0]
        const shortDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        dailyUsage.push({
          date: shortDate,
          credits: dailyMap.get(dateKey) || 0,
        })
      }

      response.success(res, {
        totalCredits,
        totalTokens,
        imageCount,
        chatCount,
        imageCredits,
        chatCredits,
        chatTokens,
        imageCost,
        chatCost,
        dailyUsage,
      })
    } catch (error) {
      logger.error('Usage stats error', error as Error)
      response.serverError(res, 'Failed to get usage stats')
    }
  }
}

// Singleton instance
export const usageController = new UsageController()
