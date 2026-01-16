import { Router } from 'express'
import { generateController } from '../controllers/generate.controller'
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware'

const router = Router()

router.post('/', authMiddleware, (req, res) => generateController.createTask(req as AuthRequest, res))
router.get('/status', authMiddleware, (req, res) => generateController.getStatus(req as AuthRequest, res))

export default router
