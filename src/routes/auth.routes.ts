import { Router } from 'express'
import { authController } from '../controllers/auth.controller'
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware'

const router = Router()

// Public routes
router.post('/register', (req, res) => authController.register(req, res))
router.post('/verify-email', (req, res) => authController.verifyEmail(req, res))
router.post('/resend-verification', (req, res) => authController.resendVerification(req, res))
router.post('/login', (req, res) => authController.login(req, res))

// Protected routes
router.get('/me', authMiddleware, (req, res) => authController.getMe(req as AuthRequest, res))
router.put('/profile', authMiddleware, (req, res) => authController.updateProfile(req as AuthRequest, res))
router.delete('/account', authMiddleware, (req, res) => authController.deactivateAccount(req as AuthRequest, res))

export default router
