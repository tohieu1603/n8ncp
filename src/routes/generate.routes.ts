import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware'
import { createTask, getTaskStatus } from '../services/kie-api.service'
import { logUsage } from '../services/usage.service'
import { AppDataSource } from '../data-source'
import { UsageLog } from '../entities'
import { response } from '../utils/response'
import { validate } from '../utils/validation'
import { logger } from '../utils/logger'

const router = Router()

/**
 * POST /api/generate
 * Create image generation task
 */
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { prompt, image_input, aspect_ratio, resolution, output_format } = req.body

    // Validation
    if (validate.isEmpty(prompt)) {
      return response.badRequest(res, 'Prompt is required')
    }

    const sanitizedPrompt = validate.sanitizeString(prompt, 2000)
    const validAspectRatio = validate.isValidAspectRatio(aspect_ratio) ? aspect_ratio : '1:1'
    const validResolution = validate.isValidResolution(resolution) ? resolution : '1K'
    const validFormat = validate.isValidOutputFormat(output_format) ? output_format : 'png'

    logger.info('Creating image task', {
      userId: req.user!.userId,
      aspectRatio: validAspectRatio,
      resolution: validResolution,
    })

    const apiResponse = await createTask({
      prompt: sanitizedPrompt,
      image_input: image_input || [],
      aspect_ratio: validAspectRatio,
      resolution: validResolution,
      output_format: validFormat,
    })

    if (apiResponse.code !== 200) {
      // Log failed attempt
      await logUsage({
        userId: req.user!.userId,
        action: 'generate_image',
        success: false,
        metadata: {
          prompt: sanitizedPrompt,
          aspectRatio: validAspectRatio,
          resolution: validResolution,
          error: apiResponse.msg,
          ip: req.ip,
          userAgent: req.get('user-agent'),
        },
      })

      logger.warn('Task creation failed', { error: apiResponse.msg })
      return response.error(res, apiResponse.msg || 'Failed to create task')
    }

    logger.info('Task created', { taskId: apiResponse.data.taskId })

    return response.success(res, {
      taskId: apiResponse.data.taskId,
      message: 'Task created successfully',
    })
  } catch (error) {
    logger.error('Generate error', error as Error)
    return response.serverError(res, 'Failed to generate image')
  }
})

/**
 * GET /api/generate/status
 * Get task status
 */
router.get('/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId, prompt, aspect_ratio, resolution } = req.query

    // Validation
    if (!taskId || typeof taskId !== 'string') {
      return response.badRequest(res, 'taskId is required')
    }

    // Validate taskId format (alphanumeric with dashes/underscores, max 100 chars)
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(taskId)) {
      return response.badRequest(res, 'Invalid taskId format')
    }

    const apiResponse = await getTaskStatus(taskId)

    if (apiResponse.code !== 200) {
      logger.warn('Failed to get task status', { taskId, error: apiResponse.msg })
      return response.error(res, apiResponse.msg || 'Failed to get status')
    }

    const { data } = apiResponse
    let status = 'processing'

    if (data.status === 'SUCCESS' || data.status === 'completed') {
      status = 'completed'

      // Check if already logged for this taskId to avoid double charging
      const existingLogs = await AppDataSource.getRepository(UsageLog)
        .createQueryBuilder('log')
        .where('log.userId = :userId', { userId: req.user!.userId })
        .andWhere('log.action = :action', { action: 'generate_image' })
        .andWhere('log.success = true')
        .andWhere("log.metadata->>'taskId' = :taskId", { taskId })
        .getCount()

      const alreadyLogged = existingLogs > 0

      if (!alreadyLogged) {
        // Log successful generation with credits
        await logUsage({
          userId: req.user!.userId,
          action: 'generate_image',
          success: true,
          metadata: {
            prompt: typeof prompt === 'string' ? prompt : undefined,
            taskId,
            imageUrl: data.output?.media_url,
            aspectRatio: typeof aspect_ratio === 'string' ? aspect_ratio : undefined,
            resolution: typeof resolution === 'string' ? resolution : undefined,
            ip: req.ip,
            userAgent: req.get('user-agent'),
          },
        })

        logger.info('Image generated successfully', { taskId, userId: req.user!.userId })
      }
    } else if (data.status === 'FAILED' || data.status === 'failed') {
      status = 'failed'

      // Log failed generation
      await logUsage({
        userId: req.user!.userId,
        action: 'generate_image',
        success: false,
        metadata: {
          prompt: typeof prompt === 'string' ? prompt : undefined,
          taskId,
          error: data.error,
          ip: req.ip,
          userAgent: req.get('user-agent'),
        },
      })

      logger.warn('Image generation failed', { taskId, error: data.error })
    }

    return response.success(res, {
      taskId: data.taskId,
      status,
      output: data.output,
      error: data.error,
    })
  } catch (error) {
    logger.error('Status error', error as Error)
    return response.serverError(res, 'Failed to get status')
  }
})

export default router
