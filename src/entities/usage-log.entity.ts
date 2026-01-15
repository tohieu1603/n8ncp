import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { User } from './user.entity'

export type ActionType = 'generate_image' | 'login' | 'logout' | 'register' | 'chat' | 'chat_stream' | 'api_chat' | 'api_chat_stream' | 'api_image_generation' | 'convert_word_to_pdf' | 'convert_pdf_to_word' | 'document_conversion'

@Entity('usage_logs')
export class UsageLog {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'uuid' })
  userId: string

  @ManyToOne(() => User, (user) => user.usageLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User

  @Column({ type: 'varchar', length: 50 })
  action: ActionType

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  creditsUsed: number

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  costUsd: number

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    prompt?: string
    taskId?: string
    imageUrl?: string
    aspectRatio?: string
    resolution?: string
    ip?: string
    userAgent?: string
    error?: string
    agentId?: string
    tokens?: number
    estimatedTokens?: number
    jobId?: string
    downloadUrl?: string
    fileName?: string
  }

  @Column({ default: true })
  success: boolean

  @CreateDateColumn()
  createdAt: Date
}
