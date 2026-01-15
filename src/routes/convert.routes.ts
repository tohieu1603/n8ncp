import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware'
import { logUsage } from '../services/usage.service'
import { response } from '../utils/response'
import { logger } from '../utils/logger'

const router = Router()

// CloudConvert or similar API for document conversion
const CLOUDCONVERT_API_KEY = process.env.CLOUDCONVERT_API_KEY || ''
const CLOUDCONVERT_API_URL = 'https://api.cloudconvert.com/v2'

interface ConvertJob {
  id: string
  status: 'waiting' | 'processing' | 'finished' | 'error'
  tasks?: Array<{
    id: string
    name: string
    operation: string
    status: string
    result?: {
      files?: Array<{ url: string; filename: string }>
    }
  }>
}

/**
 * POST /api/convert/word-to-pdf
 * Convert Word document to PDF
 */
router.post('/word-to-pdf', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { fileUrl, fileName } = req.body

    if (!fileUrl) {
      return response.badRequest(res, 'File URL is required')
    }

    logger.info('Starting Word to PDF conversion', {
      userId: req.user!.userId,
      fileName,
    })

    // Create CloudConvert job
    const jobResponse = await fetch(`${CLOUDCONVERT_API_URL}/jobs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDCONVERT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tasks: {
          'import-file': {
            operation: 'import/url',
            url: fileUrl,
            filename: fileName || 'document.docx',
          },
          'convert-to-pdf': {
            operation: 'convert',
            input: ['import-file'],
            output_format: 'pdf',
            engine: 'office',
          },
          'export-result': {
            operation: 'export/url',
            input: ['convert-to-pdf'],
            inline: false,
            archive_multiple_files: false,
          },
        },
        tag: 'word-to-pdf',
      }),
    })

    if (!jobResponse.ok) {
      const errorData = await jobResponse.json().catch(() => ({})) as { message?: string }
      logger.error('CloudConvert job creation failed', { error: errorData })

      await logUsage({
        userId: req.user!.userId,
        action: 'convert_word_to_pdf',
        success: false,
        metadata: {
          fileName,
          error: errorData.message || 'Job creation failed',
          ip: req.ip,
          userAgent: req.get('user-agent'),
        },
      })

      return response.error(res, 'Failed to start conversion')
    }

    const job = await jobResponse.json() as { data: ConvertJob }

    logger.info('Conversion job created', { jobId: job.data.id })

    return response.success(res, {
      jobId: job.data.id,
      status: job.data.status,
      message: 'Conversion started',
    })
  } catch (error) {
    logger.error('Word to PDF conversion error', error as Error)
    return response.serverError(res, 'Failed to convert document')
  }
})

/**
 * POST /api/convert/pdf-to-word
 * Convert PDF to Word document
 */
router.post('/pdf-to-word', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { fileUrl, fileName } = req.body

    if (!fileUrl) {
      return response.badRequest(res, 'File URL is required')
    }

    logger.info('Starting PDF to Word conversion', {
      userId: req.user!.userId,
      fileName,
    })

    // Create CloudConvert job
    const jobResponse = await fetch(`${CLOUDCONVERT_API_URL}/jobs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDCONVERT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tasks: {
          'import-file': {
            operation: 'import/url',
            url: fileUrl,
            filename: fileName || 'document.pdf',
          },
          'convert-to-docx': {
            operation: 'convert',
            input: ['import-file'],
            output_format: 'docx',
            engine: 'office',
          },
          'export-result': {
            operation: 'export/url',
            input: ['convert-to-docx'],
            inline: false,
            archive_multiple_files: false,
          },
        },
        tag: 'pdf-to-word',
      }),
    })

    if (!jobResponse.ok) {
      const errorData = await jobResponse.json().catch(() => ({})) as { message?: string }
      logger.error('CloudConvert job creation failed', { error: errorData })

      await logUsage({
        userId: req.user!.userId,
        action: 'convert_pdf_to_word',
        success: false,
        metadata: {
          fileName,
          error: errorData.message || 'Job creation failed',
          ip: req.ip,
          userAgent: req.get('user-agent'),
        },
      })

      return response.error(res, 'Failed to start conversion')
    }

    const job = await jobResponse.json() as { data: ConvertJob }

    logger.info('Conversion job created', { jobId: job.data.id })

    return response.success(res, {
      jobId: job.data.id,
      status: job.data.status,
      message: 'Conversion started',
    })
  } catch (error) {
    logger.error('PDF to Word conversion error', error as Error)
    return response.serverError(res, 'Failed to convert document')
  }
})

/**
 * GET /api/convert/status
 * Get conversion job status
 */
router.get('/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { jobId } = req.query

    if (!jobId || typeof jobId !== 'string') {
      return response.badRequest(res, 'Job ID is required')
    }

    const jobResponse = await fetch(`${CLOUDCONVERT_API_URL}/jobs/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${CLOUDCONVERT_API_KEY}`,
      },
    })

    if (!jobResponse.ok) {
      logger.warn('Failed to get job status', { jobId })
      return response.error(res, 'Failed to get conversion status')
    }

    const job = await jobResponse.json() as { data: ConvertJob }
    const { data } = job

    let status: 'processing' | 'completed' | 'failed' = 'processing'
    let downloadUrl: string | undefined

    if (data.status === 'finished') {
      status = 'completed'

      // Find export task result
      const exportTask = data.tasks?.find(t => t.operation === 'export/url')
      if (exportTask?.result?.files?.[0]?.url) {
        downloadUrl = exportTask.result.files[0].url
      }

      // Log successful conversion
      await logUsage({
        userId: req.user!.userId,
        action: 'document_conversion',
        success: true,
        metadata: {
          jobId,
          downloadUrl,
          ip: req.ip,
          userAgent: req.get('user-agent'),
        },
      })

      logger.info('Conversion completed', { jobId, userId: req.user!.userId })
    } else if (data.status === 'error') {
      status = 'failed'

      await logUsage({
        userId: req.user!.userId,
        action: 'document_conversion',
        success: false,
        metadata: {
          jobId,
          error: 'Conversion failed',
          ip: req.ip,
          userAgent: req.get('user-agent'),
        },
      })

      logger.warn('Conversion failed', { jobId })
    }

    return response.success(res, {
      jobId,
      status,
      downloadUrl,
    })
  } catch (error) {
    logger.error('Status check error', error as Error)
    return response.serverError(res, 'Failed to check status')
  }
})

/**
 * POST /api/convert/upload
 * Upload file and get URL for conversion
 */
router.post('/upload', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { fileData, fileName, mimeType } = req.body

    if (!fileData || !fileName) {
      return response.badRequest(res, 'File data and name are required')
    }

    // Create import/upload task
    const uploadResponse = await fetch(`${CLOUDCONVERT_API_URL}/import/base64`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDCONVERT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: fileData,
        filename: fileName,
      }),
    })

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json().catch(() => ({}))
      logger.error('File upload failed', { error })
      return response.error(res, 'Failed to upload file')
    }

    const uploadResult = await uploadResponse.json() as { data: { id: string; url?: string } }

    logger.info('File uploaded', { taskId: uploadResult.data.id })

    return response.success(res, {
      taskId: uploadResult.data.id,
      message: 'File uploaded successfully',
    })
  } catch (error) {
    logger.error('Upload error', error as Error)
    return response.serverError(res, 'Failed to upload file')
  }
})

export default router
