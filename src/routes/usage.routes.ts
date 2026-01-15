import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware'
import { getUserUsage, getUserLogs } from '../services/usage.service'
import { response } from '../utils/response'
import { logger } from '../utils/logger'
import { AppDataSource } from '../data-source'
import { UsageLog } from '../entities'
import { Between, MoreThanOrEqual } from 'typeorm'

const router = Router()
const usageLogRepo = AppDataSource.getRepository(UsageLog)

/**
 * GET /api/usage/summary
 * Get user usage summary
 */
router.get('/summary', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const usage = await getUserUsage(req.user!.userId)
    return response.success(res, usage)
  } catch (error) {
    logger.error('Usage summary error', error as Error)
    return response.serverError(res, 'Failed to get usage summary')
  }
})

/**
 * GET /api/usage/logs
 * Get user activity logs with pagination
 */
router.get('/logs', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 20), 100)

    const logs = await getUserLogs(req.user!.userId, page, limit)
    return response.success(res, logs)
  } catch (error) {
    logger.error('Usage logs error', error as Error)
    return response.serverError(res, 'Failed to get usage logs')
  }
})

/**
 * GET /api/usage/stats
 * Get usage statistics for a period
 */
router.get('/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
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
    const logs = await usageLogRepo.find({
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

    return response.success(res, {
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
    return response.serverError(res, 'Failed to get usage stats')
  }
})

export default router
