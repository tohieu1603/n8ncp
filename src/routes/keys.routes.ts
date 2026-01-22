import { Router } from 'express'
import { keysController } from '../controllers/keys.controller'
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware'

const router = Router()

router.get('/', authMiddleware, (req, res) => keysController.getKeys(req as AuthRequest, res))
router.get('/:id/reveal', authMiddleware, (req, res) => keysController.revealKey(req as AuthRequest, res))
router.post('/', authMiddleware, (req, res) => keysController.createKey(req as AuthRequest, res))
router.delete('/:id', authMiddleware, (req, res) => keysController.deleteKey(req as AuthRequest, res))

export default router
