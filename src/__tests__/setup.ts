// Jest setup file
// Set test environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing'
process.env.JWT_EXPIRES_IN = '1h'
process.env.LOG_LEVEL = 'error' // Suppress logs during tests
process.env.KIE_API_KEY = 'test-api-key'

// Mock console to reduce noise
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterAll(() => {
  jest.restoreAllMocks()
})
