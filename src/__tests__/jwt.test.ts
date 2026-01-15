import { signToken, verifyToken, decodeToken, isTokenExpired } from '../utils/jwt'
import jwt from 'jsonwebtoken'

describe('JWT Utilities', () => {
  const testPayload = {
    userId: 'test-user-123',
    email: 'test@example.com',
  }

  describe('signToken', () => {
    it('should create a valid JWT token', () => {
      const token = signToken(testPayload)
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3)
    })

    it('should include userId and email in payload', () => {
      const token = signToken(testPayload)
      const decoded = jwt.decode(token) as any
      expect(decoded.userId).toBe(testPayload.userId)
      expect(decoded.email).toBe(testPayload.email)
    })

    it('should include iat (issued at) in payload', () => {
      const token = signToken(testPayload)
      const decoded = jwt.decode(token) as any
      expect(decoded.iat).toBeDefined()
      expect(typeof decoded.iat).toBe('number')
    })

    it('should include exp (expiration) in payload', () => {
      const token = signToken(testPayload)
      const decoded = jwt.decode(token) as any
      expect(decoded.exp).toBeDefined()
      expect(decoded.exp).toBeGreaterThan(decoded.iat)
    })
  })

  describe('verifyToken', () => {
    it('should return success true for valid token', () => {
      const token = signToken(testPayload)
      const result = verifyToken(token)
      expect(result.success).toBe(true)
      expect(result.payload).toBeDefined()
      expect(result.payload?.userId).toBe(testPayload.userId)
      expect(result.payload?.email).toBe(testPayload.email)
    })

    it('should return success false for invalid token', () => {
      const result = verifyToken('invalid-token')
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should return success false for tampered token', () => {
      const token = signToken(testPayload)
      const tamperedToken = token.slice(0, -5) + 'xxxxx'
      const result = verifyToken(tamperedToken)
      expect(result.success).toBe(false)
    })

    it('should return success false for expired token', () => {
      // Create token with expired time
      const expiredToken = jwt.sign(testPayload, 'test-jwt-secret-key-for-testing', {
        expiresIn: '-1h',
      })
      const result = verifyToken(expiredToken)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Token expired')
    })

    it('should return success false for empty token', () => {
      const result = verifyToken('')
      expect(result.success).toBe(false)
    })
  })

  describe('decodeToken', () => {
    it('should decode valid token without verification', () => {
      const token = signToken(testPayload)
      const decoded = decodeToken(token)
      expect(decoded).not.toBeNull()
      expect(decoded?.userId).toBe(testPayload.userId)
      expect(decoded?.email).toBe(testPayload.email)
    })

    it('should decode token even with wrong secret', () => {
      const token = jwt.sign(testPayload, 'different-secret')
      const decoded = decodeToken(token)
      expect(decoded).not.toBeNull()
      expect(decoded?.userId).toBe(testPayload.userId)
    })

    it('should return null for invalid token', () => {
      const decoded = decodeToken('not-a-jwt-token')
      expect(decoded).toBeNull()
    })
  })

  describe('isTokenExpired', () => {
    it('should return false for valid non-expired token', () => {
      const token = signToken(testPayload)
      expect(isTokenExpired(token)).toBe(false)
    })

    it('should return true for expired token', () => {
      const expiredToken = jwt.sign(testPayload, 'test-jwt-secret-key-for-testing', {
        expiresIn: '-1h',
      })
      expect(isTokenExpired(expiredToken)).toBe(true)
    })

    it('should return true for invalid token', () => {
      expect(isTokenExpired('invalid-token')).toBe(true)
    })

    it('should return true for token without exp claim', () => {
      const tokenWithoutExp = jwt.sign(testPayload, 'test-jwt-secret-key-for-testing', {
        noTimestamp: true,
      })
      expect(isTokenExpired(tokenWithoutExp)).toBe(true)
    })
  })
})
