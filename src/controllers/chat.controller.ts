import { Response } from 'express'
import { chat, chatStream, AGENTS, AgentId, calculateCost, ChatMessage, isProAgent, getTokenMultiplier, calculateTokensWithMultiplier } from '../services/gemini-chat.service'
import { logUsage, updateUserCredits } from '../services/usage.service'
import { response } from '../utils/response'
import { validate } from '../utils/validation'
import { logger } from '../utils/logger'
import { AuthRequest } from '../middlewares/auth.middleware'

/**
 * Chat Controller - handles chat HTTP layer
 */
export class ChatController {
  /**
   * GET /api/chat/agents
   */
  getAgents(_req: unknown, res: Response): void {
    const agents = Object.values(AGENTS).map(({ id, name, icon, description, tier, category }) => ({
      id,
      name,
      icon,
      description,
      tier,
      category,
    }))
    response.success(res, agents)
  }

  /**
   * POST /api/chat
   */
  async sendMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { messages, agentId, imageUrl } = req.body

      // Validation
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        response.badRequest(res, 'Messages array is required')
        return
      }

      if (messages.length > 50) {
        response.badRequest(res, 'Too many messages in history (max 50)')
        return
      }

      const lastMessage = messages[messages.length - 1]
      if (!lastMessage?.content) {
        response.badRequest(res, 'Message content is required')
        return
      }

      for (const msg of messages) {
        if (typeof msg.content === 'string' && msg.content.length > 50000) {
          response.badRequest(res, 'Message content too long (max 50000 chars)')
          return
        }
      }

      const validAgentId: AgentId = AGENTS[agentId as AgentId] ? agentId : 'general_base'

      // Get token multiplier for Pro agents (2x for Pro, 1x for base)
      const tokenMultiplier = getTokenMultiplier(validAgentId)
      const isPro = isProAgent(validAgentId)

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

      logger.debug('Chat request', { userId: req.user!.userId, agentId: validAgentId, isPro, tokenMultiplier })

      const result = await chat({
        messages: chatMessages,
        agentId: validAgentId,
      })

      const rawTokens = result.usage?.total_tokens || 0
      // Apply multiplier: Pro agents cost 2x tokens
      const billedTokens = calculateTokensWithMultiplier(rawTokens, validAgentId)
      const cost = calculateCost(rawTokens, tokenMultiplier)

      // Log usage
      await logUsage(req.user!.userId, 'chat', billedTokens, cost, true, {
        agentId: validAgentId,
        messageCount: messages.length,
        rawTokens,
        billedTokens,
        tokenMultiplier,
      })

      // Update user credits with billed tokens
      await updateUserCredits(req.user!.userId, billedTokens, cost)

      response.success(res, {
        message: result.choices[0]?.message?.content || '',
        usage: {
          promptTokens: result.usage?.prompt_tokens || 0,
          completionTokens: result.usage?.completion_tokens || 0,
          totalTokens: rawTokens,
          billedTokens,
          tokenMultiplier,
          cost,
        },
      })
    } catch (error) {
      logger.error('Chat error', error as Error)
      response.serverError(res, 'Failed to process chat request')
    }
  }

  /**
   * POST /api/chat/stream
   */
  async streamMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { messages, agentId, imageUrl } = req.body

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        response.badRequest(res, 'Messages array is required')
        return
      }

      if (messages.length > 50) {
        response.badRequest(res, 'Too many messages in history (max 50)')
        return
      }

      for (const msg of messages) {
        if (typeof msg.content === 'string' && msg.content.length > 50000) {
          response.badRequest(res, 'Message content too long (max 50000 chars)')
          return
        }
      }

      const validAgentId: AgentId = AGENTS[agentId as AgentId] ? agentId : 'general_base'

      // Get token multiplier for Pro agents (2x for Pro, 1x for base)
      const tokenMultiplier = getTokenMultiplier(validAgentId)

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

      // Estimate total tokens
      const outputTokens = Math.ceil(totalContent.length / 4)
      const rawTokens = inputTokens + outputTokens
      // Apply multiplier: Pro agents cost 2x tokens
      const billedTokens = calculateTokensWithMultiplier(rawTokens, validAgentId)
      const cost = calculateCost(rawTokens, tokenMultiplier)

      // Log usage
      await logUsage(req.user!.userId, 'chat_stream', billedTokens, cost, true, {
        agentId: validAgentId,
        inputTokens,
        outputTokens,
        rawTokens,
        billedTokens,
        tokenMultiplier,
      })

      await updateUserCredits(req.user!.userId, billedTokens, cost)

      res.write(`data: ${JSON.stringify({ done: true, usage: { rawTokens, billedTokens, tokenMultiplier, cost } })}\n\n`)
      res.end()
    } catch (error) {
      logger.error('Chat stream error', error as Error)
      res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`)
      res.end()
    }
  }
}

// Singleton instance
export const chatController = new ChatController()
