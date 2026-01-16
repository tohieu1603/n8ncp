import { Request, Response } from 'express'
import { billingService } from '../services/billing.service'
import { response } from '../utils/response'
import { logger } from '../utils/logger'
import { AuthRequest } from '../middlewares/auth.middleware'
import { AppError } from '../errors/app.error'

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
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
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
