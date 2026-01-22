import { Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import { response } from '../utils/response'
import { logger } from '../utils/logger'
import {
  getUserConversations,
  createConversation,
  getConversation,
  updateConversationTitle,
  updateConversationAgent,
  deleteConversation,
} from '../services/conversation.service'

/**
 * Conversation Controller - handles conversation HTTP layer
 */
export class ConversationController {
  /**
   * GET /api/conversations
   * List user's conversations (paginated)
   */
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50)

      const { conversations, total } = await getUserConversations(req.user!.userId, page, limit)

      response.success(res, {
        conversations: conversations.map((c) => ({
          id: c.id,
          title: c.title,
          agentId: c.agentId,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      })
    } catch (error) {
      logger.error('List conversations error', error as Error)
      response.serverError(res, 'Failed to list conversations')
    }
  }

  /**
   * POST /api/conversations
   * Create new conversation
   */
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { title, agentId } = req.body

      const conversation = await createConversation({
        userId: req.user!.userId,
        title,
        agentId,
      })

      response.success(res, {
        id: conversation.id,
        title: conversation.title,
        agentId: conversation.agentId,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      }, 201)
    } catch (error) {
      logger.error('Create conversation error', error as Error)
      response.serverError(res, 'Failed to create conversation')
    }
  }

  /**
   * GET /api/conversations/:id
   * Get conversation with messages
   */
  async get(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params

      const conversation = await getConversation(id, req.user!.userId)
      if (!conversation) {
        response.notFound(res, 'Conversation not found')
        return
      }

      response.success(res, {
        id: conversation.id,
        title: conversation.title,
        agentId: conversation.agentId,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messages: conversation.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          metadata: m.metadata,
          tokensUsed: m.tokensUsed,
          createdAt: m.createdAt,
        })),
      })
    } catch (error) {
      logger.error('Get conversation error', error as Error)
      response.serverError(res, 'Failed to get conversation')
    }
  }

  /**
   * PUT /api/conversations/:id
   * Update conversation (title, agentId)
   */
  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const { title, agentId } = req.body

      let conversation = null

      if (title !== undefined) {
        conversation = await updateConversationTitle(id, req.user!.userId, title)
      }

      if (agentId !== undefined) {
        conversation = await updateConversationAgent(id, req.user!.userId, agentId)
      }

      if (!conversation) {
        response.notFound(res, 'Conversation not found')
        return
      }

      response.success(res, {
        id: conversation.id,
        title: conversation.title,
        agentId: conversation.agentId,
        updatedAt: conversation.updatedAt,
      })
    } catch (error) {
      logger.error('Update conversation error', error as Error)
      response.serverError(res, 'Failed to update conversation')
    }
  }

  /**
   * DELETE /api/conversations/:id
   * Delete conversation
   */
  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params

      const deleted = await deleteConversation(id, req.user!.userId)
      if (!deleted) {
        response.notFound(res, 'Conversation not found')
        return
      }

      response.success(res, { message: 'Conversation deleted' })
    } catch (error) {
      logger.error('Delete conversation error', error as Error)
      response.serverError(res, 'Failed to delete conversation')
    }
  }
}

export const conversationController = new ConversationController()
