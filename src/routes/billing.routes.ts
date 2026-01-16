import { Router } from 'express'
import { billingController } from '../controllers/billing.controller'
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware'

const router = Router()

// Protected routes
router.get('/history', authMiddleware, (req, res) => billingController.getHistory(req as AuthRequest, res))
router.post('/create', authMiddleware, (req, res) => billingController.createPayment(req as AuthRequest, res))
router.get('/check/:transactionId', authMiddleware, (req, res) => billingController.checkStatus(req as AuthRequest, res))
router.get('/detail/:paymentId', authMiddleware, (req, res) => billingController.getPaymentDetail(req as AuthRequest, res))

// Public webhook route
router.post('/webhook', (req, res) => billingController.handleWebhook(req, res))

export default router
