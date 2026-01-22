import { Router } from 'express'
import { conversationController } from '../controllers/conversation.controller'
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware'

const router = Router()

// All routes are protected
router.get('/', authMiddleware, (req, res) => conversationController.list(req as AuthRequest, res))
router.post('/', authMiddleware, (req, res) => conversationController.create(req as AuthRequest, res))
router.get('/:id', authMiddleware, (req, res) => conversationController.get(req as AuthRequest, res))
router.put('/:id', authMiddleware, (req, res) => conversationController.update(req as AuthRequest, res))
router.delete('/:id', authMiddleware, (req, res) => conversationController.delete(req as AuthRequest, res))

export default router
