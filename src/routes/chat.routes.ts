import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware'
import { chat, chatStream, AGENTS, AgentId, calculateCost, ChatMessage, isProAgent } from '../services/gemini-chat.service'
import { logUsage, updateUserCredits } from '../services/usage.service'
import { response } from '../utils/response'
import { validate } from '../utils/validation'
import { logger } from '../utils/logger'
import { AppDataSource } from '../data-source'
import { User } from '../entities/user.entity'

const router = Router()
const userRepo = AppDataSource.getRepository(User)

/**
 * Check if user has Pro access (either isPro flag or not expired)
 */
function hasProAccess(user: User): boolean {
  if (!user.isPro) return false
  if (!user.proExpiresAt) return true // Lifetime Pro
  return new Date(user.proExpiresAt) > new Date()
}

/**
 * GET /api/chat/agents
 * Get available agents list with tier info
 */
router.get('/agents', (_req, res: Response) => {
  const agents = Object.values(AGENTS).map(({ id, name, icon, description, tier, category }) => ({
    id,
    name,
    icon,
    description,
    tier,
    category,
  }))
  return response.success(res, agents)
})

/**
 * POST /api/chat
 * Send chat message
 */
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { messages, agentId, imageUrl } = req.body

    // Validation
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return response.badRequest(res, 'Messages array is required')
    }

    // Limit message history to prevent abuse
    if (messages.length > 50) {
      return response.badRequest(res, 'Too many messages in history (max 50)')
    }

    const lastMessage = messages[messages.length - 1]
    if (!lastMessage?.content) {
      return response.badRequest(res, 'Message content is required')
    }

    // Validate message content length
    for (const msg of messages) {
      if (typeof msg.content === 'string' && msg.content.length > 50000) {
        return response.badRequest(res, 'Message content too long (max 50000 chars)')
      }
    }

    // Validate agent exists
    const validAgentId: AgentId = AGENTS[agentId as AgentId] ? agentId : 'general_base'

    // Check Pro access for Pro agents
    if (isProAgent(validAgentId)) {
      const user = await userRepo.findOne({ where: { id: req.user!.userId } })
      if (!user || !hasProAccess(user)) {
        return response.forbidden(res, 'Pro subscription required to use this agent')
      }
    }

    // Build chat messages
    const chatMessages: ChatMessage[] = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }))

    // If image URL provided, add to last message
    if (imageUrl && validate.isURL(imageUrl)) {
      const lastIdx = chatMessages.length - 1
      chatMessages[lastIdx] = {
        role: 'user',
        content: [
          { type: 'text', text: String(chatMessages[lastIdx].content) },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      }
    }

    logger.debug('Chat request', { userId: req.user!.userId, agentId: validAgentId })

    const result = await chat({
      messages: chatMessages,
      agentId: validAgentId,
    })

    const totalTokens = result.usage?.total_tokens || 0
    const cost = calculateCost(totalTokens)

    // Log usage
    await logUsage(req.user!.userId, 'chat', totalTokens, cost, true, {
      agentId: validAgentId,
      messageCount: messages.length,
      tokens: totalTokens,
    })

    // Update user credits
    await updateUserCredits(req.user!.userId, totalTokens, cost)

    return response.success(res, {
      message: result.choices[0]?.message?.content || '',
      usage: {
        promptTokens: result.usage?.prompt_tokens || 0,
        completionTokens: result.usage?.completion_tokens || 0,
        totalTokens,
        cost,
      },
    })
  } catch (error) {
    logger.error('Chat error', error as Error)
    return response.serverError(res, 'Failed to process chat request')
  }
})

/**
 * POST /api/chat/stream
 * Send chat message with streaming response
 */
router.post('/stream', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { messages, agentId, imageUrl } = req.body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return response.badRequest(res, 'Messages array is required')
    }

    // Limit message history to prevent abuse
    if (messages.length > 50) {
      return response.badRequest(res, 'Too many messages in history (max 50)')
    }

    // Validate message content length
    for (const msg of messages) {
      if (typeof msg.content === 'string' && msg.content.length > 50000) {
        return response.badRequest(res, 'Message content too long (max 50000 chars)')
      }
    }

    const validAgentId: AgentId = AGENTS[agentId as AgentId] ? agentId : 'general_base'

    // Check Pro access for Pro agents
    if (isProAgent(validAgentId)) {
      const user = await userRepo.findOne({ where: { id: req.user!.userId } })
      if (!user || !hasProAccess(user)) {
        return response.forbidden(res, 'Pro subscription required to use this agent')
      }
    }

    // Build chat messages
    const chatMessages: ChatMessage[] = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }))

    if (imageUrl && validate.isURL(imageUrl)) {
      const lastIdx = chatMessages.length - 1
      chatMessages[lastIdx] = {
        role: 'user',
        content: [
          { type: 'text', text: String(chatMessages[lastIdx].content) },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      }
    }

    // Calculate input tokens from messages
    const inputText = chatMessages.map((m) => {
      if (typeof m.content === 'string') return m.content
      return m.content.map((c) => c.text || '').join(' ')
    }).join(' ')
    const inputTokens = Math.ceil(inputText.length / 4)

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    let totalContent = ''

    for await (const chunk of chatStream({ messages: chatMessages, agentId: validAgentId })) {
      totalContent += chunk
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`)
    }

    // Estimate total tokens (input + output, ~4 chars per token)
    const outputTokens = Math.ceil(totalContent.length / 4)
    const estimatedTokens = inputTokens + outputTokens
    const cost = calculateCost(estimatedTokens)

    // Log usage
    await logUsage(req.user!.userId, 'chat_stream', estimatedTokens, cost, true, {
      agentId: validAgentId,
      inputTokens,
      outputTokens,
      estimatedTokens,
    })

    await updateUserCredits(req.user!.userId, estimatedTokens, cost)

    res.write(`data: ${JSON.stringify({ done: true, usage: { estimatedTokens, cost } })}\n\n`)
    res.end()
  } catch (error) {
    logger.error('Chat stream error', error as Error)
    res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`)
    res.end()
  }
})

export default router
