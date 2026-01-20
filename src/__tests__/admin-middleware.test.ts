/**
 * Admin Middleware Tests
 * Tests for admin authorization and role verification
 */

import { Request, Response, NextFunction } from 'express'

// Mock user repository
interface MockUser {
  id: string
  email: string
  role: 'user' | 'admin'
  isActive: boolean
}

const mockUsers: Map<string, MockUser> = new Map()

// Mock admin middleware logic
const adminMiddleware = async (
  user: { userId: string; role: string } | undefined,
  getUserFromDb: (id: string) => Promise<MockUser | null>
): Promise<{ allowed: boolean; error?: string; status?: number }> => {
  if (!user) {
    return { allowed: false, error: 'Authentication required', status: 401 }
  }

  // Quick JWT check
  if (user.role !== 'admin') {
    return { allowed: false, error: 'Admin access required', status: 403 }
  }

  // Database verification
  const dbUser = await getUserFromDb(user.userId)
  if (!dbUser) {
    return { allowed: false, error: 'User not found', status: 401 }
  }

  if (!dbUser.isActive) {
    return { allowed: false, error: 'Account deactivated', status: 401 }
  }

  if (dbUser.role !== 'admin') {
    return { allowed: false, error: 'Admin access required', status: 403 }
  }

  return { allowed: true }
}

describe('Admin Middleware', () => {
  const getUserFromDb = async (id: string): Promise<MockUser | null> => {
    return mockUsers.get(id) || null
  }

  beforeEach(() => {
    mockUsers.clear()
  })

  describe('Authentication Check', () => {
    it('should return 401 when no user in request', async () => {
      const result = await adminMiddleware(undefined, getUserFromDb)

      expect(result.allowed).toBe(false)
      expect(result.status).toBe(401)
      expect(result.error).toBe('Authentication required')
    })
  })

  describe('JWT Role Check', () => {
    it('should return 403 when JWT role is not admin', async () => {
      const result = await adminMiddleware(
        { userId: 'user-1', role: 'user' },
        getUserFromDb
      )

      expect(result.allowed).toBe(false)
      expect(result.status).toBe(403)
      expect(result.error).toBe('Admin access required')
    })
  })

  describe('Database Verification', () => {
    it('should allow admin user verified from database', async () => {
      mockUsers.set('admin-1', {
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
        isActive: true,
      })

      const result = await adminMiddleware(
        { userId: 'admin-1', role: 'admin' },
        getUserFromDb
      )

      expect(result.allowed).toBe(true)
    })

    it('should reject when user not found in database', async () => {
      // User claims to be admin in JWT but not in DB
      const result = await adminMiddleware(
        { userId: 'fake-admin', role: 'admin' },
        getUserFromDb
      )

      expect(result.allowed).toBe(false)
      expect(result.status).toBe(401)
      expect(result.error).toBe('User not found')
    })

    it('should reject when JWT role does not match database role', async () => {
      // JWT says admin but DB says user (role changed)
      mockUsers.set('user-1', {
        id: 'user-1',
        email: 'user@example.com',
        role: 'user', // DB has 'user'
        isActive: true,
      })

      const result = await adminMiddleware(
        { userId: 'user-1', role: 'admin' }, // JWT claims 'admin'
        getUserFromDb
      )

      expect(result.allowed).toBe(false)
      expect(result.status).toBe(403)
      expect(result.error).toBe('Admin access required')
    })

    it('should reject deactivated admin accounts', async () => {
      mockUsers.set('admin-1', {
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
        isActive: false, // Deactivated
      })

      const result = await adminMiddleware(
        { userId: 'admin-1', role: 'admin' },
        getUserFromDb
      )

      expect(result.allowed).toBe(false)
      expect(result.status).toBe(401)
      expect(result.error).toBe('Account deactivated')
    })
  })

  describe('Token Forgery Prevention', () => {
    it('should prevent access with forged admin token', async () => {
      // Normal user in database
      mockUsers.set('user-1', {
        id: 'user-1',
        email: 'user@example.com',
        role: 'user',
        isActive: true,
      })

      // Attacker forges JWT claiming admin role
      const result = await adminMiddleware(
        { userId: 'user-1', role: 'admin' }, // Forged JWT
        getUserFromDb
      )

      expect(result.allowed).toBe(false)
      expect(result.status).toBe(403)
    })

    it('should prevent access with non-existent user ID in token', async () => {
      // Attacker creates JWT with fake user ID
      const result = await adminMiddleware(
        { userId: 'non-existent-id', role: 'admin' },
        getUserFromDb
      )

      expect(result.allowed).toBe(false)
    })
  })

  describe('Role Change Enforcement', () => {
    it('should immediately revoke access when demoted', async () => {
      // Admin was demoted to user in DB
      mockUsers.set('former-admin', {
        id: 'former-admin',
        email: 'former@example.com',
        role: 'user', // Was admin, now user
        isActive: true,
      })

      // Old JWT still has admin role
      const result = await adminMiddleware(
        { userId: 'former-admin', role: 'admin' },
        getUserFromDb
      )

      expect(result.allowed).toBe(false)
      expect(result.error).toBe('Admin access required')
    })
  })
})

describe('Last Admin Protection', () => {
  const countActiveAdmins = (): number => {
    let count = 0
    mockUsers.forEach(user => {
      if (user.role === 'admin' && user.isActive) count++
    })
    return count
  }

  const canDemoteAdmin = (userId: string): { allowed: boolean; error?: string } => {
    const user = mockUsers.get(userId)
    if (!user || user.role !== 'admin') {
      return { allowed: true } // Not an admin, can change
    }

    const activeAdminCount = countActiveAdmins()
    if (activeAdminCount <= 1) {
      return {
        allowed: false,
        error: 'Cannot demote the last admin. Promote another user to admin first.',
      }
    }

    return { allowed: true }
  }

  const canDeactivateAdmin = (userId: string): { allowed: boolean; error?: string } => {
    const user = mockUsers.get(userId)
    if (!user || user.role !== 'admin' || !user.isActive) {
      return { allowed: true }
    }

    const activeAdminCount = countActiveAdmins()
    if (activeAdminCount <= 1) {
      return {
        allowed: false,
        error: 'Cannot deactivate the last admin. Promote another user to admin first.',
      }
    }

    return { allowed: true }
  }

  beforeEach(() => {
    mockUsers.clear()
  })

  it('should prevent demoting the only admin', () => {
    mockUsers.set('admin-1', {
      id: 'admin-1',
      email: 'admin@example.com',
      role: 'admin',
      isActive: true,
    })

    const result = canDemoteAdmin('admin-1')

    expect(result.allowed).toBe(false)
    expect(result.error).toContain('Cannot demote the last admin')
  })

  it('should allow demoting admin when others exist', () => {
    mockUsers.set('admin-1', {
      id: 'admin-1',
      email: 'admin1@example.com',
      role: 'admin',
      isActive: true,
    })
    mockUsers.set('admin-2', {
      id: 'admin-2',
      email: 'admin2@example.com',
      role: 'admin',
      isActive: true,
    })

    const result = canDemoteAdmin('admin-1')

    expect(result.allowed).toBe(true)
  })

  it('should prevent deactivating the only admin', () => {
    mockUsers.set('admin-1', {
      id: 'admin-1',
      email: 'admin@example.com',
      role: 'admin',
      isActive: true,
    })

    const result = canDeactivateAdmin('admin-1')

    expect(result.allowed).toBe(false)
    expect(result.error).toContain('Cannot deactivate the last admin')
  })

  it('should not count inactive admins', () => {
    mockUsers.set('admin-1', {
      id: 'admin-1',
      email: 'admin1@example.com',
      role: 'admin',
      isActive: true,
    })
    mockUsers.set('admin-2', {
      id: 'admin-2',
      email: 'admin2@example.com',
      role: 'admin',
      isActive: false, // Inactive
    })

    // admin-1 is the only active admin
    const result = canDeactivateAdmin('admin-1')

    expect(result.allowed).toBe(false)
  })
})
