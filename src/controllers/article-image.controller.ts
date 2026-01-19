import { Response } from 'express'
import {
  createArticleImageTask,
  createArticleImageBatch,
  getArticleImageStatus,
  type ArticleImageInput,
} from '../services/article-image.service'
import { logUsage } from '../services/usage.service'
import { response } from '../utils/response'
import { logger } from '../utils/logger'
import { AuthRequest } from '../middlewares/auth.middleware'

const VALID_ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4']
const VALID_QUALITIES = ['basic', 'standard', 'hd']

/**
 * Article Image Controller
 * Handles article illustration generation from chunked prompts
 */
class ArticleImageController {
  /**
   * POST /api/article-images
   * Create single article image from prompt
   */
  async createSingle(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { prompt, aspect_ratio, quality } = req.body

      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        response.badRequest(res, 'Prompt is required')
        return
      }

      if (prompt.length > 4000) {
        response.badRequest(res, 'Prompt too long (max 4000 characters)')
        return
      }

      const validAspectRatio = VALID_ASPECT_RATIOS.includes(aspect_ratio) ? aspect_ratio : '16:9'
      const validQuality = VALID_QUALITIES.includes(quality) ? quality : 'standard'

      logger.info('Creating article image task', {
        userId: req.user!.userId,
        promptLength: prompt.length,
        aspectRatio: validAspectRatio,
        quality: validQuality,
      })

      const result = await createArticleImageTask({
        prompt: prompt.trim(),
        aspect_ratio: validAspectRatio,
      })

      if (result.code !== 200) {
        await logUsage(
          req.user!.userId,
          'generate_image',
          0,
          0,
          false,
          {
            type: 'article_image',
            model: 'seedream/4.5-text-to-image',
            promptLength: prompt.length,
            aspectRatio: validAspectRatio,
            quality: validQuality,
            error: result.msg,
          }
        )

        response.error(res, result.msg || 'Failed to create task')
        return
      }

      logger.info('Article image task created', { taskId: result.data.taskId })

      response.success(res, {
        taskId: result.data.taskId,
        message: 'Task created successfully',
      })
    } catch (error) {
      logger.error('Article image creation error', error as Error)
      response.serverError(res, 'Failed to create article image')
    }
  }

  /**
   * POST /api/article-images/batch
   * Create multiple article images from array of prompts
   * Receives pre-chunked prompts from agent
   */
  async createBatch(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { images } = req.body

      if (!Array.isArray(images) || images.length === 0) {
        response.badRequest(res, 'images array is required')
        return
      }

      if (images.length > 10) {
        response.badRequest(res, 'Maximum 10 images per batch')
        return
      }

      // Validate each input
      const validatedInputs: ArticleImageInput[] = []
      for (let i = 0; i < images.length; i++) {
        const img = images[i]
        if (!img.prompt || typeof img.prompt !== 'string' || img.prompt.trim().length === 0) {
          response.badRequest(res, `Image ${i}: prompt is required`)
          return
        }
        if (img.prompt.length > 4000) {
          response.badRequest(res, `Image ${i}: prompt too long (max 4000 characters)`)
          return
        }

        validatedInputs.push({
          prompt: img.prompt.trim(),
          aspect_ratio: VALID_ASPECT_RATIOS.includes(img.aspect_ratio) ? img.aspect_ratio : '16:9',
        })
      }

      logger.info('Creating batch article images', {
        userId: req.user!.userId,
        count: validatedInputs.length,
      })

      const { taskIds, errors } = await createArticleImageBatch(validatedInputs)

      // Log usage for successful tasks
      if (taskIds.length > 0) {
        await logUsage(
          req.user!.userId,
          'generate_image',
          0,
          0,
          true,
          {
            type: 'article_image_batch',
            model: 'seedream/4.5-text-to-image',
            taskCount: taskIds.length,
            taskIds,
          }
        )
      }

      // Log failures
      if (errors.length > 0) {
        await logUsage(
          req.user!.userId,
          'generate_image',
          0,
          0,
          false,
          {
            type: 'article_image_batch_partial_fail',
            errors,
          }
        )
      }

      logger.info('Batch article images created', {
        taskIds: taskIds.length,
        errors: errors.length,
      })

      response.success(res, {
        taskIds,
        errors,
        message: `Created ${taskIds.length} tasks${errors.length > 0 ? `, ${errors.length} failed` : ''}`,
      })
    } catch (error) {
      logger.error('Batch article image error', error as Error)
      response.serverError(res, 'Failed to create batch images')
    }
  }

  /**
   * GET /api/article-images/status
   * Get status of article image task
   */
  async getStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { taskId } = req.query

      if (!taskId || typeof taskId !== 'string') {
        response.badRequest(res, 'taskId is required')
        return
      }

      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(taskId)) {
        response.badRequest(res, 'Invalid taskId format')
        return
      }

      const result = await getArticleImageStatus(taskId)

      if (result.code !== 200) {
        response.error(res, result.msg || 'Failed to get status')
        return
      }

      const { data } = result
      let status = 'processing'

      if (data.status === 'SUCCESS') {
        status = 'completed'
        logger.info('Article image completed', { taskId })
      } else if (data.status === 'FAILED') {
        status = 'failed'
        logger.warn('Article image failed', { taskId, error: data.error })
      }

      response.success(res, {
        taskId: data.taskId,
        status,
        output: data.output,
        error: data.error,
      })
    } catch (error) {
      logger.error('Article image status error', error as Error)
      response.serverError(res, 'Failed to get status')
    }
  }

  /**
   * POST /api/article-images/status/batch
   * Get status of multiple tasks at once
   */
  async getBatchStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { taskIds } = req.body

      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        response.badRequest(res, 'taskIds array is required')
        return
      }

      if (taskIds.length > 10) {
        response.badRequest(res, 'Maximum 10 taskIds per request')
        return
      }

      const results: {
        taskId: string
        status: string
        output?: { media_url?: string }
        error?: string
      }[] = []

      for (const taskId of taskIds) {
        if (typeof taskId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(taskId)) {
          results.push({ taskId: String(taskId), status: 'invalid', error: 'Invalid taskId' })
          continue
        }

        try {
          const result = await getArticleImageStatus(taskId)
          if (result.code === 200) {
            const { data } = result
            results.push({
              taskId,
              status: data.status === 'SUCCESS' ? 'completed' : data.status === 'FAILED' ? 'failed' : 'processing',
              output: data.output,
              error: data.error,
            })
          } else {
            results.push({ taskId, status: 'error', error: result.msg })
          }
        } catch (err) {
          results.push({ taskId, status: 'error', error: 'Failed to fetch status' })
        }
      }

      response.success(res, { results })
    } catch (error) {
      logger.error('Batch status error', error as Error)
      response.serverError(res, 'Failed to get batch status')
    }
  }
}

export const articleImageController = new ArticleImageController()
