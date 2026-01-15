import { AppDataSource } from '../data-source'
import { User, UsageLog, ActionType } from '../entities'

const CREDITS_PER_IMAGE = parseInt(process.env.CREDITS_PER_IMAGE || '18')
const CREDIT_PRICE_USD = parseFloat(process.env.CREDIT_PRICE_USD || '0.005')

const userRepository = () => AppDataSource.getRepository(User)
const usageLogRepository = () => AppDataSource.getRepository(UsageLog)

export interface LogUsageParams {
  userId: string
  action: ActionType
  success: boolean
  metadata?: {
    prompt?: string
    taskId?: string
    imageUrl?: string
    aspectRatio?: string
    resolution?: string
    ip?: string
    userAgent?: string
    error?: string
    agentId?: string
    tokens?: number
    estimatedTokens?: number
    jobId?: string
    downloadUrl?: string
    fileName?: string
  }
}

export async function logUsage(params: LogUsageParams): Promise<UsageLog>
export async function logUsage(
  userId: string,
  action: ActionType,
  creditsUsed: number,
  costUsd: number,
  success: boolean,
  metadata?: Record<string, unknown>
): Promise<UsageLog>
export async function logUsage(
  paramsOrUserId: LogUsageParams | string,
  action?: ActionType,
  creditsUsed?: number,
  costUsd?: number,
  success?: boolean,
  metadata?: Record<string, unknown>
): Promise<UsageLog> {
  // Handle both call signatures
  let userId: string
  let finalAction: ActionType
  let finalCreditsUsed: number
  let finalCostUsd: number
  let finalSuccess: boolean
  let finalMetadata: Record<string, unknown> | undefined

  if (typeof paramsOrUserId === 'string') {
    // Called with individual arguments
    userId = paramsOrUserId
    finalAction = action!
    finalCreditsUsed = creditsUsed || 0
    finalCostUsd = costUsd || 0
    finalSuccess = success !== undefined ? success : true
    finalMetadata = metadata
  } else {
    // Called with params object
    const params = paramsOrUserId
    userId = params.userId
    finalAction = params.action
    finalSuccess = params.success
    finalMetadata = params.metadata
    finalCreditsUsed = 0
    finalCostUsd = 0

    // Only charge credits for successful image generation
    if (finalAction === 'generate_image' && finalSuccess) {
      finalCreditsUsed = CREDITS_PER_IMAGE
      finalCostUsd = finalCreditsUsed * CREDIT_PRICE_USD

      // Update user's total usage and deduct from balance
      await userRepository().increment({ id: userId }, 'creditsUsed', finalCreditsUsed)
      await userRepository().increment({ id: userId }, 'totalSpentUsd', finalCostUsd)
      await userRepository().decrement({ id: userId }, 'tokenBalance', finalCreditsUsed)
    }
  }

  const log = usageLogRepository().create({
    userId,
    action: finalAction,
    creditsUsed: finalCreditsUsed,
    costUsd: finalCostUsd,
    success: finalSuccess,
    metadata: finalMetadata,
  })

  return usageLogRepository().save(log)
}

export async function getUserUsage(userId: string) {
  const user = await userRepository().findOne({ where: { id: userId } })

  if (!user) {
    throw new Error('User not found')
  }

  const logs = await usageLogRepository().find({
    where: { userId },
    order: { createdAt: 'DESC' },
    take: 100,
  })

  const imageCount = await usageLogRepository().count({
    where: { userId, action: 'generate_image', success: true },
  })

  return {
    creditsUsed: user.creditsUsed,
    totalSpentUsd: user.totalSpentUsd,
    imageCount,
    recentActivity: logs,
  }
}

export async function getUserLogs(
  userId: string,
  page: number = 1,
  limit: number = 20
) {
  const [logs, total] = await usageLogRepository().findAndCount({
    where: { userId },
    order: { createdAt: 'DESC' },
    skip: (page - 1) * limit,
    take: limit,
  })

  return {
    logs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  }
}

/**
 * Update user credits and spending for chat/API usage
 * Deducts tokens from tokenBalance
 */
export async function updateUserCredits(
  userId: string,
  tokens: number,
  costUsd: number
): Promise<void> {
  await userRepository().increment({ id: userId }, 'creditsUsed', tokens)
  await userRepository().increment({ id: userId }, 'totalSpentUsd', costUsd)
  await userRepository().decrement({ id: userId }, 'tokenBalance', tokens)
}
