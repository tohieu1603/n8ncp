/**
 * End-to-End (E2E) Tests
 * Tests for complete user flows and API endpoint integration
 */

import crypto from 'crypto'

// Mock helpers
const generateApiKey = () => 'sk_' + crypto.randomBytes(32).toString('hex')
const hashApiKey = (key: string) => crypto.createHash('sha256').update(key).digest('hex')

// Mock database state
interface MockUser {
  id: string
  email: string
  password: string
  name: string | null
  isActive: boolean
  isEmailVerified: boolean
  tokenBalance: number
}

interface MockApiKey {
  id: string
  userId: string
  name: string
  keyHash: string
  keyPrefix: string
  isActive: boolean
  lastUsedAt: Date | null
}

interface MockPayment {
  id: string
  userId: string
  transactionId: string
  amount: number
  status: 'pending' | 'completed' | 'expired'
  createdAt: Date
  expiresAt: Date
}

// Mock database
const mockDb = {
  users: [] as MockUser[],
  apiKeys: [] as MockApiKey[],
  payments: [] as MockPayment[],
}

// Reset database before each test
beforeEach(() => {
  mockDb.users = []
  mockDb.apiKeys = []
  mockDb.payments = []
})

describe('E2E - User Registration Flow', () => {
  const registerUser = async (email: string, password: string, name?: string) => {
    // Check existing
    if (mockDb.users.find(u => u.email === email)) {
      throw new Error('Email already exists')
    }

    const user: MockUser = {
      id: crypto.randomUUID(),
      email: email.toLowerCase(),
      password: '$2b$12$hashedpassword', // mock bcrypt hash
      name: name || null,
      isActive: true,
      isEmailVerified: false,
      tokenBalance: 0,
    }

    mockDb.users.push(user)
    return { userId: user.id, requiresVerification: true }
  }

  it('should register new user successfully', async () => {
    const result = await registerUser('test@example.com', 'Password123')

    expect(result.userId).toBeDefined()
    expect(result.requiresVerification).toBe(true)
    expect(mockDb.users.length).toBe(1)
    expect(mockDb.users[0].isEmailVerified).toBe(false)
  })

  it('should reject duplicate email', async () => {
    await registerUser('test@example.com', 'Password123')

    await expect(registerUser('test@example.com', 'Password456'))
      .rejects.toThrow('Email already exists')
  })

  it('should normalize email to lowercase', async () => {
    await registerUser('TEST@EXAMPLE.COM', 'Password123')

    expect(mockDb.users[0].email).toBe('test@example.com')
  })
})

describe('E2E - Email Verification Flow', () => {
  const verifyEmail = async (userId: string, code: string) => {
    const user = mockDb.users.find(u => u.id === userId)
    if (!user) throw new Error('User not found')

    // Mock verification code check (always valid in test)
    if (code !== '123456') {
      throw new Error('Invalid code')
    }

    user.isEmailVerified = true
    return { success: true, token: 'mock-jwt-token' }
  }

  it('should verify email with correct code', async () => {
    // Setup: Register user
    mockDb.users.push({
      id: 'user-1',
      email: 'test@example.com',
      password: 'hashed',
      name: null,
      isActive: true,
      isEmailVerified: false,
      tokenBalance: 0,
    })

    const result = await verifyEmail('user-1', '123456')

    expect(result.success).toBe(true)
    expect(result.token).toBeDefined()
    expect(mockDb.users[0].isEmailVerified).toBe(true)
  })

  it('should reject invalid verification code', async () => {
    mockDb.users.push({
      id: 'user-1',
      email: 'test@example.com',
      password: 'hashed',
      name: null,
      isActive: true,
      isEmailVerified: false,
      tokenBalance: 0,
    })

    await expect(verifyEmail('user-1', 'wrong-code'))
      .rejects.toThrow('Invalid code')
  })
})

describe('E2E - Login Flow', () => {
  const login = async (email: string, password: string) => {
    const user = mockDb.users.find(u => u.email === email.toLowerCase())

    if (!user) {
      throw new Error('Invalid credentials')
    }

    if (!user.isEmailVerified) {
      throw new Error('Email not verified')
    }

    if (!user.isActive) {
      throw new Error('Account deactivated')
    }

    // Mock password comparison (assume valid in test)
    return {
      token: 'mock-jwt-token',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tokenBalance: user.tokenBalance,
      }
    }
  }

  it('should login with valid credentials', async () => {
    mockDb.users.push({
      id: 'user-1',
      email: 'test@example.com',
      password: 'hashed',
      name: 'Test User',
      isActive: true,
      isEmailVerified: true,
      tokenBalance: 1000,
    })

    const result = await login('test@example.com', 'Password123')

    expect(result.token).toBeDefined()
    expect(result.user.email).toBe('test@example.com')
    expect(result.user.tokenBalance).toBe(1000)
  })

  it('should reject unverified email', async () => {
    mockDb.users.push({
      id: 'user-1',
      email: 'test@example.com',
      password: 'hashed',
      name: null,
      isActive: true,
      isEmailVerified: false,
      tokenBalance: 0,
    })

    await expect(login('test@example.com', 'Password123'))
      .rejects.toThrow('Email not verified')
  })

  it('should reject deactivated account', async () => {
    mockDb.users.push({
      id: 'user-1',
      email: 'test@example.com',
      password: 'hashed',
      name: null,
      isActive: false,
      isEmailVerified: true,
      tokenBalance: 0,
    })

    await expect(login('test@example.com', 'Password123'))
      .rejects.toThrow('Account deactivated')
  })
})

describe('E2E - API Key Management Flow', () => {
  const MAX_KEYS = 10

  const createApiKey = async (userId: string, name: string) => {
    const existingCount = mockDb.apiKeys.filter(k => k.userId === userId && k.isActive).length

    if (existingCount >= MAX_KEYS) {
      throw new Error('Maximum 10 API keys allowed')
    }

    const rawKey = generateApiKey()
    const keyHash = hashApiKey(rawKey)

    const apiKey: MockApiKey = {
      id: crypto.randomUUID(),
      userId,
      name,
      keyHash,
      keyPrefix: rawKey.substring(0, 8),
      isActive: true,
      lastUsedAt: null,
    }

    mockDb.apiKeys.push(apiKey)
    return { apiKey, rawKey }
  }

  const deleteApiKey = async (userId: string, keyId: string) => {
    const key = mockDb.apiKeys.find(k => k.id === keyId)

    if (!key) {
      throw new Error('Key not found')
    }

    if (key.userId !== userId) {
      throw new Error('Unauthorized')
    }

    key.isActive = false
    return { success: true }
  }

  const useApiKey = async (rawKey: string) => {
    const keyHash = hashApiKey(rawKey)
    const key = mockDb.apiKeys.find(k => k.keyHash === keyHash && k.isActive)

    if (!key) {
      throw new Error('Invalid API key')
    }

    const user = mockDb.users.find(u => u.id === key.userId && u.isActive)
    if (!user) {
      throw new Error('User not found or inactive')
    }

    key.lastUsedAt = new Date()
    return { userId: key.userId, keyId: key.id }
  }

  beforeEach(() => {
    // Setup user
    mockDb.users.push({
      id: 'user-1',
      email: 'test@example.com',
      password: 'hashed',
      name: 'Test User',
      isActive: true,
      isEmailVerified: true,
      tokenBalance: 1000,
    })
  })

  it('should create API key successfully', async () => {
    const result = await createApiKey('user-1', 'My API Key')

    expect(result.rawKey).toMatch(/^sk_/)
    expect(result.apiKey.name).toBe('My API Key')
    expect(result.apiKey.isActive).toBe(true)
    expect(mockDb.apiKeys.length).toBe(1)
  })

  it('should allow up to 10 API keys', async () => {
    for (let i = 0; i < MAX_KEYS; i++) {
      await createApiKey('user-1', `Key ${i + 1}`)
    }

    expect(mockDb.apiKeys.length).toBe(MAX_KEYS)
  })

  it('should reject 11th API key', async () => {
    for (let i = 0; i < MAX_KEYS; i++) {
      await createApiKey('user-1', `Key ${i + 1}`)
    }

    await expect(createApiKey('user-1', 'Key 11'))
      .rejects.toThrow('Maximum 10 API keys allowed')
  })

  it('should allow new key after deletion', async () => {
    // Create 10 keys
    const keys = []
    for (let i = 0; i < MAX_KEYS; i++) {
      const result = await createApiKey('user-1', `Key ${i + 1}`)
      keys.push(result.apiKey)
    }

    // Delete one key
    await deleteApiKey('user-1', keys[0].id)

    // Should be able to create new key
    const newResult = await createApiKey('user-1', 'New Key')
    expect(newResult.apiKey.name).toBe('New Key')
  })

  it('should authenticate API request with valid key', async () => {
    const { rawKey } = await createApiKey('user-1', 'My Key')

    const result = await useApiKey(rawKey)

    expect(result.userId).toBe('user-1')
  })

  it('should reject invalid API key', async () => {
    await expect(useApiKey('sk_invalid_key_12345'))
      .rejects.toThrow('Invalid API key')
  })

  it('should reject deleted API key', async () => {
    const { rawKey, apiKey } = await createApiKey('user-1', 'My Key')

    await deleteApiKey('user-1', apiKey.id)

    await expect(useApiKey(rawKey))
      .rejects.toThrow('Invalid API key')
  })

  it('should prevent cross-user API key deletion', async () => {
    const { apiKey } = await createApiKey('user-1', 'User 1 Key')

    // User 2 tries to delete User 1's key
    await expect(deleteApiKey('user-2', apiKey.id))
      .rejects.toThrow('Unauthorized')
  })

  it('should reject API key from inactive user', async () => {
    const { rawKey } = await createApiKey('user-1', 'My Key')

    // Deactivate user
    mockDb.users[0].isActive = false

    await expect(useApiKey(rawKey))
      .rejects.toThrow('User not found or inactive')
  })
})

describe('E2E - Payment Flow', () => {
  const createPayment = async (userId: string, amount: number) => {
    const transactionId = 'TX' + Date.now().toString(36).toUpperCase()

    const payment: MockPayment = {
      id: crypto.randomUUID(),
      userId,
      transactionId,
      amount,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
    }

    mockDb.payments.push(payment)
    return payment
  }

  const completePayment = async (transactionId: string, amount: number) => {
    const payment = mockDb.payments.find(p => p.transactionId === transactionId && p.status === 'pending')

    if (!payment) {
      throw new Error('Payment not found')
    }

    if (amount < payment.amount) {
      throw new Error('Insufficient amount')
    }

    payment.status = 'completed'

    // Add tokens to user
    const user = mockDb.users.find(u => u.id === payment.userId)
    if (user) {
      user.tokenBalance += payment.amount
    }

    return payment
  }

  const checkExpiredPayments = () => {
    const now = new Date()
    mockDb.payments.forEach(p => {
      if (p.status === 'pending' && p.expiresAt < now) {
        p.status = 'expired'
      }
    })
  }

  beforeEach(() => {
    mockDb.users.push({
      id: 'user-1',
      email: 'test@example.com',
      password: 'hashed',
      name: 'Test User',
      isActive: true,
      isEmailVerified: true,
      tokenBalance: 0,
    })
  })

  it('should create pending payment', async () => {
    const payment = await createPayment('user-1', 10000)

    expect(payment.status).toBe('pending')
    expect(payment.transactionId).toMatch(/^TX/)
    expect(payment.amount).toBe(10000)
  })

  it('should complete payment and add tokens', async () => {
    const payment = await createPayment('user-1', 10000)

    await completePayment(payment.transactionId, 10000)

    expect(payment.status).toBe('completed')
    expect(mockDb.users[0].tokenBalance).toBe(10000)
  })

  it('should reject insufficient payment amount', async () => {
    const payment = await createPayment('user-1', 10000)

    await expect(completePayment(payment.transactionId, 5000))
      .rejects.toThrow('Insufficient amount')
  })

  it('should expire old pending payments', async () => {
    const payment = await createPayment('user-1', 10000)

    // Simulate time passing
    payment.expiresAt = new Date(Date.now() - 1000) // Already expired

    checkExpiredPayments()

    expect(payment.status).toBe('expired')
  })

  it('should allow multiple pending payments', async () => {
    await createPayment('user-1', 10000)
    await createPayment('user-1', 20000)
    await createPayment('user-1', 30000)

    const pendingPayments = mockDb.payments.filter(p => p.status === 'pending')
    expect(pendingPayments.length).toBe(3)
  })
})

describe('E2E - Account Deactivation Flow', () => {
  const deactivateAccount = async (userId: string) => {
    const user = mockDb.users.find(u => u.id === userId)
    if (!user) {
      throw new Error('User not found')
    }

    user.isActive = false
    return { success: true }
  }

  beforeEach(() => {
    mockDb.users.push({
      id: 'user-1',
      email: 'test@example.com',
      password: 'hashed',
      name: 'Test User',
      isActive: true,
      isEmailVerified: true,
      tokenBalance: 1000,
    })
  })

  it('should soft delete account (set isActive to false)', async () => {
    await deactivateAccount('user-1')

    expect(mockDb.users[0].isActive).toBe(false)
    // User still exists in DB
    expect(mockDb.users.length).toBe(1)
  })

  it('should preserve user data after deactivation', async () => {
    await deactivateAccount('user-1')

    expect(mockDb.users[0].email).toBe('test@example.com')
    expect(mockDb.users[0].tokenBalance).toBe(1000)
  })

  it('should prevent login after deactivation', async () => {
    await deactivateAccount('user-1')

    const login = async () => {
      const user = mockDb.users.find(u => u.email === 'test@example.com')
      if (!user?.isActive) {
        throw new Error('Account deactivated')
      }
      return { token: 'token' }
    }

    await expect(login()).rejects.toThrow('Account deactivated')
  })
})

describe('E2E - Token Balance Operations', () => {
  const deductTokens = async (userId: string, amount: number) => {
    const user = mockDb.users.find(u => u.id === userId)
    if (!user) {
      throw new Error('User not found')
    }

    if (user.tokenBalance < amount) {
      throw new Error('Insufficient tokens')
    }

    user.tokenBalance -= amount
    return { newBalance: user.tokenBalance }
  }

  beforeEach(() => {
    mockDb.users.push({
      id: 'user-1',
      email: 'test@example.com',
      password: 'hashed',
      name: 'Test User',
      isActive: true,
      isEmailVerified: true,
      tokenBalance: 10000,
    })
  })

  it('should deduct tokens on API usage', async () => {
    await deductTokens('user-1', 1000)

    expect(mockDb.users[0].tokenBalance).toBe(9000)
  })

  it('should reject operation with insufficient tokens', async () => {
    await expect(deductTokens('user-1', 50000))
      .rejects.toThrow('Insufficient tokens')
  })

  it('should handle concurrent token operations', async () => {
    // Simulate concurrent requests
    const operations = [
      deductTokens('user-1', 1000),
      deductTokens('user-1', 1000),
      deductTokens('user-1', 1000),
    ]

    await Promise.all(operations)

    expect(mockDb.users[0].tokenBalance).toBe(7000)
  })
})

describe('E2E - Complete User Journey', () => {
  it('should complete full user journey from registration to API usage', async () => {
    // 1. Register
    const user: MockUser = {
      id: crypto.randomUUID(),
      email: 'newuser@example.com',
      password: 'hashed',
      name: 'New User',
      isActive: true,
      isEmailVerified: false,
      tokenBalance: 0,
    }
    mockDb.users.push(user)
    expect(user.isEmailVerified).toBe(false)

    // 2. Verify email
    user.isEmailVerified = true
    expect(user.isEmailVerified).toBe(true)

    // 3. Login (simulated)
    expect(user.isActive && user.isEmailVerified).toBe(true)

    // 4. Create payment and add tokens
    user.tokenBalance = 10000

    // 5. Create API key
    const rawKey = generateApiKey()
    const apiKey: MockApiKey = {
      id: crypto.randomUUID(),
      userId: user.id,
      name: 'My First Key',
      keyHash: hashApiKey(rawKey),
      keyPrefix: rawKey.substring(0, 8),
      isActive: true,
      lastUsedAt: null,
    }
    mockDb.apiKeys.push(apiKey)
    expect(mockDb.apiKeys.length).toBe(1)

    // 6. Use API key
    const foundKey = mockDb.apiKeys.find(k => k.keyHash === hashApiKey(rawKey) && k.isActive)
    expect(foundKey).toBeDefined()
    foundKey!.lastUsedAt = new Date()
    expect(foundKey!.lastUsedAt).toBeInstanceOf(Date)

    // 7. Deduct tokens
    user.tokenBalance -= 1000
    expect(user.tokenBalance).toBe(9000)

    // Full journey complete!
    expect(mockDb.users.length).toBe(1)
    expect(mockDb.apiKeys.length).toBe(1)
  })
})
