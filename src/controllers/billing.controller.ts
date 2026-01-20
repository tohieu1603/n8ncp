import { Request, Response } from 'express'
import { billingService } from '../services/billing.service'
import { response } from '../utils/response'
import { logger } from '../utils/logger'
import { AuthRequest } from '../middlewares/auth.middleware'
import { AppError } from '../errors/app.error'

// SECURITY: Allowed IP ranges for SePay webhooks
// Add SePay's actual IP ranges here
const SEPAY_ALLOWED_IPS = (process.env.SEPAY_ALLOWED_IPS || '').split(',').filter(Boolean)
const WEBHOOK_IP_CHECK_ENABLED = process.env.NODE_ENV === 'production' && SEPAY_ALLOWED_IPS.length > 0

/**
 * Check if IP is in allowed list for webhooks
 * SECURITY: Prevents unauthorized webhook calls
 */
function isAllowedWebhookIP(ip: string | undefined): boolean {
  if (!WEBHOOK_IP_CHECK_ENABLED) {
    return true // Skip check in development or if not configured
  }

  if (!ip) return false

  // Handle IPv6 mapped IPv4 addresses
  const normalizedIP = ip.replace(/^::ffff:/, '')

  return SEPAY_ALLOWED_IPS.some(allowedIP => {
    const trimmed = allowedIP.trim()
    // Support CIDR notation (e.g., 192.168.1.0/24)
    if (trimmed.includes('/')) {
      return isIPInCIDR(normalizedIP, trimmed)
    }
    return normalizedIP === trimmed
  })
}

/**
 * Check if IP is in CIDR range
 */
function isIPInCIDR(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.split('/')
  const mask = ~(2 ** (32 - parseInt(bits)) - 1)

  const ipNum = ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0)
  const rangeNum = range.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0)

  return (ipNum & mask) === (rangeNum & mask)
}

/**
 * Billing Controller - handles HTTP layer for payments
 */
export class BillingController {
  /**
   * GET /api/billing/history
   */
  async getHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const history = await billingService.getPaymentHistory(req.user!.userId)
      response.success(res, history)
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch payment history')
    }
  }

  /**
   * POST /api/billing/create
   */
  async createPayment(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { planId, amount } = req.body

      if (!planId) {
        response.badRequest(res, 'Plan ID is required')
        return
      }

      const result = await billingService.createPayment(req.user!.userId, planId, amount)
      response.success(res, result)
    } catch (error) {
      this.handleError(res, error, 'Failed to create payment')
    }
  }

  /**
   * POST /api/billing/webhook
   * SECURITY: IP whitelist + signature verification
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      // SECURITY: Check IP whitelist first
      if (!isAllowedWebhookIP(req.ip)) {
        logger.warn('Webhook rejected: IP not in whitelist', {
          ip: req.ip,
          allowedIPs: SEPAY_ALLOWED_IPS,
        })
        res.status(403).json({ success: false, error: 'Forbidden' })
        return
      }

      // Verify webhook signature
      const signature = req.headers['x-sepay-signature'] as string | undefined
      if (!billingService.verifyWebhookSignature(req.body, signature)) {
        logger.warn('Invalid webhook signature', {
          ip: req.ip,
          signature: signature?.substring(0, 20),
        })
        res.status(401).json({ success: false, error: 'Invalid signature' })
        return
      }

      const { id, content, transferAmount, gateway } = req.body

      await billingService.processWebhook({ id, content, transferAmount, gateway })
      res.json({ success: true })
    } catch (error) {
      logger.error('Webhook processing error', error as Error)
      res.json({ success: true }) // Always acknowledge to prevent retries
    }
  }

  /**
   * GET /api/billing/check/:transactionId
   */
  async checkStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { transactionId } = req.params
      const result = await billingService.checkPaymentStatus(req.user!.userId, transactionId)
      response.success(res, result)
    } catch (error) {
      this.handleError(res, error, 'Failed to check payment status')
    }
  }

  /**
   * GET /api/billing/detail/:paymentId
   */
  async getPaymentDetail(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { paymentId } = req.params
      const result = await billingService.getPaymentDetail(req.user!.userId, paymentId)
      if (!result) {
        response.notFound(res, 'Payment not found')
        return
      }
      response.success(res, result)
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch payment detail')
    }
  }

  /**
   * Centralized error handler
   */
  private handleError(res: Response, error: unknown, defaultMessage: string): void {
    if (error instanceof AppError) {
      response.error(res, error.message, error.statusCode, { code: error.code })
      return
    }

    logger.error(defaultMessage, error as Error)
    response.serverError(res, defaultMessage)
  }
}

// Singleton instance
export const billingController = new BillingController()
