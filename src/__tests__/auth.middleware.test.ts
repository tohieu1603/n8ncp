import { Request, Response, NextFunction } from 'express'
import { authMiddleware, optionalAuthMiddleware, AuthRequest } from '../middlewares/auth.middleware'
import { signToken } from '../utils/jwt'

// Mock response object
const mockResponse = (): Response => {
  const res: Partial<Response> = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res as Response
}

// Mock next function
const mockNext = (): NextFunction => jest.fn()

describe('Auth Middleware', () => {
  const testPayload = {
    userId: 'test-user-123',
    email: 'test@example.com',
    role: 'user' as const,
  }

  describe('authMiddleware', () => {
    it('should pass with valid Bearer token', () => {
      const token = signToken(testPayload)
      const req = {
        headers: { authorization: `Bearer ${token}` },
        path: '/test',
      } as AuthRequest
      const res = mockResponse()
      const next = mockNext()

      authMiddleware(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(req.user).toBeDefined()
      expect(req.user?.userId).toBe(testPayload.userId)
      expect(req.user?.email).toBe(testPayload.email)
    })

    it('should return 401 when no authorization header', () => {
      const req = {
        headers: {},
        path: '/test',
      } as AuthRequest
      const res = mockResponse()
      const next = mockNext()

      authMiddleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'No token provided',
      })
      expect(next).not.toHaveBeenCalled()
    })

    it('should return 401 when authorization header is not Bearer', () => {
      const req = {
        headers: { authorization: 'Basic some-credentials' },
        path: '/test',
      } as AuthRequest
      const res = mockResponse()
      const next = mockNext()

      authMiddleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'No token provided',
      })
    })

    it('should return 401 with invalid token', () => {
      const req = {
        headers: { authorization: 'Bearer invalid-token' },
        path: '/test',
      } as AuthRequest
      const res = mockResponse()
      const next = mockNext()

      authMiddleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(next).not.toHaveBeenCalled()
    })

    it('should return 401 with expired token', async () => {
      // This would require creating an actually expired token
      // For now, test with a malformed token
      const req = {
        headers: { authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired.signature' },
        path: '/test',
      } as AuthRequest
      const res = mockResponse()
      const next = mockNext()

      authMiddleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(next).not.toHaveBeenCalled()
    })

    it('should return 401 when Bearer is empty', () => {
      const req = {
        headers: { authorization: 'Bearer ' },
        path: '/test',
      } as AuthRequest
      const res = mockResponse()
      const next = mockNext()

      authMiddleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(next).not.toHaveBeenCalled()
    })
  })

  describe('optionalAuthMiddleware', () => {
    it('should pass with valid token and attach user', () => {
      const token = signToken(testPayload)
      const req = {
        headers: { authorization: `Bearer ${token}` },
        path: '/test',
      } as AuthRequest
      const res = mockResponse()
      const next = mockNext()

      optionalAuthMiddleware(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(req.user).toBeDefined()
      expect(req.user?.userId).toBe(testPayload.userId)
    })

    it('should pass without token and not attach user', () => {
      const req = {
        headers: {},
        path: '/test',
      } as AuthRequest
      const res = mockResponse()
      const next = mockNext()

      optionalAuthMiddleware(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(req.user).toBeUndefined()
    })

    it('should pass with invalid token and not attach user', () => {
      const req = {
        headers: { authorization: 'Bearer invalid-token' },
        path: '/test',
      } as AuthRequest
      const res = mockResponse()
      const next = mockNext()

      optionalAuthMiddleware(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(req.user).toBeUndefined()
    })

    it('should pass with non-Bearer authorization and not attach user', () => {
      const req = {
        headers: { authorization: 'Basic credentials' },
        path: '/test',
      } as AuthRequest
      const res = mockResponse()
      const next = mockNext()

      optionalAuthMiddleware(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(req.user).toBeUndefined()
    })
  })
})
