import { createTask, getTaskStatus, CreateTaskInput } from '../services/kie-api.service'

// Mock global fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('KIE API Service', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  describe('createTask', () => {
    const validInput: CreateTaskInput = {
      prompt: 'A beautiful sunset',
      aspect_ratio: '16:9',
      resolution: '2K',
      output_format: 'png',
    }

    it('should create task successfully', async () => {
      const mockResponse = {
        code: 200,
        msg: 'success',
        data: { taskId: 'task-123' },
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await createTask(validInput)

      expect(result.code).toBe(200)
      expect(result.data.taskId).toBe('task-123')
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should send correct request body with prompt', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ code: 200, data: { taskId: 'task-123' } }),
      })

      await createTask(validInput)

      const [url, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)

      expect(url).toContain('/createTask')
      expect(body.model).toBe('nano-banana-pro')
      expect(body.input.prompt).toContain('A beautiful sunset')
      expect(body.input.prompt).toContain('English only') // TEXT_INSTRUCTION
      expect(body.input.aspect_ratio).toBe('16:9')
      expect(body.input.resolution).toBe('2K')
      expect(body.input.output_format).toBe('png')
    })

    it('should use default values when optional params not provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ code: 200, data: { taskId: 'task-123' } }),
      })

      await createTask({ prompt: 'Test prompt' })

      const [, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)

      expect(body.input.aspect_ratio).toBe('1:1')
      expect(body.input.resolution).toBe('1K')
      expect(body.input.output_format).toBe('png')
      expect(body.input.image_input).toEqual([])
    })

    it('should include Authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ code: 200, data: { taskId: 'task-123' } }),
      })

      await createTask(validInput)

      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers['Authorization']).toContain('Bearer')
      expect(options.headers['Content-Type']).toBe('application/json')
    })

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ msg: 'Server error' }),
      })

      await expect(createTask(validInput)).rejects.toThrow('Server error')
    })

    it('should throw error with status on API failure without message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: () => Promise.reject(new Error('Parse error')),
      })

      await expect(createTask(validInput)).rejects.toThrow('API request failed: 503')
    })

    it('should handle image_input array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ code: 200, data: { taskId: 'task-123' } }),
      })

      await createTask({
        prompt: 'Edit this image',
        image_input: ['https://example.com/image1.png', 'https://example.com/image2.png'],
      })

      const [, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)

      expect(body.input.image_input).toEqual([
        'https://example.com/image1.png',
        'https://example.com/image2.png',
      ])
    })

    it('should trim prompt whitespace', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ code: 200, data: { taskId: 'task-123' } }),
      })

      await createTask({ prompt: '  A test prompt  ' })

      const [, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)

      expect(body.input.prompt).toContain('A test prompt.')
    })
  })

  describe('getTaskStatus', () => {
    it('should get task status successfully', async () => {
      // Mock API returns 'state' field - service normalizes to 'status'
      const mockResponse = {
        code: 200,
        msg: 'success',
        data: {
          taskId: 'task-123',
          state: 'success', // API uses 'state', not 'status'
          resultJson: JSON.stringify({ resultUrls: ['https://example.com/image.png'] }),
        },
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await getTaskStatus('task-123')

      expect(result.code).toBe(200)
      expect(result.data.status).toBe('SUCCESS') // Service normalizes state->status
      expect(result.data.output?.media_url).toBe('https://example.com/image.png')
    })

    it('should send correct request URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ code: 200, data: { taskId: 'task-123', status: 'processing' } }),
      })

      await getTaskStatus('task-123')

      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toContain('/recordInfo')
      expect(url).toContain('taskId=task-123')
      expect(options.method).toBe('GET')
    })

    it('should encode taskId in URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ code: 200, data: { taskId: 'task-123', status: 'processing' } }),
      })

      await getTaskStatus('task with spaces')

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('taskId=task%20with%20spaces')
    })

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      await expect(getTaskStatus('invalid-task')).rejects.toThrow('API request failed: 404')
    })

    it('should handle failed task status', async () => {
      // Mock API returns 'state' and 'failMsg' - service normalizes them
      const mockResponse = {
        code: 200,
        msg: 'success',
        data: {
          taskId: 'task-123',
          state: 'failed', // API uses 'state', not 'status'
          failMsg: 'Generation failed: invalid prompt',
        },
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await getTaskStatus('task-123')

      expect(result.data.status).toBe('FAILED') // Service normalizes state->status
      expect(result.data.error).toBe('Generation failed: invalid prompt')
    })

    it('should include Authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ code: 200, data: { taskId: 'task-123', status: 'processing' } }),
      })

      await getTaskStatus('task-123')

      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers['Authorization']).toContain('Bearer')
    })
  })
})
