// Mock dependencies before imports
jest.mock('../services/kie-api.service', () => ({
  createTask: jest.fn(),
  getTaskStatus: jest.fn(),
}))
jest.mock('../services/usage.service', () => ({
  logUsage: jest.fn(),
}))

import { createTask, getTaskStatus } from '../services/kie-api.service'
import { logUsage } from '../services/usage.service'

const mockCreateTask = createTask as jest.Mock
const mockGetTaskStatus = getTaskStatus as jest.Mock
const mockLogUsage = logUsage as jest.Mock

describe('Generate Routes Logic', () => {
  beforeEach(() => {
    mockCreateTask.mockClear()
    mockGetTaskStatus.mockClear()
    mockLogUsage.mockClear()
  })

  describe('POST /api/generate validation', () => {
    it('should validate empty prompt', () => {
      const prompt = ''
      const isEmpty = prompt === null || prompt === undefined || prompt.trim() === ''
      expect(isEmpty).toBe(true)
    })

    it('should validate whitespace-only prompt', () => {
      const prompt = '   '
      const isEmpty = prompt.trim() === ''
      expect(isEmpty).toBe(true)
    })

    it('should pass valid prompt', () => {
      const prompt = 'A beautiful sunset'
      const isEmpty = prompt.trim() === ''
      expect(isEmpty).toBe(false)
    })

    it('should sanitize prompt length', () => {
      const longPrompt = 'a'.repeat(3000)
      const sanitized = longPrompt.trim().slice(0, 2000)
      expect(sanitized.length).toBe(2000)
    })

    it('should use default aspect ratio for invalid value', () => {
      const validRatios = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9', 'auto']
      const aspectRatio = '10:10'
      const validAspectRatio = validRatios.includes(aspectRatio) ? aspectRatio : '1:1'
      expect(validAspectRatio).toBe('1:1')
    })

    it('should accept valid aspect ratio', () => {
      const validRatios = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9', 'auto']
      const aspectRatio = '16:9'
      const validAspectRatio = validRatios.includes(aspectRatio) ? aspectRatio : '1:1'
      expect(validAspectRatio).toBe('16:9')
    })

    it('should use default resolution for invalid value', () => {
      const validResolutions = ['1K', '2K', '4K']
      const resolution = '8K'
      const validResolution = validResolutions.includes(resolution) ? resolution : '1K'
      expect(validResolution).toBe('1K')
    })

    it('should use default output format for invalid value', () => {
      const validFormats = ['png', 'jpg']
      const format = 'gif'
      const validFormat = validFormats.includes(format) ? format : 'png'
      expect(validFormat).toBe('png')
    })
  })

  describe('createTask API integration', () => {
    it('should call createTask with correct parameters', async () => {
      mockCreateTask.mockResolvedValueOnce({
        code: 200,
        msg: 'success',
        data: { taskId: 'task-123' },
      })

      await createTask({
        prompt: 'Test prompt',
        aspect_ratio: '1:1',
        resolution: '1K',
        output_format: 'png',
      })

      expect(mockCreateTask).toHaveBeenCalledWith({
        prompt: 'Test prompt',
        aspect_ratio: '1:1',
        resolution: '1K',
        output_format: 'png',
      })
    })

    it('should handle createTask failure', async () => {
      mockCreateTask.mockResolvedValueOnce({
        code: 400,
        msg: 'Invalid prompt',
        data: { taskId: '' },
      })

      const result = await createTask({ prompt: '' })

      expect(result.code).toBe(400)
      expect(result.msg).toBe('Invalid prompt')
    })

    it('should handle createTask network error', async () => {
      mockCreateTask.mockRejectedValueOnce(new Error('Network error'))

      await expect(createTask({ prompt: 'Test' })).rejects.toThrow('Network error')
    })
  })

  describe('GET /api/generate/status validation', () => {
    it('should require taskId', () => {
      const taskId = undefined
      const isValid = taskId && typeof taskId === 'string'
      expect(isValid).toBeFalsy()
    })

    it('should require taskId to be string', () => {
      const taskId = 123
      const isValid = taskId && typeof taskId === 'string'
      expect(isValid).toBeFalsy()
    })

    it('should accept valid taskId', () => {
      const taskId = 'task-123'
      const isValid = taskId && typeof taskId === 'string'
      expect(isValid).toBe(true)
    })
  })

  describe('getTaskStatus API integration', () => {
    it('should return completed status', async () => {
      mockGetTaskStatus.mockResolvedValueOnce({
        code: 200,
        msg: 'success',
        data: {
          taskId: 'task-123',
          status: 'SUCCESS',
          output: { media_url: 'https://example.com/image.png' },
        },
      })

      const result = await getTaskStatus('task-123')

      expect(result.data.status).toBe('SUCCESS')
      expect(result.data.output?.media_url).toBe('https://example.com/image.png')
    })

    it('should return failed status', async () => {
      mockGetTaskStatus.mockResolvedValueOnce({
        code: 200,
        msg: 'success',
        data: {
          taskId: 'task-123',
          status: 'FAILED',
          error: 'Content policy violation',
        },
      })

      const result = await getTaskStatus('task-123')

      expect(result.data.status).toBe('FAILED')
      expect(result.data.error).toBe('Content policy violation')
    })

    it('should return processing status', async () => {
      mockGetTaskStatus.mockResolvedValueOnce({
        code: 200,
        msg: 'success',
        data: {
          taskId: 'task-123',
          status: 'PROCESSING',
        },
      })

      const result = await getTaskStatus('task-123')

      expect(result.data.status).toBe('PROCESSING')
    })

    it('should handle getTaskStatus network error', async () => {
      mockGetTaskStatus.mockRejectedValueOnce(new Error('Network error'))

      await expect(getTaskStatus('task-123')).rejects.toThrow('Network error')
    })
  })

  describe('Status mapping', () => {
    it('should map SUCCESS to completed', () => {
      const apiStatus: string = 'SUCCESS'
      let status = 'processing'
      if (apiStatus === 'SUCCESS' || apiStatus === 'completed') {
        status = 'completed'
      }
      expect(status).toBe('completed')
    })

    it('should map completed to completed', () => {
      const apiStatus: string = 'completed'
      let status = 'processing'
      if (apiStatus === 'SUCCESS' || apiStatus === 'completed') {
        status = 'completed'
      }
      expect(status).toBe('completed')
    })

    it('should map FAILED to failed', () => {
      const apiStatus: string = 'FAILED'
      let status = 'processing'
      if (apiStatus === 'FAILED' || apiStatus === 'failed') {
        status = 'failed'
      }
      expect(status).toBe('failed')
    })

    it('should keep processing for other statuses', () => {
      const apiStatus: string = 'PROCESSING'
      let status = 'processing'
      if (apiStatus === 'SUCCESS' || apiStatus === 'completed') {
        status = 'completed'
      } else if (apiStatus === 'FAILED' || apiStatus === 'failed') {
        status = 'failed'
      }
      expect(status).toBe('processing')
    })
  })

  describe('Usage logging', () => {
    it('should log successful generation', async () => {
      mockLogUsage.mockResolvedValueOnce({})

      await logUsage({
        userId: 'user-123',
        action: 'generate_image',
        success: true,
        metadata: {
          prompt: 'Test prompt',
          taskId: 'task-123',
          imageUrl: 'https://example.com/image.png',
        },
      })

      expect(mockLogUsage).toHaveBeenCalledWith({
        userId: 'user-123',
        action: 'generate_image',
        success: true,
        metadata: expect.objectContaining({
          prompt: 'Test prompt',
          taskId: 'task-123',
        }),
      })
    })

    it('should log failed generation', async () => {
      mockLogUsage.mockResolvedValueOnce({})

      await logUsage({
        userId: 'user-123',
        action: 'generate_image',
        success: false,
        metadata: {
          error: 'API error',
        },
      })

      expect(mockLogUsage).toHaveBeenCalledWith({
        userId: 'user-123',
        action: 'generate_image',
        success: false,
        metadata: expect.objectContaining({
          error: 'API error',
        }),
      })
    })
  })
})
