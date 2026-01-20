/**
 * Swagger Configuration
 * API Documentation for ImageGen AI Backend
 */

import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import { Express } from 'express'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ImageGen AI API',
      version: '1.0.0',
      description: 'API documentation for ImageGen AI - AI Image Generation Platform',
      contact: {
        name: 'ImageGen AI Support',
        email: 'support@imagegen.ai',
      },
    },
    servers: [
      {
        url: '/',
        description: 'Current server (auto-detect from browser URL)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'Authorization',
          description: 'API Key for OpenAI-compatible endpoints (Bearer sk-...)',
        },
      },
      schemas: {
        // Common response schemas
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
          },
        },
        // Auth schemas
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['user', 'admin'] },
            isPro: { type: 'boolean' },
            tokenBalance: { type: 'number' },
            isEmailVerified: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            password: { type: 'string', minLength: 8, example: 'password123' },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            name: { type: 'string' },
          },
        },
        // Generate schemas
        GenerateRequest: {
          type: 'object',
          required: ['prompt'],
          properties: {
            prompt: { type: 'string', description: 'Image generation prompt' },
            aspect_ratio: { type: 'string', enum: ['1:1', '16:9', '9:16', '4:3', '3:4'], default: '1:1' },
            model: { type: 'string', default: 'kie-ai' },
          },
        },
        GenerateResponse: {
          type: 'object',
          properties: {
            taskId: { type: 'string' },
            status: { type: 'string', enum: ['processing', 'completed', 'failed'] },
          },
        },
        // Chat schemas
        Agent: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            icon: { type: 'string' },
            description: { type: 'string' },
            tier: { type: 'string', enum: ['base', 'pro'] },
            category: { type: 'string' },
          },
        },
        ChatMessage: {
          type: 'object',
          properties: {
            role: { type: 'string', enum: ['user', 'assistant', 'system'] },
            content: { type: 'string' },
          },
        },
        ChatRequest: {
          type: 'object',
          required: ['messages'],
          properties: {
            messages: {
              type: 'array',
              items: { $ref: '#/components/schemas/ChatMessage' },
            },
            agentId: { type: 'string' },
            imageUrl: { type: 'string' },
          },
        },
        // Billing schemas
        PaymentRequest: {
          type: 'object',
          required: ['amount'],
          properties: {
            amount: { type: 'number', minimum: 10000, description: 'Amount in VND' },
            packageId: { type: 'string' },
          },
        },
        Payment: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            amount: { type: 'number' },
            status: { type: 'string', enum: ['pending', 'completed', 'failed', 'expired'] },
            transactionId: { type: 'string' },
            tokensAdded: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        // Blog schemas
        BlogPost: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            slug: { type: 'string' },
            excerpt: { type: 'string' },
            coverImage: { type: 'string' },
            blocks: { type: 'array', items: { $ref: '#/components/schemas/BlockContent' } },
            tags: { type: 'array', items: { type: 'string' } },
            category: { type: 'string' },
            status: { type: 'string', enum: ['draft', 'published'] },
            readingTime: { type: 'number' },
            viewCount: { type: 'number' },
            publishedAt: { type: 'string', format: 'date-time' },
          },
        },
        BlockContent: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string', enum: ['text', 'heading', 'image', 'code', 'quote', 'list', 'divider'] },
            data: { type: 'object' },
          },
        },
        // API Key schemas
        ApiKey: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            keyPrefix: { type: 'string', description: 'First 8 characters of the key' },
            createdAt: { type: 'string', format: 'date-time' },
            lastUsedAt: { type: 'string', format: 'date-time' },
          },
        },
        // Usage schemas
        UsageSummary: {
          type: 'object',
          properties: {
            totalImages: { type: 'number' },
            totalTokensUsed: { type: 'number' },
            totalChatMessages: { type: 'number' },
            remainingTokens: { type: 'number' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Generate', description: 'Image generation endpoints' },
      { name: 'Chat', description: 'AI Chat endpoints' },
      { name: 'Billing', description: 'Payment and billing endpoints' },
      { name: 'Usage', description: 'Usage statistics endpoints' },
      { name: 'Keys', description: 'API Key management' },
      { name: 'Blog', description: 'Public blog endpoints' },
      { name: 'Admin', description: 'Admin panel endpoints' },
      { name: 'Article Images', description: 'Article image generation' },
      { name: 'Convert', description: 'Document conversion endpoints' },
      { name: 'Download', description: 'Image download proxy' },
      { name: 'OpenAI Compatible', description: 'OpenAI-compatible API endpoints' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/swagger-docs/*.ts'],
}

const swaggerSpec = swaggerJsdoc(options)

export function setupSwagger(app: Express): void {
  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'ImageGen AI API Docs',
  }))

  // JSON spec endpoint with CORS
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET')
    res.send(swaggerSpec)
  })
}

export { swaggerSpec }
