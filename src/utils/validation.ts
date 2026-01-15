/**
 * Validation and sanitization utilities
 * Protects against XSS, SQL Injection, and other attacks
 */

// Dangerous HTML/JS patterns for XSS prevention
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<link/gi,
  /<meta/gi,
  /data:/gi,
  /vbscript:/gi,
]

// SQL injection patterns
const SQL_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|UNION|GRANT|REVOKE)\b)/gi,
  /(--)|(\/\*)|(\*\/)/g,
  /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/gi,
  /(\'|\"|;|`)/g,
]

export const validate = {
  /**
   * Check if value is empty (null, undefined, empty string)
   */
  isEmpty(value: unknown): boolean {
    if (value === null || value === undefined) return true
    if (typeof value === 'string' && value.trim() === '') return true
    if (Array.isArray(value) && value.length === 0) return true
    return false
  },

  /**
   * Validate email format
   */
  isEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  /**
   * Validate password strength (min 6 chars)
   */
  isValidPassword(password: string): boolean {
    return typeof password === 'string' && password.length >= 6
  },

  /**
   * Validate UUID format
   */
  isUUID(value: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(value)
  },

  /**
   * Validate URL format
   */
  isURL(value: string): boolean {
    try {
      new URL(value)
      return true
    } catch {
      return false
    }
  },

  /**
   * Sanitize string input (trim and limit length)
   */
  sanitizeString(value: string, maxLength = 1000): string {
    if (typeof value !== 'string') return ''
    return value.trim().slice(0, maxLength)
  },

  /**
   * Escape HTML entities to prevent XSS
   */
  escapeHtml(value: string): string {
    if (typeof value !== 'string') return ''
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
  },

  /**
   * Check if string contains XSS patterns
   */
  containsXSS(value: string): boolean {
    if (typeof value !== 'string') return false
    // Reset lastIndex for each pattern (regex with 'g' flag keeps state)
    return XSS_PATTERNS.some(pattern => {
      pattern.lastIndex = 0
      return pattern.test(value)
    })
  },

  /**
   * Check if string contains SQL injection patterns
   */
  containsSQLInjection(value: string): boolean {
    if (typeof value !== 'string') return false
    // Reset lastIndex for each pattern (regex with 'g' flag keeps state)
    return SQL_PATTERNS.some(pattern => {
      pattern.lastIndex = 0
      return pattern.test(value)
    })
  },

  /**
   * Sanitize input to prevent XSS - removes dangerous patterns
   */
  sanitizeXSS(value: string): string {
    if (typeof value !== 'string') return ''
    let sanitized = value
    XSS_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '')
    })
    return sanitized.trim()
  },

  /**
   * Safe sanitize for database input - escapes special chars
   */
  sanitizeForDB(value: string): string {
    if (typeof value !== 'string') return ''
    // Escape single quotes by doubling them (SQL standard)
    return value.replace(/'/g, "''").trim()
  },

  /**
   * Full sanitization: trim, limit length, escape XSS, validate
   * Returns null if input contains malicious patterns
   */
  sanitizeSafe(value: string, maxLength = 1000): string | null {
    if (typeof value !== 'string') return null

    const trimmed = value.trim().slice(0, maxLength)

    // Check for malicious patterns
    if (this.containsXSS(trimmed) || this.containsSQLInjection(trimmed)) {
      return null
    }

    return this.escapeHtml(trimmed)
  },

  /**
   * Validate and sanitize user input - strict mode
   * Use for user-provided content like names, prompts, etc.
   */
  sanitizeUserInput(value: string, maxLength = 500): string {
    if (typeof value !== 'string') return ''

    let sanitized = value.trim().slice(0, maxLength)

    // Remove potential XSS
    sanitized = this.sanitizeXSS(sanitized)

    // Escape HTML entities
    sanitized = this.escapeHtml(sanitized)

    return sanitized
  },

  /**
   * Validate aspect ratio format
   */
  isValidAspectRatio(ratio: string): boolean {
    const validRatios = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9', 'auto']
    return validRatios.includes(ratio)
  },

  /**
   * Validate resolution format
   */
  isValidResolution(resolution: string): boolean {
    const validResolutions = ['1K', '2K', '4K']
    return validResolutions.includes(resolution)
  },

  /**
   * Validate output format
   */
  isValidOutputFormat(format: string): boolean {
    const validFormats = ['png', 'jpg']
    return validFormats.includes(format)
  },
}

export default validate
