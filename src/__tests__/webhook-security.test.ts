/**
 * Webhook Security Tests
 * Tests for webhook signature verification and IP whitelist
 */

import crypto from 'crypto'

describe('Webhook Security - Signature Verification', () => {
  const WEBHOOK_SECRET = 'test-webhook-secret-key'

  const generateSignature = (body: object, secret: string): string => {
    const payload = JSON.stringify(body)
    return crypto.createHmac('sha256', secret).update(payload).digest('hex')
  }

  const verifySignature = (
    body: object,
    signature: string | undefined,
    secret: string | undefined
  ): { valid: boolean; error?: string } => {
    if (!secret) {
      return { valid: false, error: 'Webhook secret not configured' }
    }

    if (!signature) {
      return { valid: false, error: 'No signature provided' }
    }

    const expectedSignature = generateSignature(body, secret)

    // Timing-safe comparison
    if (signature.length !== expectedSignature.length) {
      return { valid: false, error: 'Invalid signature' }
    }

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )

    return isValid
      ? { valid: true }
      : { valid: false, error: 'Invalid signature' }
  }

  describe('Signature Generation', () => {
    it('should generate consistent signature for same payload', () => {
      const body = { event: 'payment.completed', amount: 10000 }
      const sig1 = generateSignature(body, WEBHOOK_SECRET)
      const sig2 = generateSignature(body, WEBHOOK_SECRET)

      expect(sig1).toBe(sig2)
    })

    it('should generate different signature for different payload', () => {
      const body1 = { event: 'payment.completed', amount: 10000 }
      const body2 = { event: 'payment.completed', amount: 20000 }

      const sig1 = generateSignature(body1, WEBHOOK_SECRET)
      const sig2 = generateSignature(body2, WEBHOOK_SECRET)

      expect(sig1).not.toBe(sig2)
    })

    it('should generate different signature with different secret', () => {
      const body = { event: 'payment.completed' }
      const sig1 = generateSignature(body, 'secret1')
      const sig2 = generateSignature(body, 'secret2')

      expect(sig1).not.toBe(sig2)
    })
  })

  describe('Signature Verification', () => {
    it('should accept valid signature', () => {
      const body = { event: 'payment.completed', amount: 10000 }
      const signature = generateSignature(body, WEBHOOK_SECRET)

      const result = verifySignature(body, signature, WEBHOOK_SECRET)

      expect(result.valid).toBe(true)
    })

    it('should reject invalid signature', () => {
      const body = { event: 'payment.completed' }
      const result = verifySignature(body, 'invalid-signature', WEBHOOK_SECRET)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid signature')
    })

    it('should reject missing signature', () => {
      const body = { event: 'payment.completed' }
      const result = verifySignature(body, undefined, WEBHOOK_SECRET)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('No signature provided')
    })

    it('should reject when secret not configured', () => {
      const body = { event: 'payment.completed' }
      const signature = generateSignature(body, WEBHOOK_SECRET)

      const result = verifySignature(body, signature, undefined)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Webhook secret not configured')
    })

    it('should reject tampered payload', () => {
      const originalBody = { event: 'payment.completed', amount: 10000 }
      const signature = generateSignature(originalBody, WEBHOOK_SECRET)

      // Attacker tampers with amount
      const tamperedBody = { event: 'payment.completed', amount: 99999 }

      const result = verifySignature(tamperedBody, signature, WEBHOOK_SECRET)

      expect(result.valid).toBe(false)
    })
  })

  describe('Timing Attack Prevention', () => {
    it('should use constant-time comparison', () => {
      const body = { event: 'test' }
      const validSignature = generateSignature(body, WEBHOOK_SECRET)

      // These should take roughly the same time due to timing-safe compare
      const result1 = verifySignature(body, validSignature, WEBHOOK_SECRET)
      const result2 = verifySignature(body, 'x'.repeat(64), WEBHOOK_SECRET)

      expect(result1.valid).toBe(true)
      expect(result2.valid).toBe(false)
      // Note: Actual timing test would require measuring execution time
    })
  })
})

describe('Webhook Security - IP Whitelist', () => {
  const parseIpList = (ipString: string): string[] => {
    return ipString.split(',').map(ip => ip.trim()).filter(Boolean)
  }

  const isIpInCidr = (ip: string, cidr: string): boolean => {
    if (!cidr.includes('/')) return ip === cidr

    const [network, prefixLength] = cidr.split('/')
    const prefix = parseInt(prefixLength, 10)

    const ipParts = ip.split('.').map(Number)
    const networkParts = network.split('.').map(Number)

    const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3]
    const networkNum = (networkParts[0] << 24) | (networkParts[1] << 16) | (networkParts[2] << 8) | networkParts[3]
    const mask = ~((1 << (32 - prefix)) - 1)

    return (ipNum & mask) === (networkNum & mask)
  }

  const isAllowedIp = (clientIp: string, allowedIps: string[]): boolean => {
    if (allowedIps.length === 0) return true // No whitelist configured

    return allowedIps.some(allowed => isIpInCidr(clientIp, allowed))
  }

  describe('IP Parsing', () => {
    it('should parse comma-separated IPs', () => {
      const ipString = '192.168.1.1, 10.0.0.1, 172.16.0.0/24'
      const result = parseIpList(ipString)

      expect(result).toEqual(['192.168.1.1', '10.0.0.1', '172.16.0.0/24'])
    })

    it('should handle empty string', () => {
      const result = parseIpList('')
      expect(result).toEqual([])
    })

    it('should handle whitespace', () => {
      const result = parseIpList('  192.168.1.1  ,  10.0.0.1  ')
      expect(result).toEqual(['192.168.1.1', '10.0.0.1'])
    })
  })

  describe('Exact IP Matching', () => {
    it('should allow whitelisted IP', () => {
      const allowed = ['192.168.1.1', '10.0.0.1']
      expect(isAllowedIp('192.168.1.1', allowed)).toBe(true)
    })

    it('should reject non-whitelisted IP', () => {
      const allowed = ['192.168.1.1', '10.0.0.1']
      expect(isAllowedIp('192.168.1.2', allowed)).toBe(false)
    })
  })

  describe('CIDR Range Matching', () => {
    it('should allow IP within CIDR range', () => {
      const allowed = ['192.168.1.0/24']

      expect(isAllowedIp('192.168.1.1', allowed)).toBe(true)
      expect(isAllowedIp('192.168.1.254', allowed)).toBe(true)
    })

    it('should reject IP outside CIDR range', () => {
      const allowed = ['192.168.1.0/24']

      expect(isAllowedIp('192.168.2.1', allowed)).toBe(false)
      expect(isAllowedIp('10.0.0.1', allowed)).toBe(false)
    })

    it('should handle /32 (single IP)', () => {
      const allowed = ['192.168.1.1/32']

      expect(isAllowedIp('192.168.1.1', allowed)).toBe(true)
      expect(isAllowedIp('192.168.1.2', allowed)).toBe(false)
    })

    it('should handle /16 (class B)', () => {
      const allowed = ['10.0.0.0/16']

      expect(isAllowedIp('10.0.0.1', allowed)).toBe(true)
      expect(isAllowedIp('10.0.255.255', allowed)).toBe(true)
      expect(isAllowedIp('10.1.0.1', allowed)).toBe(false)
    })
  })

  describe('Empty Whitelist', () => {
    it('should allow all IPs when whitelist is empty', () => {
      const allowed: string[] = []

      expect(isAllowedIp('192.168.1.1', allowed)).toBe(true)
      expect(isAllowedIp('10.0.0.1', allowed)).toBe(true)
    })
  })

  describe('Mixed IP and CIDR', () => {
    it('should support both exact IP and CIDR in same list', () => {
      const allowed = ['192.168.1.100', '10.0.0.0/24', '172.16.0.50']

      expect(isAllowedIp('192.168.1.100', allowed)).toBe(true) // Exact match
      expect(isAllowedIp('10.0.0.50', allowed)).toBe(true)      // CIDR match
      expect(isAllowedIp('172.16.0.50', allowed)).toBe(true)   // Exact match
      expect(isAllowedIp('192.168.1.1', allowed)).toBe(false)  // Not in list
    })
  })
})
