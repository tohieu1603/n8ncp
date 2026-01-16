import { validate } from '../../utils/validation'

export interface RegisterDto {
  email: string
  password: string
  name?: string
}

export interface RegisterValidationResult {
  isValid: boolean
  errors: string[]
  sanitized?: RegisterDto
}

/**
 * Validate and sanitize registration data
 */
export function validateRegisterDto(data: unknown): RegisterValidationResult {
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
  const name = input.name ? validate.sanitizeString(input.name as string, 100).trim() : undefined

  // Email validation
  if (!validate.isEmail(email)) {
    errors.push('Invalid email format')
  }

  // Password validation
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters')
  }
  if (!/[a-zA-Z]/.test(password)) {
    errors.push('Password must contain at least one letter')
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  // Name validation (optional)
  if (name && name.length > 100) {
    errors.push('Name must be less than 100 characters')
  }

  if (errors.length > 0) {
    return { isValid: false, errors }
  }

  return {
    isValid: true,
    errors: [],
    sanitized: { email, password, name }
  }
}
