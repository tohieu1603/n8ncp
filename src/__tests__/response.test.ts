import { Response } from 'express'
import { response } from '../utils/response'

// Mock response object
const mockResponse = (): Response => {
  const res: Partial<Response> = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res as Response
}

describe('Response Utilities', () => {
  describe('success', () => {
    it('should return 200 status with data', () => {
      const res = mockResponse()
      const data = { id: 1, name: 'test' }

      response.success(res, data)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data,
      })
    })

    it('should accept custom status code', () => {
      const res = mockResponse()
      const data = { id: 1 }

      response.success(res, data, 202)

      expect(res.status).toHaveBeenCalledWith(202)
    })

    it('should handle null data', () => {
      const res = mockResponse()

      response.success(res, null)

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: null,
      })
    })

    it('should handle array data', () => {
      const res = mockResponse()
      const data = [1, 2, 3]

      response.success(res, data)

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data,
      })
    })
  })

  describe('message', () => {
    it('should return 200 with message', () => {
      const res = mockResponse()

      response.message(res, 'Operation successful')

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Operation successful',
      })
    })

    it('should accept custom status code', () => {
      const res = mockResponse()

      response.message(res, 'Accepted', 202)

      expect(res.status).toHaveBeenCalledWith(202)
    })
  })

  describe('created', () => {
    it('should return 201 with data', () => {
      const res = mockResponse()
      const data = { id: 'new-id' }

      response.created(res, data)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data,
        message: undefined,
      })
    })

    it('should include message if provided', () => {
      const res = mockResponse()
      const data = { id: 'new-id' }

      response.created(res, data, 'Resource created')

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data,
        message: 'Resource created',
      })
    })
  })

  describe('error', () => {
    it('should return 500 by default', () => {
      const res = mockResponse()

      response.error(res, 'Something went wrong')

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Something went wrong',
      })
    })

    it('should accept custom status code', () => {
      const res = mockResponse()

      response.error(res, 'Conflict', 409)

      expect(res.status).toHaveBeenCalledWith(409)
    })
  })

  describe('badRequest', () => {
    it('should return 400', () => {
      const res = mockResponse()

      response.badRequest(res, 'Invalid input')

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid input',
      })
    })
  })

  describe('unauthorized', () => {
    it('should return 401 with default message', () => {
      const res = mockResponse()

      response.unauthorized(res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized',
      })
    })

    it('should accept custom message', () => {
      const res = mockResponse()

      response.unauthorized(res, 'Token expired')

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token expired',
      })
    })
  })

  describe('forbidden', () => {
    it('should return 403 with default message', () => {
      const res = mockResponse()

      response.forbidden(res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Forbidden',
      })
    })

    it('should accept custom message', () => {
      const res = mockResponse()

      response.forbidden(res, 'Access denied')

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied',
      })
    })
  })

  describe('notFound', () => {
    it('should return 404 with default message', () => {
      const res = mockResponse()

      response.notFound(res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Not found',
      })
    })

    it('should accept custom message', () => {
      const res = mockResponse()

      response.notFound(res, 'User not found')

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found',
      })
    })
  })

  describe('serverError', () => {
    it('should return 500 with default message', () => {
      const res = mockResponse()

      response.serverError(res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
      })
    })

    it('should accept custom message', () => {
      const res = mockResponse()

      response.serverError(res, 'Database connection failed')

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database connection failed',
      })
    })
  })
})
