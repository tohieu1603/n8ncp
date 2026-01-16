import { Router } from 'express'
import { chatController } from '../controllers/chat.controller'
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware'

const router = Router()

// Public routes
router.get('/agents', (req, res) => chatController.getAgents(req, res))

// Protected routes
router.post('/', authMiddleware, (req, res) => chatController.sendMessage(req as AuthRequest, res))
router.post('/stream', authMiddleware, (req, res) => chatController.streamMessage(req as AuthRequest, res))

export default router
