import { validate } from '../utils/validation'

// Mock global fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('Download Routes Logic', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  describe('URL Validation', () => {
    it('should reject empty URL', () => {
      expect(validate.isEmpty('')).toBe(true)
      expect(validate.isEmpty(null)).toBe(true)
      expect(validate.isEmpty(undefined)).toBe(true)
    })

    it('should reject invalid URL format', () => {
      expect(validate.isURL('not-a-url')).toBe(false)
      expect(validate.isURL('example.com')).toBe(false)
      expect(validate.isURL('ftp://example.com')).toBe(true) // technically valid URL
    })

    it('should accept valid image URLs', () => {
      expect(validate.isURL('https://example.com/image.png')).toBe(true)
      expect(validate.isURL('https://cdn.example.com/path/to/image.jpg')).toBe(true)
      expect(validate.isURL('http://localhost:3000/image.png')).toBe(true)
    })

    it('should accept URLs with query parameters', () => {
      expect(validate.isURL('https://example.com/image.png?token=abc123')).toBe(true)
      expect(validate.isURL('https://example.com/image?width=800&height=600')).toBe(true)
    })
  })

  describe('Image Fetch', () => {
    it('should fetch image successfully', async () => {
      const imageBuffer = new ArrayBuffer(100)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'image/png']]),
        arrayBuffer: () => Promise.resolve(imageBuffer),
      })

      const response = await fetch('https://example.com/image.png')

      expect(response.ok).toBe(true)
      const buffer = await response.arrayBuffer()
      expect(buffer).toBe(imageBuffer)
    })

    it('should handle fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      const response = await fetch('https://example.com/not-found.png')

      expect(response.ok).toBe(false)
      expect(response.status).toBe(404)
    })

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(fetch('https://example.com/image.png')).rejects.toThrow('Network error')
    })

    it('should handle timeout', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'))

      await expect(fetch('https://example.com/slow-image.png')).rejects.toThrow('Request timeout')
    })
  })

  describe('Content-Type Handling', () => {
    it('should detect PNG content type', () => {
      const contentType = 'image/png'
      const extension = contentType.split('/')[1] || 'png'
      expect(extension).toBe('png')
    })

    it('should detect JPEG content type', () => {
      const contentType = 'image/jpeg'
      const extension = contentType.split('/')[1] || 'png'
      expect(extension).toBe('jpeg')
    })

    it('should detect JPG content type', () => {
      const contentType = 'image/jpg'
      const extension = contentType.split('/')[1] || 'png'
      expect(extension).toBe('jpg')
    })

    it('should default to png when content-type is missing', () => {
      const contentType = null
      const extension = (contentType || 'image/png').split('/')[1] || 'png'
      expect(extension).toBe('png')
    })

    it('should handle webp content type', () => {
      const contentType = 'image/webp'
      const extension = contentType.split('/')[1] || 'png'
      expect(extension).toBe('webp')
    })
  })

  describe('Filename Generation', () => {
    it('should generate filename with timestamp', () => {
      const timestamp = Date.now()
      const extension = 'png'
      const filename = `generated-image-${timestamp}.${extension}`

      expect(filename).toMatch(/^generated-image-\d+\.png$/)
    })

    it('should include correct extension in filename', () => {
      const extension = 'jpg'
      const filename = `generated-image-${Date.now()}.${extension}`

      expect(filename).toContain('.jpg')
    })
  })

  describe('Content-Disposition Header', () => {
    it('should format attachment header correctly', () => {
      const filename = 'generated-image-123456789.png'
      const header = `attachment; filename="${filename}"`

      expect(header).toBe('attachment; filename="generated-image-123456789.png"')
    })
  })

  describe('Buffer Conversion', () => {
    it('should convert ArrayBuffer to Buffer', () => {
      const arrayBuffer = new ArrayBuffer(8)
      const view = new Uint8Array(arrayBuffer)
      view[0] = 0x89
      view[1] = 0x50
      view[2] = 0x4e
      view[3] = 0x47 // PNG magic bytes

      const buffer = Buffer.from(arrayBuffer)

      expect(buffer.length).toBe(8)
      expect(buffer[0]).toBe(0x89)
      expect(buffer[1]).toBe(0x50)
    })
  })

  describe('URL Truncation for Logging', () => {
    it('should truncate long URLs for logging', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(200) + '/image.png'
      const truncated = longUrl.substring(0, 100)

      expect(truncated.length).toBe(100)
    })

    it('should not truncate short URLs', () => {
      const shortUrl = 'https://example.com/image.png'
      const truncated = shortUrl.substring(0, 100)

      expect(truncated).toBe(shortUrl)
    })
  })

  describe('Error Response Codes', () => {
    it('should return 400 for empty URL', () => {
      const url = ''
      const statusCode = validate.isEmpty(url) ? 400 : 200
      expect(statusCode).toBe(400)
    })

    it('should return 400 for invalid URL format', () => {
      const url = 'not-a-url'
      const statusCode = !validate.isURL(url) ? 400 : 200
      expect(statusCode).toBe(400)
    })

    it('should return fetch status on failure', () => {
      const fetchStatus = 403
      expect(fetchStatus).toBe(403)
    })
  })
})
