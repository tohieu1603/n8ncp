import crypto from 'crypto'
import { paymentRepository } from '../repositories/payment.repository'
import { userRepository } from '../repositories/user.repository'
import { logger } from '../utils/logger'
import { NotFoundError, ValidationError } from '../errors/app.error'
import { Payment } from '../entities/payment.entity'

// SePay Configuration
const SEPAY_WEBHOOK_SECRET = process.env.SEPAY_WEBHOOK_SECRET || ''
const SEPAY_BANK_ACCOUNT = process.env.SEPAY_BANK_ACCOUNT || '0123456789'
const SEPAY_BANK_CODE = process.env.SEPAY_BANK_CODE || 'MB'
const SEPAY_ACCOUNT_NAME = process.env.SEPAY_ACCOUNT_NAME || 'NGUYEN VAN A'

// Plan configurations
const STATIC_PLANS: Record<string, { name: string; credits: number; isPro?: boolean; proDays?: number }> = {
  credits_100: { name: '100 Credits', credits: 100 },
  credits_500: { name: '500 Credits', credits: 500 },
  credits_1000: { name: '1,000 Credits', credits: 1000 },
  pro_monthly: { name: 'Pro Monthly', credits: 2000, isPro: true, proDays: 30 },
}

export interface Plan {
  name: string
  credits: number
  isPro?: boolean
  proDays?: number
}

export interface PaymentHistoryItem {
  id: string
  amount: number
  status: string
  description: string
  createdAt: Date
  transactionId?: string
  qrCode?: string
  expiresAt?: Date
}

export interface CreatePaymentResult {
  qrCode: string
  amount: number
  transactionId: string
  expiresAt: string
}

export interface PaymentStatus {
  status: string
  completedAt: Date | null
}

/**
 * Billing Service - handles payment business logic
 */
export class BillingService {
  /**
   * Get plan by ID (supports dynamic token plans)
   */
  getPlan(planId: string): Plan | null {
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

  /**
   * Generate transaction ID
   */
  generateTransactionId(): string {
    return 'TX' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(4).toString('hex').toUpperCase()
  }

  /**
   * Generate VietQR URL with bank branding
   * Uses VietQR API for branded QR with bank logo
   */
  generateQRCode(amount: number, content: string): string {
    const bankCode = SEPAY_BANK_CODE
    const accountNo = SEPAY_BANK_ACCOUNT
    const accountName = encodeURIComponent(SEPAY_ACCOUNT_NAME)

    // VietQR format: https://img.vietqr.io/image/{bankCode}-{accountNo}-{template}.png
    // Templates: compact, compact2, qr_only, print
    return `https://img.vietqr.io/image/${bankCode}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(content)}&accountName=${accountName}`
  }

  /**
   * Verify SePay webhook signature
   */
  verifyWebhookSignature(body: object, signature: string | undefined): boolean {
    if (!SEPAY_WEBHOOK_SECRET) {
      logger.warn('SEPAY_WEBHOOK_SECRET not configured - webhook verification disabled')
      return false
    }

    if (!signature) {
      return false
    }

    const payload = JSON.stringify(body)
    const expectedSignature = crypto
      .createHmac('sha256', SEPAY_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex')

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      )
    } catch {
      return false
    }
  }

  /**
   * Get payment history for user (auto-expire old pending payments)
   */
  async getPaymentHistory(userId: string): Promise<PaymentHistoryItem[]> {
    const payments = await paymentRepository.findByUserId(userId)
    const now = new Date()

    // Auto-expire old pending payments
    for (const p of payments) {
      if (p.status === 'pending' && p.expiresAt && new Date(p.expiresAt) < now) {
        p.status = 'expired'
        await paymentRepository.save(p)
      }
    }

    return payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      status: p.status,
      description: p.description,
      createdAt: p.createdAt,
      transactionId: p.transactionId,
      qrCode: p.status === 'pending' ? p.qrCode : undefined,
      expiresAt: p.expiresAt,
    }))
  }

  /**
   * Get payment detail by ID
   */
  async getPaymentDetail(userId: string, paymentId: string): Promise<PaymentHistoryItem | null> {
    const payment = await paymentRepository.raw.findOne({
      where: { id: paymentId, userId },
    })

    if (!payment) return null

    // Auto-expire if needed
    const now = new Date()
    if (payment.status === 'pending' && payment.expiresAt && new Date(payment.expiresAt) < now) {
      payment.status = 'expired'
      await paymentRepository.save(payment)
    }

    return {
      id: payment.id,
      amount: Number(payment.amount),
      status: payment.status,
      description: payment.description,
      createdAt: payment.createdAt,
      transactionId: payment.transactionId,
      qrCode: payment.status === 'pending' ? payment.qrCode : undefined,
      expiresAt: payment.expiresAt,
    }
  }

  /**
   * Create a new payment
   */
  async createPayment(userId: string, planId: string, amount: number): Promise<CreatePaymentResult> {
    const plan = this.getPlan(planId)
    if (!plan) {
      throw new ValidationError('Invalid plan')
    }

    const transactionId = this.generateTransactionId()
    const qrContent = `${transactionId} ${plan.name}`
    const qrCode = this.generateQRCode(amount, qrContent)

    await paymentRepository.create({
      userId,
      transactionId,
      amount,
      credits: plan.credits,
      planId,
      description: plan.name,
      status: 'pending',
      qrCode,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      metadata: {
        bankCode: SEPAY_BANK_CODE,
        accountNumber: SEPAY_BANK_ACCOUNT,
      },
    })

    return {
      qrCode,
      amount,
      transactionId,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    }
  }

  /**
   * Process webhook payment confirmation
   */
  async processWebhook(data: {
    id: string
    content: string
    transferAmount: number
    gateway: string
  }): Promise<boolean> {
    const { id, content, transferAmount, gateway } = data

    logger.info('SePay webhook received', { id, content, transferAmount })

    // Extract transaction ID from content
    const match = content?.match(/TX[A-Z0-9]+/i)
    if (!match) {
      logger.warn('No transaction ID found in webhook content', { content })
      return true // Still acknowledge
    }

    const transactionId = match[0]

    // Find pending payment
    const payment = await paymentRepository.raw.findOne({
      where: { transactionId, status: 'pending' },
    })

    if (!payment) {
      logger.warn('Payment not found or already processed', { transactionId })
      return true
    }

    // Verify amount
    if (Number(transferAmount) < Number(payment.amount)) {
      logger.warn('Insufficient payment amount', {
        expected: payment.amount,
        received: transferAmount,
      })
      return true
    }

    // Update payment status
    payment.status = 'completed'
    payment.completedAt = new Date()
    payment.metadata = {
      ...payment.metadata,
      sepayRef: id,
      bankName: gateway,
    }
    await paymentRepository.save(payment)

    // Add credits/tokens to user
    const plan = this.getPlan(payment.planId)
    if (plan) {
      const user = await userRepository.findById(payment.userId)
      if (user) {
        user.tokenBalance = Number(user.tokenBalance) + plan.credits

        if (plan.isPro && plan.proDays) {
          user.isPro = true
          user.proExpiresAt = new Date(Date.now() + plan.proDays * 24 * 60 * 60 * 1000)
        }
        await userRepository.save(user)
        logger.info('Tokens added to user', { userId: user.id, tokens: plan.credits, newBalance: user.tokenBalance })
      }
    }

    logger.info('Payment completed successfully', { transactionId, userId: payment.userId })
    return true
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(userId: string, transactionId: string): Promise<PaymentStatus> {
    const payment = await paymentRepository.raw.findOne({
      where: { transactionId, userId },
    })

    if (!payment) {
      throw new NotFoundError('Payment')
    }

    return {
      status: payment.status,
      completedAt: payment.completedAt,
    }
  }
}

// Singleton instance
export const billingService = new BillingService()
