import { Router, Response, Request } from 'express'
import crypto from 'crypto'
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware'
import { response } from '../utils/response'
import { AppDataSource } from '../data-source'
import { Payment, User } from '../entities'
import { logger } from '../utils/logger'

const router = Router()

// Lazy repository getters (to avoid initialization before DB connection)
const paymentRepo = () => AppDataSource.getRepository(Payment)
const userRepo = () => AppDataSource.getRepository(User)

// SePay Configuration (from environment)
const SEPAY_API_KEY = process.env.SEPAY_API_KEY || ''
const SEPAY_WEBHOOK_SECRET = process.env.SEPAY_WEBHOOK_SECRET || '' // For signature verification
const SEPAY_BANK_ACCOUNT = process.env.SEPAY_BANK_ACCOUNT || '0123456789'
const SEPAY_BANK_CODE = process.env.SEPAY_BANK_CODE || 'MB'
const SEPAY_ACCOUNT_NAME = process.env.SEPAY_ACCOUNT_NAME || 'NGUYEN VAN A'

/**
 * Verify SePay webhook signature
 * Prevents fake payment confirmations
 */
function verifyWebhookSignature(body: object, signature: string | undefined): boolean {
  if (!SEPAY_WEBHOOK_SECRET) {
    logger.warn('SEPAY_WEBHOOK_SECRET not configured - webhook verification disabled')
    return false // Fail closed when no secret configured
  }

  if (!signature) {
    return false
  }

  // SePay typically uses HMAC-SHA256 for webhook signatures
  const payload = JSON.stringify(body)
  const expectedSignature = crypto
    .createHmac('sha256', SEPAY_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex')

  // Timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch {
    return false
  }
}

// Plan configurations
const STATIC_PLANS: Record<string, { name: string; credits: number; isPro?: boolean; proDays?: number }> = {
  credits_100: { name: '100 Credits', credits: 100 },
  credits_500: { name: '500 Credits', credits: 500 },
  credits_1000: { name: '1,000 Credits', credits: 1000 },
  pro_monthly: { name: 'Pro Monthly', credits: 2000, isPro: true, proDays: 30 },
}

// Get plan by ID (supports dynamic token plans like "tokens_50000")
function getPlan(planId: string): { name: string; credits: number; isPro?: boolean; proDays?: number } | null {
  // Check static plans first
  if (STATIC_PLANS[planId]) {
    return STATIC_PLANS[planId]
  }

  // Support dynamic token plans: tokens_X
  const tokenMatch = planId.match(/^tokens_(\d+)$/)
  if (tokenMatch) {
    const tokens = parseInt(tokenMatch[1], 10)
    if (tokens > 0 && tokens <= 100000000) {
      return {
        name: `${tokens.toLocaleString()} Tokens`,
        credits: tokens,
      }
    }
  }

  return null
}

// Generate transaction ID
function generateTransactionId(): string {
  return 'TX' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(4).toString('hex').toUpperCase()
}

// Generate VietQR URL
function generateVietQR(amount: number, content: string): string {
  const bankId = SEPAY_BANK_CODE
  const accountNo = SEPAY_BANK_ACCOUNT
  const accountName = encodeURIComponent(SEPAY_ACCOUNT_NAME)
  const template = 'compact2'

  return `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${amount}&addInfo=${encodeURIComponent(content)}&accountName=${accountName}`
}

/**
 * GET /api/billing/history
 * Get payment history
 */
router.get('/history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const payments = await paymentRepo().find({
      where: { userId: req.user!.userId },
      order: { createdAt: 'DESC' },
      take: 50,
    })

    const history = payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      status: p.status,
      description: p.description,
      createdAt: p.createdAt,
    }))

    return response.success(res, history)
  } catch (error) {
    logger.error('Failed to fetch payment history', error as Error)
    return response.serverError(res, 'Failed to fetch payment history')
  }
})

/**
 * POST /api/billing/create
 * Create a new payment
 */
router.post('/create', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { planId, amount } = req.body

    const plan = getPlan(planId)
    if (!planId || !plan) {
      return response.badRequest(res, 'Invalid plan')
    }
    const transactionId = generateTransactionId()

    // Generate QR code URL
    const qrContent = `${transactionId} ${plan.name}`
    const qrCode = generateVietQR(amount, qrContent)

    // Create payment record
    const payment = paymentRepo().create({
      userId: req.user!.userId,
      transactionId,
      amount,
      credits: plan.credits,
      planId,
      description: plan.name,
      status: 'pending',
      qrCode,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      metadata: {
        bankCode: SEPAY_BANK_CODE,
        accountNumber: SEPAY_BANK_ACCOUNT,
      },
    })

    await paymentRepo().save(payment)

    return response.success(res, {
      qrCode,
      amount,
      transactionId,
      expiresAt: payment.expiresAt.toISOString(),
    })
  } catch (error) {
    logger.error('Failed to create payment', error as Error)
    return response.serverError(res, 'Failed to create payment')
  }
})

/**
 * POST /api/billing/webhook
 * SePay webhook for payment confirmation
 * SECURITY: Verifies webhook signature to prevent fake payments
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    // Verify webhook signature first
    const signature = req.headers['x-sepay-signature'] as string | undefined
    if (!verifyWebhookSignature(req.body, signature)) {
      logger.warn('Invalid webhook signature', {
        ip: req.ip,
        signature: signature?.substring(0, 20),
      })
      return res.status(401).json({ success: false, error: 'Invalid signature' })
    }

    // SePay sends payment notifications here
    const { id, content, transferAmount, gateway, transactionDate, accountNumber } = req.body

    logger.info('SePay webhook received', { id, content, transferAmount })

    // Extract transaction ID from content
    const match = content?.match(/TX[A-Z0-9]+/i)
    if (!match) {
      logger.warn('No transaction ID found in webhook content', { content })
      return res.json({ success: true }) // Still acknowledge
    }

    const transactionId = match[0]

    // Find pending payment
    const payment = await paymentRepo().findOne({
      where: { transactionId, status: 'pending' },
    })

    if (!payment) {
      logger.warn('Payment not found or already processed', { transactionId })
      return res.json({ success: true })
    }

    // Verify amount
    if (Number(transferAmount) < Number(payment.amount)) {
      logger.warn('Insufficient payment amount', {
        expected: payment.amount,
        received: transferAmount,
      })
      return res.json({ success: true })
    }

    // Update payment status
    payment.status = 'completed'
    payment.completedAt = new Date()
    payment.metadata = {
      ...payment.metadata,
      sepayRef: id,
      bankName: gateway,
    }
    await paymentRepo().save(payment)

    // Add credits/tokens to user
    const plan = getPlan(payment.planId)
    if (plan) {
      const user = await userRepo().findOne({ where: { id: payment.userId } })
      if (user) {
        // Add tokens to balance
        user.tokenBalance = Number(user.tokenBalance) + plan.credits

        // Handle Pro subscription
        if (plan.isPro && plan.proDays) {
          user.isPro = true
          user.proExpiresAt = new Date(Date.now() + plan.proDays * 24 * 60 * 60 * 1000)
        }
        await userRepo().save(user)
        logger.info('Tokens added to user', { userId: user.id, tokens: plan.credits, newBalance: user.tokenBalance })
      }
    }

    logger.info('Payment completed successfully', { transactionId, userId: payment.userId })
    return res.json({ success: true })
  } catch (error) {
    logger.error('Webhook processing error', error as Error)
    return res.json({ success: true }) // Always acknowledge to prevent retries
  }
})

/**
 * GET /api/billing/check/:transactionId
 * Check payment status (for polling)
 */
router.get('/check/:transactionId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { transactionId } = req.params

    const payment = await paymentRepo().findOne({
      where: { transactionId, userId: req.user!.userId },
    })

    if (!payment) {
      return response.notFound(res, 'Payment not found')
    }

    return response.success(res, {
      status: payment.status,
      completedAt: payment.completedAt,
    })
  } catch (error) {
    return response.serverError(res, 'Failed to check payment status')
  }
})

export default router
