import { Router, Response } from 'express'
import { apiKeyMiddleware, ApiKeyRequest } from '../middlewares/apikey.middleware'
import { logUsage, updateUserCredits } from '../services/usage.service'
import { createTask, getTaskStatus } from '../services/kie-api.service'
import { logger } from '../utils/logger'
import { AGENTS, AgentId, isProAgent } from '../services/gemini-chat.service'

const router = Router()

const KIE_API_URL = 'https://api.kie.ai'
const KIE_API_KEY = process.env.KIE_API_KEY || ''

// Image generation pricing (per image)
const IMAGE_PRICE = 0.02

// Pricing per 1K tokens
const TOKEN_PRICE_PER_1K = 0.001

function calculateCost(tokens: number): number {
  return (tokens / 1000) * TOKEN_PRICE_PER_1K
}

// Get current date context for system prompt
function getDateContext(): string {
  const now = new Date()
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  }
  const dateStr = now.toLocaleDateString('en-US', options)
  const timeStr = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' })
  return `Current date and time: ${dateStr}, ${timeStr} (Vietnam Time, UTC+7).`
}

/**
 * POST /v1/chat/completions
 * OpenAI-compatible chat completions endpoint
 * Supports custom agent parameter for specialized AI assistants
 */
router.post('/chat/completions', apiKeyMiddleware, async (req: ApiKeyRequest, res: Response) => {
  try {
    const { model, messages, stream, tools, response_format, agent, ...otherParams } = req.body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: {
          message: 'messages is required and must be a non-empty array',
          type: 'invalid_request_error',
          code: 'invalid_messages',
        },
      })
    }

    // Validate message array size
    if (messages.length > 100) {
      return res.status(400).json({
        error: {
          message: 'Too many messages (max 100)',
          type: 'invalid_request_error',
          code: 'too_many_messages',
        },
      })
    }

    // Validate message content sizes
    for (const msg of messages) {
      if (typeof msg.content === 'string' && msg.content.length > 100000) {
        return res.status(400).json({
          error: {
            message: 'Message content too long (max 100000 characters)',
            type: 'invalid_request_error',
            code: 'content_too_long',
          },
        })
      }
    }

    // Check if using a Pro agent
    const agentId = agent as AgentId | undefined
    if (agentId && isProAgent(agentId)) {
      const user = req.apiUser!.user
      const hasProAccess = user.isPro && (!user.proExpiresAt || new Date(user.proExpiresAt) > new Date())
      if (!hasProAccess) {
        return res.status(403).json({
          error: {
            message: 'Pro subscription required to use this agent',
            type: 'insufficient_quota',
            code: 'pro_required',
          },
        })
      }
    }

    // Build messages with agent system prompt if specified
    let finalMessages = [...messages]
    if (agentId && AGENTS[agentId]) {
      const agentConfig = AGENTS[agentId]
      const systemPrompt = `${agentConfig.systemPrompt}\n\n${getDateContext()}`

      // Check if first message is already a system message
      if (finalMessages[0]?.role === 'system') {
        finalMessages[0].content = `${systemPrompt}\n\n${finalMessages[0].content}`
      } else {
        finalMessages = [{ role: 'system', content: systemPrompt }, ...finalMessages]
      }
    }

    // Determine KIE endpoint based on model
    let endpoint = `${KIE_API_URL}/gemini-3-pro/v1/chat/completions`
    if (model?.includes('gpt')) {
      endpoint = `${KIE_API_URL}/openai/v1/chat/completions`
    } else if (model?.includes('claude')) {
      endpoint = `${KIE_API_URL}/anthropic/v1/chat/completions`
    } else if (model?.includes('gemini-2')) {
      endpoint = `${KIE_API_URL}/gemini-2.5-pro/v1/chat/completions`
    }

    const kiePayload = {
      model: model || 'gemini-3-pro',
      messages: finalMessages,
      stream: stream || false,
      ...(tools && { tools }),
      ...(response_format && { response_format }),
      ...otherParams,
    }

    logger.debug('OpenAI API request', {
      userId: req.apiUser!.userId,
      model: kiePayload.model,
      agent: agentId,
      stream: kiePayload.stream,
    })

    const kieResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(kiePayload),
    })

    if (!kieResponse.ok) {
      const errorData = await kieResponse.json().catch(() => ({}))
      logger.error('KIE API error', { status: kieResponse.status, error: errorData })
      return res.status(kieResponse.status).json({
        error: {
          message: (errorData as { message?: string }).message || 'Upstream API error',
          type: 'api_error',
          code: 'upstream_error',
        },
      })
    }

    // Handle streaming response
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      const reader = kieResponse.body?.getReader()
      if (!reader) {
        return res.status(500).json({ error: { message: 'No response body' } })
      }

      const decoder = new TextDecoder()
      let totalContent = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          res.write(chunk)

          // Extract content for token estimation
          const lines = chunk.split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const data = JSON.parse(line.slice(6))
                const content = data.choices?.[0]?.delta?.content
                if (content) totalContent += content
              } catch {
                // Skip parse errors
              }
            }
          }
        }

        // Estimate tokens and log usage
        const inputText = finalMessages.map((m: { content: string | object }) =>
          typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
        ).join(' ')
        const inputTokens = Math.ceil(inputText.length / 4)
        const outputTokens = Math.ceil(totalContent.length / 4)
        const totalTokens = inputTokens + outputTokens
        const cost = calculateCost(totalTokens)

        await logUsage(req.apiUser!.userId, 'api_chat_stream', totalTokens, cost, true, {
          model: kiePayload.model,
          agent: agentId,
          apiKeyId: req.apiUser!.apiKeyId,
          inputTokens,
          outputTokens,
        })
        await updateUserCredits(req.apiUser!.userId, totalTokens, cost)

        res.end()
      } catch (error) {
        logger.error('Stream error', error as Error)
        res.write('data: {"error": "Stream failed"}\n\n')
        res.end()
      }
    } else {
      // Non-streaming response
      const data = await kieResponse.json()

      // Log usage
      const totalTokens = (data as { usage?: { total_tokens?: number } }).usage?.total_tokens || 0
      const cost = calculateCost(totalTokens)

      await logUsage(req.apiUser!.userId, 'api_chat', totalTokens, cost, true, {
        model: kiePayload.model,
        agent: agentId,
        apiKeyId: req.apiUser!.apiKeyId,
        promptTokens: (data as { usage?: { prompt_tokens?: number } }).usage?.prompt_tokens,
        completionTokens: (data as { usage?: { completion_tokens?: number } }).usage?.completion_tokens,
      })
      await updateUserCredits(req.apiUser!.userId, totalTokens, cost)

      return res.json(data)
    }
  } catch (error) {
    logger.error('OpenAI API error', error as Error)
    return res.status(500).json({
      error: {
        message: 'Internal server error',
        type: 'api_error',
        code: 'internal_error',
      },
    })
  }
})

/**
 * GET /v1/models
 * List available models
 */
router.get('/models', apiKeyMiddleware, (_req: ApiKeyRequest, res: Response) => {
  return res.json({
    object: 'list',
    data: [
      { id: 'gemini-3-pro', object: 'model', owned_by: 'google', description: 'Most capable, multimodal' },
      { id: 'gemini-2.5-pro', object: 'model', owned_by: 'google', description: 'Fast and efficient' },
      { id: 'gpt-4o', object: 'model', owned_by: 'openai', description: 'OpenAI GPT-4 Omni' },
      { id: 'gpt-4o-mini', object: 'model', owned_by: 'openai', description: 'Fast and affordable' },
      { id: 'claude-3.5-sonnet', object: 'model', owned_by: 'anthropic', description: 'Balanced performance' },
      { id: 'claude-3.5-haiku', object: 'model', owned_by: 'anthropic', description: 'Fast responses' },
    ],
  })
})

/**
 * GET /v1/agents
 * List available AI agents with specialized capabilities
 */
router.get('/agents', apiKeyMiddleware, (_req: ApiKeyRequest, res: Response) => {
  const agents = Object.values(AGENTS).map(({ id, name, description, tier, category }) => ({
    id,
    name,
    description,
    tier,
    category,
    pro_required: tier === 'pro',
  }))

  return res.json({
    object: 'list',
    data: agents,
  })
})

/**
 * POST /v1/images/generations
 * OpenAI-compatible image generation endpoint
 */
router.post('/images/generations', apiKeyMiddleware, async (req: ApiKeyRequest, res: Response) => {
  try {
    const { prompt, model, size = '1024x1024' } = req.body

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        error: {
          message: 'prompt is required and must be a string',
          type: 'invalid_request_error',
          code: 'invalid_prompt',
        },
      })
    }

    // Validate prompt length
    if (prompt.length > 4000) {
      return res.status(400).json({
        error: {
          message: 'Prompt too long (max 4000 characters)',
          type: 'invalid_request_error',
          code: 'prompt_too_long',
        },
      })
    }

    // Parse size to aspect_ratio
    let aspectRatio = '1:1'
    let resolution = '1K'
    if (size === '1024x1792' || size === '768x1344') {
      aspectRatio = '9:16'
    } else if (size === '1792x1024' || size === '1344x768') {
      aspectRatio = '16:9'
    }
    if (size?.includes('1792') || size?.includes('1344')) {
      resolution = '2K'
    }

    logger.info('OpenAI Image generation request', {
      userId: req.apiUser!.userId,
      model: model || 'flux-schnell',
      size,
    })

    // Create task
    const taskResponse = await createTask({
      prompt,
      aspect_ratio: aspectRatio,
      resolution,
      output_format: 'png',
    })

    if (taskResponse.code !== 200) {
      await logUsage(req.apiUser!.userId, 'api_image_generation', 0, 0, false, {
        prompt: prompt.substring(0, 200),
        error: taskResponse.msg,
        apiKeyId: req.apiUser!.apiKeyId,
      })

      return res.status(500).json({
        error: {
          message: taskResponse.msg || 'Failed to create image generation task',
          type: 'api_error',
          code: 'generation_failed',
        },
      })
    }

    const taskId = taskResponse.data.taskId

    // Poll for completion (max 60 seconds)
    const maxAttempts = 30
    const pollInterval = 2000

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval))

      const statusResponse = await getTaskStatus(taskId)

      if (statusResponse.data?.status === 'SUCCESS') {
        const imageUrl = statusResponse.data.output?.media_url

        // Log successful generation
        await logUsage(req.apiUser!.userId, 'api_image_generation', 1, IMAGE_PRICE, true, {
          prompt: prompt.substring(0, 200),
          taskId,
          imageUrl,
          aspectRatio,
          resolution,
          apiKeyId: req.apiUser!.apiKeyId,
        })
        await updateUserCredits(req.apiUser!.userId, 1, IMAGE_PRICE)

        // Return OpenAI-compatible response
        return res.json({
          created: Math.floor(Date.now() / 1000),
          data: [
            {
              url: imageUrl,
              revised_prompt: prompt,
            },
          ],
        })
      }

      if (statusResponse.data?.status === 'FAILED') {
        await logUsage(req.apiUser!.userId, 'api_image_generation', 0, 0, false, {
          prompt: prompt.substring(0, 200),
          taskId,
          error: statusResponse.data.error,
          apiKeyId: req.apiUser!.apiKeyId,
        })

        return res.status(500).json({
          error: {
            message: statusResponse.data.error || 'Image generation failed',
            type: 'api_error',
            code: 'generation_failed',
          },
        })
      }
    }

    // Timeout
    return res.status(504).json({
      error: {
        message: 'Image generation timed out',
        type: 'api_error',
        code: 'timeout',
      },
    })
  } catch (error) {
    logger.error('OpenAI Image API error', error as Error)
    return res.status(500).json({
      error: {
        message: 'Internal server error',
        type: 'api_error',
        code: 'internal_error',
      },
    })
  }
})

export default router
