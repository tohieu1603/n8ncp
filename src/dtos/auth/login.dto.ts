import { validate } from '../../utils/validation'

export interface LoginDto {
  email: string
  password: string
}

export interface LoginValidationResult {
  isValid: boolean
  errors: string[]
  sanitized?: LoginDto
}

/**
 * Validate and sanitize login data
 */
export function validateLoginDto(data: unknown): LoginValidationResult {
  const errors: string[] = []
  const input = data as Record<string, unknown>

  // Required fields
  if (!input.email || typeof input.email !== 'string') {
    errors.push('Email is required')
  }
  if (!input.password || typeof input.password !== 'string') {
    errors.push('Password is required')
  }

  if (errors.length > 0) {
    return { isValid: false, errors }
  }

  const email = validate.sanitizeString(input.email as string, 255).toLowerCase().trim()
  const password = input.password as string

  // Email validation
  if (!validate.isEmail(email)) {
    errors.push('Invalid email format')
  }

  if (errors.length > 0) {
    return { isValid: false, errors }
  }

  return {
    isValid: true,
    errors: [],
    sanitized: { email, password }
  }
}
