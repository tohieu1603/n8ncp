import { Router } from 'express'
import { adminController } from '../controllers/admin.controller'
import { authMiddleware, adminMiddleware, AuthRequest } from '../middlewares'

const router = Router()

// All admin routes require authentication + admin role
router.use(authMiddleware as any)
router.use(adminMiddleware as any)

// ==================== USER MANAGEMENT ====================
router.get('/users', (req, res) => adminController.getUsers(req as AuthRequest, res))
router.get('/users/stats', (req, res) => adminController.getUserStats(req as AuthRequest, res))
router.get('/users/:id', (req, res) => adminController.getUserById(req as AuthRequest, res))
router.patch('/users/:id/role', (req, res) => adminController.updateUserRole(req as AuthRequest, res))
router.patch('/users/:id/status', (req, res) => adminController.toggleUserStatus(req as AuthRequest, res))

// ==================== POST MANAGEMENT ====================
router.get('/posts', (req, res) => adminController.getPosts(req as AuthRequest, res))
router.get('/posts/:id', (req, res) => adminController.getPostById(req as AuthRequest, res))
router.post('/posts', (req, res) => adminController.createPost(req as AuthRequest, res))
router.put('/posts/:id', (req, res) => adminController.updatePost(req as AuthRequest, res))
router.delete('/posts/:id', (req, res) => adminController.deletePost(req as AuthRequest, res))
router.post('/posts/:id/publish', (req, res) => adminController.publishPost(req as AuthRequest, res))
router.post('/posts/:id/unpublish', (req, res) => adminController.unpublishPost(req as AuthRequest, res))

export default router
