import { Router } from 'express'
import { usageController } from '../controllers/usage.controller'
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware'

const router = Router()

router.get('/summary', authMiddleware, (req, res) => usageController.getSummary(req as AuthRequest, res))
router.get('/logs', authMiddleware, (req, res) => usageController.getLogs(req as AuthRequest, res))
router.get('/stats', authMiddleware, (req, res) => usageController.getStats(req as AuthRequest, res))

export default router
