import { Response } from 'express'
import { createTask, getTaskStatus } from '../services/kie-api.service'
import { logUsage } from '../services/usage.service'
import { usageLogRepository } from '../repositories/usage-log.repository'
import { response } from '../utils/response'
import { validate } from '../utils/validation'
import { logger } from '../utils/logger'
import { AuthRequest } from '../middlewares/auth.middleware'

/**
 * Generate Controller - handles image generation HTTP layer
 */
export class GenerateController {
  /**
   * POST /api/generate
   */
  async createTask(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { prompt, image_input, aspect_ratio, resolution, output_format } = req.body

      if (validate.isEmpty(prompt)) {
        response.badRequest(res, 'Prompt is required')
        return
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
        response.error(res, apiResponse.msg || 'Failed to create task')
        return
      }

      logger.info('Task created', { taskId: apiResponse.data.taskId })

      response.success(res, {
        taskId: apiResponse.data.taskId,
        message: 'Task created successfully',
      })
    } catch (error) {
      logger.error('Generate error', error as Error)
      response.serverError(res, 'Failed to generate image')
    }
  }

  /**
   * GET /api/generate/status
   */
  async getStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { taskId, prompt, aspect_ratio, resolution } = req.query

      if (!taskId || typeof taskId !== 'string') {
        response.badRequest(res, 'taskId is required')
        return
      }

      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(taskId)) {
        response.badRequest(res, 'Invalid taskId format')
        return
      }

      const apiResponse = await getTaskStatus(taskId)

      if (apiResponse.code !== 200) {
        logger.warn('Failed to get task status', { taskId, error: apiResponse.msg })
        response.error(res, apiResponse.msg || 'Failed to get status')
        return
      }

      const { data } = apiResponse
      let status = 'processing'

      if (data.status === 'SUCCESS' || data.status === 'completed') {
        status = 'completed'

        // Check if already logged to avoid double charging
        const existingLogs = await usageLogRepository.raw
          .createQueryBuilder('log')
          .where('log.userId = :userId', { userId: req.user!.userId })
          .andWhere('log.action = :action', { action: 'generate_image' })
          .andWhere('log.success = true')
          .andWhere("log.metadata->>'taskId' = :taskId", { taskId })
          .getCount()

        if (existingLogs === 0) {
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

      response.success(res, {
        taskId: data.taskId,
        status,
        output: data.output,
        error: data.error,
      })
    } catch (error) {
      logger.error('Status error', error as Error)
      response.serverError(res, 'Failed to get status')
    }
  }
}

// Singleton instance
export const generateController = new GenerateController()
