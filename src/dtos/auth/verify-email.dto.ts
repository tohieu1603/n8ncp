import { validate } from '../../utils/validation'

export interface VerifyEmailDto {
  email: string
  code: string
}

export interface VerifyEmailValidationResult {
  isValid: boolean
  errors: string[]
  sanitized?: VerifyEmailDto
}

/**
 * Validate email verification data
 */
export function validateVerifyEmailDto(data: unknown): VerifyEmailValidationResult {
  const errors: string[] = []
  const input = data as Record<string, unknown>

  // Required fields
  if (!input.email || typeof input.email !== 'string') {
    errors.push('Email is required')
  }
  if (!input.code || typeof input.code !== 'string') {
    errors.push('Verification code is required')
  }

  if (errors.length > 0) {
    return { isValid: false, errors }
  }

  const email = validate.sanitizeString(input.email as string, 255).toLowerCase().trim()
  const code = (input.code as string).trim()

  // Email validation
  if (!validate.isEmail(email)) {
    errors.push('Invalid email format')
  }

  // Code validation - 6 digits
  if (!/^\d{6}$/.test(code)) {
    errors.push('Invalid verification code format')
  }

  if (errors.length > 0) {
    return { isValid: false, errors }
  }

  return {
    isValid: true,
    errors: [],
    sanitized: { email, code }
  }
}
