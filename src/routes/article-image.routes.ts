import { Router } from 'express'
import { articleImageController } from '../controllers/article-image.controller'
import { authMiddleware, AuthRequest } from '../middlewares'

const router = Router()

// All routes require authentication
router.use(authMiddleware as any)

// Create single article image
router.post('/', (req, res) => articleImageController.createSingle(req as AuthRequest, res))

// Create batch article images (from chunked prompts)
router.post('/batch', (req, res) => articleImageController.createBatch(req as AuthRequest, res))

// Get single task status
router.get('/status', (req, res) => articleImageController.getStatus(req as AuthRequest, res))

// Get batch status
router.post('/status/batch', (req, res) => articleImageController.getBatchStatus(req as AuthRequest, res))

export default router
