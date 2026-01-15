import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

/**
 * Security middleware - adds security headers and protections
 */

// Suspicious patterns that may indicate attacks
const ATTACK_PATTERNS = [
  /(\.\.\/)/, // Path traversal
  /<script/i, // XSS
  /javascript:/i, // XSS
  /on\w+\s*=/i, // Event handlers
  /(union\s+select)/i, // SQL injection
  /(drop\s+table)/i, // SQL injection
  /(\bexec\s*\()/i, // Command injection
  /(\$\{|\$\()/i, // Template injection
  /({{.*}})/i, // Template injection
]

// Track suspicious IPs (in-memory, use Redis for production)
const suspiciousIPs = new Map<string, { count: number; lastSeen: Date }>()
const SUSPICIOUS_THRESHOLD = 10 // Block after 10 suspicious requests
const SUSPICIOUS_WINDOW = 60 * 60 * 1000 // 1 hour window

/**
 * Security headers middleware
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY')

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff')

  // XSS Protection (for older browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block')

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self';"
  )

  // Permissions Policy
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  )

  // Strict Transport Security (HSTS)
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  )

  next()
}

/**
 * Check for attack patterns in request
 */
function containsAttackPattern(value: unknown): boolean {
  if (typeof value === 'string') {
    return ATTACK_PATTERNS.some(pattern => pattern.test(value))
  }
  if (typeof value === 'object' && value !== null) {
    return Object.values(value).some(v => containsAttackPattern(v))
  }
  return false
}

/**
 * Input sanitization middleware
 * Checks request body, query, and params for malicious patterns
 */
export function inputSanitization(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'

  // Check if IP is blocked
  const ipRecord = suspiciousIPs.get(ip)
  if (ipRecord && ipRecord.count >= SUSPICIOUS_THRESHOLD) {
    const timeSinceLastSeen = Date.now() - ipRecord.lastSeen.getTime()
    if (timeSinceLastSeen < SUSPICIOUS_WINDOW) {
      logger.warn('Blocked suspicious IP', { ip, count: ipRecord.count })
      return res.status(403).json({ success: false, error: 'Access denied' })
    } else {
      // Reset after window expires
      suspiciousIPs.delete(ip)
    }
  }

  // Check for attack patterns
  const hasAttack =
    containsAttackPattern(req.body) ||
    containsAttackPattern(req.query) ||
    containsAttackPattern(req.params)

  if (hasAttack) {
    // Track suspicious IP
    const current = suspiciousIPs.get(ip) || { count: 0, lastSeen: new Date() }
    current.count++
    current.lastSeen = new Date()
    suspiciousIPs.set(ip, current)

    logger.warn('Potential attack detected', {
      ip,
      path: req.path,
      method: req.method,
      suspiciousCount: current.count,
    })

    return res.status(400).json({ success: false, error: 'Invalid input detected' })
  }

  next()
}

/**
 * Request size limiter for specific routes
 */
export function maxBodySize(maxBytes: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10)
    if (contentLength > maxBytes) {
      logger.warn('Request too large', {
        ip: req.ip,
        path: req.path,
        size: contentLength,
        max: maxBytes,
      })
      return res.status(413).json({ success: false, error: 'Request too large' })
    }
    next()
  }
}

/**
 * Validate Content-Type header
 */
export function validateContentType(allowedTypes: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.headers['content-type']?.split(';')[0]
      if (!contentType || !allowedTypes.includes(contentType)) {
        return res.status(415).json({
          success: false,
          error: 'Unsupported content type',
        })
      }
    }
    next()
  }
}

/**
 * Honeypot field detection
 * Add a hidden field to forms - if filled, it's a bot
 */
export function honeypotCheck(fieldName: string = '_hp') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.body && req.body[fieldName]) {
      logger.warn('Honeypot triggered', { ip: req.ip, path: req.path })
      // Return success to not alert the bot, but don't process
      return res.json({ success: true })
    }
    next()
  }
}

/**
 * Clean up old suspicious IP entries periodically
 */
setInterval(() => {
  const now = Date.now()
  for (const [ip, record] of suspiciousIPs.entries()) {
    if (now - record.lastSeen.getTime() > SUSPICIOUS_WINDOW) {
      suspiciousIPs.delete(ip)
    }
  }
}, 5 * 60 * 1000) // Clean up every 5 minutes

export default {
  securityHeaders,
  inputSanitization,
  maxBodySize,
  validateContentType,
  honeypotCheck,
}
