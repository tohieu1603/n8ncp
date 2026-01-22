import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { ChatConversation } from './chat-conversation.entity'

export type MessageRole = 'user' | 'assistant'

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => ChatConversation, (conv) => conv.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation: ChatConversation

  @Column({ type: 'uuid' })
  conversationId: string

  @Column({ type: 'varchar' })
  role: MessageRole

  @Column({ type: 'text' })
  content: string

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null

  @Column({ type: 'int', nullable: true })
  tokensUsed: number | null

  @CreateDateColumn()
  createdAt: Date
}
