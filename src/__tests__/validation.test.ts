import { validate } from '../utils/validation'

describe('Validation Utilities', () => {
  describe('isEmpty', () => {
    it('should return true for null', () => {
      expect(validate.isEmpty(null)).toBe(true)
    })

    it('should return true for undefined', () => {
      expect(validate.isEmpty(undefined)).toBe(true)
    })

    it('should return true for empty string', () => {
      expect(validate.isEmpty('')).toBe(true)
    })

    it('should return true for whitespace string', () => {
      expect(validate.isEmpty('   ')).toBe(true)
    })

    it('should return true for empty array', () => {
      expect(validate.isEmpty([])).toBe(true)
    })

    it('should return false for non-empty string', () => {
      expect(validate.isEmpty('hello')).toBe(false)
    })

    it('should return false for non-empty array', () => {
      expect(validate.isEmpty([1, 2, 3])).toBe(false)
    })

    it('should return false for number 0', () => {
      expect(validate.isEmpty(0)).toBe(false)
    })

    it('should return false for boolean false', () => {
      expect(validate.isEmpty(false)).toBe(false)
    })
  })

  describe('isEmail', () => {
    it('should return true for valid email', () => {
      expect(validate.isEmail('test@example.com')).toBe(true)
    })

    it('should return true for email with subdomain', () => {
      expect(validate.isEmail('user@mail.example.com')).toBe(true)
    })

    it('should return true for email with plus sign', () => {
      expect(validate.isEmail('user+tag@example.com')).toBe(true)
    })

    it('should return false for email without @', () => {
      expect(validate.isEmail('testexample.com')).toBe(false)
    })

    it('should return false for email without domain', () => {
      expect(validate.isEmail('test@')).toBe(false)
    })

    it('should return false for email without local part', () => {
      expect(validate.isEmail('@example.com')).toBe(false)
    })

    it('should return false for email with spaces', () => {
      expect(validate.isEmail('test @example.com')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(validate.isEmail('')).toBe(false)
    })
  })

  describe('isValidPassword', () => {
    it('should return true for password with 6+ characters', () => {
      expect(validate.isValidPassword('123456')).toBe(true)
    })

    it('should return true for long password', () => {
      expect(validate.isValidPassword('verysecurepassword123!')).toBe(true)
    })

    it('should return false for password with less than 6 characters', () => {
      expect(validate.isValidPassword('12345')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(validate.isValidPassword('')).toBe(false)
    })

    it('should return false for non-string input', () => {
      expect(validate.isValidPassword(123456 as any)).toBe(false)
    })
  })

  describe('isUUID', () => {
    it('should return true for valid UUID v4', () => {
      expect(validate.isUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    })

    it('should return true for valid UUID v1', () => {
      expect(validate.isUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true)
    })

    it('should return false for invalid UUID', () => {
      expect(validate.isUUID('not-a-valid-uuid')).toBe(false)
    })

    it('should return false for UUID without hyphens', () => {
      expect(validate.isUUID('550e8400e29b41d4a716446655440000')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(validate.isUUID('')).toBe(false)
    })
  })

  describe('isURL', () => {
    it('should return true for valid HTTP URL', () => {
      expect(validate.isURL('http://example.com')).toBe(true)
    })

    it('should return true for valid HTTPS URL', () => {
      expect(validate.isURL('https://example.com')).toBe(true)
    })

    it('should return true for URL with path', () => {
      expect(validate.isURL('https://example.com/path/to/resource')).toBe(true)
    })

    it('should return true for URL with query params', () => {
      expect(validate.isURL('https://example.com?foo=bar&baz=qux')).toBe(true)
    })

    it('should return false for invalid URL', () => {
      expect(validate.isURL('not-a-url')).toBe(false)
    })

    it('should return false for URL without protocol', () => {
      expect(validate.isURL('example.com')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(validate.isURL('')).toBe(false)
    })
  })

  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      expect(validate.sanitizeString('  hello  ')).toBe('hello')
    })

    it('should limit string length to default 1000', () => {
      const longString = 'a'.repeat(1500)
      expect(validate.sanitizeString(longString).length).toBe(1000)
    })

    it('should limit string length to custom max', () => {
      const longString = 'a'.repeat(100)
      expect(validate.sanitizeString(longString, 50).length).toBe(50)
    })

    it('should return empty string for non-string input', () => {
      expect(validate.sanitizeString(123 as any)).toBe('')
    })

    it('should handle empty string', () => {
      expect(validate.sanitizeString('')).toBe('')
    })
  })

  describe('isValidAspectRatio', () => {
    it('should return true for valid 1:1 ratio', () => {
      expect(validate.isValidAspectRatio('1:1')).toBe(true)
    })

    it('should return true for valid 16:9 ratio', () => {
      expect(validate.isValidAspectRatio('16:9')).toBe(true)
    })

    it('should return true for valid 9:16 ratio', () => {
      expect(validate.isValidAspectRatio('9:16')).toBe(true)
    })

    it('should return true for auto ratio', () => {
      expect(validate.isValidAspectRatio('auto')).toBe(true)
    })

    it('should return false for invalid ratio', () => {
      expect(validate.isValidAspectRatio('10:10')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(validate.isValidAspectRatio('')).toBe(false)
    })
  })

  describe('isValidResolution', () => {
    it('should return true for 1K', () => {
      expect(validate.isValidResolution('1K')).toBe(true)
    })

    it('should return true for 2K', () => {
      expect(validate.isValidResolution('2K')).toBe(true)
    })

    it('should return true for 4K', () => {
      expect(validate.isValidResolution('4K')).toBe(true)
    })

    it('should return false for invalid resolution', () => {
      expect(validate.isValidResolution('8K')).toBe(false)
    })

    it('should return false for lowercase', () => {
      expect(validate.isValidResolution('1k')).toBe(false)
    })
  })

  describe('isValidOutputFormat', () => {
    it('should return true for png', () => {
      expect(validate.isValidOutputFormat('png')).toBe(true)
    })

    it('should return true for jpg', () => {
      expect(validate.isValidOutputFormat('jpg')).toBe(true)
    })

    it('should return false for jpeg', () => {
      expect(validate.isValidOutputFormat('jpeg')).toBe(false)
    })

    it('should return false for gif', () => {
      expect(validate.isValidOutputFormat('gif')).toBe(false)
    })

    it('should return false for uppercase', () => {
      expect(validate.isValidOutputFormat('PNG')).toBe(false)
    })
  })
})
