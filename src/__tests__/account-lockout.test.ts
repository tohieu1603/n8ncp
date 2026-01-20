/**
 * Account Lockout Tests
 * Tests for brute force protection mechanisms
 */

describe('Account Lockout - Brute Force Protection', () => {
  // Mock in-memory storage for login attempts
  const loginAttempts = new Map<string, { count: number; firstAttempt: number; lockedUntil?: number }>()
  const MAX_LOGIN_ATTEMPTS = 5
  const LOCKOUT_DURATION_MS = 30 * 60 * 1000 // 30 minutes

  // Helper functions
  const getAttemptKey = (email: string, ip: string) => `${email}:${ip}`

  const isAccountLocked = (email: string, ip: string): boolean => {
    const key = getAttemptKey(email, ip)
    const attempt = loginAttempts.get(key)
    if (!attempt) return false
    if (attempt.lockedUntil && Date.now() < attempt.lockedUntil) {
      return true
    }
    return false
  }

  const recordFailedLogin = (email: string, ip: string): void => {
    const key = getAttemptKey(email, ip)
    const attempt = loginAttempts.get(key)
    const now = Date.now()

    if (!attempt) {
      loginAttempts.set(key, { count: 1, firstAttempt: now })
      return
    }

    // Reset if window expired (1 hour window)
    if (now - attempt.firstAttempt > 60 * 60 * 1000) {
      loginAttempts.set(key, { count: 1, firstAttempt: now })
      return
    }

    attempt.count++
    if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
      attempt.lockedUntil = now + LOCKOUT_DURATION_MS
    }
  }

  const clearLoginAttempts = (email: string): void => {
    // Clear all attempts for this email (any IP)
    for (const key of loginAttempts.keys()) {
      if (key.startsWith(`${email}:`)) {
        loginAttempts.delete(key)
      }
    }
  }

  beforeEach(() => {
    loginAttempts.clear()
  })

  describe('Failed Login Tracking', () => {
    it('should track failed login attempts', () => {
      const email = 'test@example.com'
      const ip = '192.168.1.1'

      recordFailedLogin(email, ip)
      recordFailedLogin(email, ip)
      recordFailedLogin(email, ip)

      const key = getAttemptKey(email, ip)
      const attempt = loginAttempts.get(key)
      expect(attempt?.count).toBe(3)
    })

    it('should track attempts separately by email and IP', () => {
      recordFailedLogin('user1@example.com', '192.168.1.1')
      recordFailedLogin('user1@example.com', '192.168.1.1')
      recordFailedLogin('user2@example.com', '192.168.1.1')
      recordFailedLogin('user1@example.com', '192.168.1.2')

      expect(loginAttempts.get('user1@example.com:192.168.1.1')?.count).toBe(2)
      expect(loginAttempts.get('user2@example.com:192.168.1.1')?.count).toBe(1)
      expect(loginAttempts.get('user1@example.com:192.168.1.2')?.count).toBe(1)
    })
  })

  describe('Account Locking', () => {
    it('should lock account after 5 failed attempts', () => {
      const email = 'test@example.com'
      const ip = '192.168.1.1'

      for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i++) {
        recordFailedLogin(email, ip)
      }

      expect(isAccountLocked(email, ip)).toBe(true)
    })

    it('should not lock account before 5 failed attempts', () => {
      const email = 'test@example.com'
      const ip = '192.168.1.1'

      for (let i = 0; i < MAX_LOGIN_ATTEMPTS - 1; i++) {
        recordFailedLogin(email, ip)
      }

      expect(isAccountLocked(email, ip)).toBe(false)
    })

    it('should unlock account after lockout duration', () => {
      const email = 'test@example.com'
      const ip = '192.168.1.1'
      const key = getAttemptKey(email, ip)

      // Simulate past lockout
      loginAttempts.set(key, {
        count: MAX_LOGIN_ATTEMPTS,
        firstAttempt: Date.now() - LOCKOUT_DURATION_MS - 1000,
        lockedUntil: Date.now() - 1000, // Already expired
      })

      expect(isAccountLocked(email, ip)).toBe(false)
    })
  })

  describe('Clearing Attempts', () => {
    it('should clear attempts on successful login', () => {
      const email = 'test@example.com'

      recordFailedLogin(email, '192.168.1.1')
      recordFailedLogin(email, '192.168.1.2')
      recordFailedLogin(email, '192.168.1.3')

      clearLoginAttempts(email)

      expect(loginAttempts.size).toBe(0)
    })

    it('should not affect other users when clearing', () => {
      recordFailedLogin('user1@example.com', '192.168.1.1')
      recordFailedLogin('user2@example.com', '192.168.1.1')

      clearLoginAttempts('user1@example.com')

      expect(loginAttempts.has('user1@example.com:192.168.1.1')).toBe(false)
      expect(loginAttempts.has('user2@example.com:192.168.1.1')).toBe(true)
    })
  })

  describe('Lockout Message', () => {
    it('should provide remaining lockout time', () => {
      const email = 'test@example.com'
      const ip = '192.168.1.1'
      const key = getAttemptKey(email, ip)
      const lockoutEnd = Date.now() + 15 * 60 * 1000 // 15 minutes from now

      loginAttempts.set(key, {
        count: MAX_LOGIN_ATTEMPTS,
        firstAttempt: Date.now(),
        lockedUntil: lockoutEnd,
      })

      const getRemainingLockoutMinutes = (email: string, ip: string): number => {
        const attempt = loginAttempts.get(getAttemptKey(email, ip))
        if (!attempt?.lockedUntil) return 0
        return Math.ceil((attempt.lockedUntil - Date.now()) / 60000)
      }

      const remaining = getRemainingLockoutMinutes(email, ip)
      expect(remaining).toBeGreaterThan(0)
      expect(remaining).toBeLessThanOrEqual(15)
    })
  })
})
