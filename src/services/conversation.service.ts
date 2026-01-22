import { AppDataSource } from '../data-source'
import { ChatConversation, ChatMessage } from '../entities'
import { logger } from '../utils/logger'

const conversationRepo = AppDataSource.getRepository(ChatConversation)
const messageRepo = AppDataSource.getRepository(ChatMessage)

export interface CreateConversationInput {
  userId: string
  title?: string
  agentId?: string
}

export interface AddMessageInput {
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  metadata?: Record<string, unknown>
  tokensUsed?: number
}

/**
 * Get all conversations for a user (paginated, newest first)
 */
export async function getUserConversations(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ conversations: ChatConversation[]; total: number }> {
  const [conversations, total] = await conversationRepo.findAndCount({
    where: { userId },
    order: { updatedAt: 'DESC' },
    skip: (page - 1) * limit,
    take: limit,
  })
  return { conversations, total }
}

/**
 * Create a new conversation
 */
export async function createConversation(input: CreateConversationInput): Promise<ChatConversation> {
  const conversation = conversationRepo.create({
    userId: input.userId,
    title: input.title || 'Cuộc trò chuyện mới',
    agentId: input.agentId || 'general_base',
  })
  const saved = await conversationRepo.save(conversation)
  logger.info('Conversation created', { conversationId: saved.id, userId: input.userId })
  return saved
}

/**
 * Get a conversation with its messages
 */
export async function getConversation(
  conversationId: string,
  userId: string
): Promise<ChatConversation | null> {
  return conversationRepo.findOne({
    where: { id: conversationId, userId },
    relations: ['messages'],
    order: { messages: { createdAt: 'ASC' } },
  })
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  conversationId: string,
  userId: string,
  title: string
): Promise<ChatConversation | null> {
  const conversation = await conversationRepo.findOne({
    where: { id: conversationId, userId },
  })
  if (!conversation) return null

  conversation.title = title
  return conversationRepo.save(conversation)
}

/**
 * Update conversation agent
 */
export async function updateConversationAgent(
  conversationId: string,
  userId: string,
  agentId: string
): Promise<ChatConversation | null> {
  const conversation = await conversationRepo.findOne({
    where: { id: conversationId, userId },
  })
  if (!conversation) return null

  conversation.agentId = agentId
  return conversationRepo.save(conversation)
}

/**
 * Delete a conversation (cascades to messages)
 */
export async function deleteConversation(conversationId: string, userId: string): Promise<boolean> {
  const result = await conversationRepo.delete({ id: conversationId, userId })
  if (result.affected && result.affected > 0) {
    logger.info('Conversation deleted', { conversationId, userId })
    return true
  }
  return false
}

/**
 * Add a message to a conversation
 */
export async function addMessage(input: AddMessageInput): Promise<ChatMessage> {
  const message = messageRepo.create({
    conversationId: input.conversationId,
    role: input.role,
    content: input.content,
    metadata: input.metadata || null,
    tokensUsed: input.tokensUsed || null,
  })
  const saved = await messageRepo.save(message)

  // Update conversation's updatedAt
  await conversationRepo.update(input.conversationId, { updatedAt: new Date() })

  return saved
}

/**
 * Add user and assistant messages to a conversation (for chat completion)
 */
export async function addChatMessages(
  conversationId: string,
  userContent: string,
  assistantContent: string,
  metadata?: {
    agentId?: string
    tokensUsed?: number
    cost?: number
  }
): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> {
  const userMessage = await addMessage({
    conversationId,
    role: 'user',
    content: userContent,
  })

  const assistantMessage = await addMessage({
    conversationId,
    role: 'assistant',
    content: assistantContent,
    metadata: metadata ? { agentId: metadata.agentId, cost: metadata.cost } : null,
    tokensUsed: metadata?.tokensUsed,
  })

  return { userMessage, assistantMessage }
}

/**
 * Get messages for a conversation
 */
export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  return messageRepo.find({
    where: { conversationId },
    order: { createdAt: 'ASC' },
  })
}
