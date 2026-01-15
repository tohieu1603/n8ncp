import { Router, Request, Response } from 'express'
import { response } from '../utils/response'
import { validate } from '../utils/validation'
import { logger } from '../utils/logger'

const router = Router()

// Whitelist of allowed domains for image download (SSRF protection)
const ALLOWED_DOMAINS = [
  // KIE AI
  'api.kie.ai',
  'cdn.kie.ai',
  'kie.ai',
  'tempfile.aiquickdraw.com',
  'aiquickdraw.com',
  // Cloud Storage
  'storage.googleapis.com',
  'firebasestorage.googleapis.com',
  's3.amazonaws.com',
  's3.us-west-2.amazonaws.com',
  's3.us-east-1.amazonaws.com',
  // CDNs
  'res.cloudinary.com',
  'imagedelivery.net', // Cloudflare Images
  'r2.cloudflarestorage.com',
  // AI Image Services
  'oaidalleapiprodscus.blob.core.windows.net', // OpenAI DALL-E
  'replicate.delivery',
  'pbxt.replicate.delivery',
  'fal.media',
  'v3.fal.media',
  // Azure Blob (common for AI services)
  'blob.core.windows.net',
]

// Blocked IP ranges (internal networks, cloud metadata)
const BLOCKED_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./, // AWS metadata
  /^0\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
]

/**
 * Validate URL is safe (not internal network, not cloud metadata)
 */
function isAllowedUrl(url: string): { allowed: boolean; reason?: string } {
  try {
    const parsedUrl = new URL(url)

    // Only allow HTTPS
    if (parsedUrl.protocol !== 'https:') {
      return { allowed: false, reason: 'Only HTTPS URLs are allowed' }
    }

    // Check against blocked patterns (internal IPs)
    const hostname = parsedUrl.hostname
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(hostname)) {
        return { allowed: false, reason: 'Internal addresses are not allowed' }
      }
    }

    // Check against whitelist
    const isWhitelisted = ALLOWED_DOMAINS.some(domain =>
      hostname === domain || hostname.endsWith('.' + domain)
    )

    if (!isWhitelisted) {
      return { allowed: false, reason: 'Domain not in whitelist' }
    }

    return { allowed: true }
  } catch {
    return { allowed: false, reason: 'Invalid URL' }
  }
}

/**
 * GET /api/download
 * Proxy download to bypass CORS - with SSRF protection
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const url = req.query.url as string

    // Validation
    if (validate.isEmpty(url)) {
      return response.badRequest(res, 'URL is required')
    }

    if (!validate.isURL(url)) {
      return response.badRequest(res, 'Invalid URL format')
    }

    // SSRF Protection: Check if URL is allowed
    const urlCheck = isAllowedUrl(url)
    if (!urlCheck.allowed) {
      // Log the domain for debugging
      try {
        const parsedUrl = new URL(url)
        logger.warn('SSRF blocked', {
          domain: parsedUrl.hostname,
          reason: urlCheck.reason,
          url: url.substring(0, 200)
        })
      } catch {
        logger.warn('SSRF blocked', { url: url.substring(0, 100), reason: urlCheck.reason })
      }
      return response.badRequest(res, 'URL not allowed')
    }

    logger.debug('Downloading image', { url: url.substring(0, 100) })

    // Set timeout for fetch
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000) // 30s timeout

    try {
      const fetchResponse = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'ImageGen-Proxy/1.0',
        },
      })

      clearTimeout(timeout)

      if (!fetchResponse.ok) {
        logger.warn('Image fetch failed', { status: fetchResponse.status })
        return response.error(res, 'Failed to fetch image', fetchResponse.status)
      }

      // Validate content type is image
      const contentType = fetchResponse.headers.get('content-type') || ''
      if (!contentType.startsWith('image/')) {
        logger.warn('Invalid content type', { contentType })
        return response.badRequest(res, 'URL does not point to an image')
      }

      // Limit file size (max 50MB)
      const contentLength = fetchResponse.headers.get('content-length')
      if (contentLength && parseInt(contentLength) > 50 * 1024 * 1024) {
        return response.badRequest(res, 'File too large')
      }

      const buffer = await fetchResponse.arrayBuffer()
      const extension = contentType.split('/')[1]?.split(';')[0] || 'png'

      res.setHeader('Content-Type', contentType)
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="generated-image-${Date.now()}.${extension}"`
      )
      res.send(Buffer.from(buffer))
    } catch (fetchError) {
      clearTimeout(timeout)
      if ((fetchError as Error).name === 'AbortError') {
        return response.error(res, 'Request timeout', 504)
      }
      throw fetchError
    }
  } catch (error) {
    logger.error('Download proxy error', error as Error)
    return response.serverError(res, 'Failed to download image')
  }
})

export default router
