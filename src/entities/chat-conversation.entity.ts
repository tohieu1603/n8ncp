import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm'
import { User } from './user.entity'
import { ChatMessage } from './chat-message.entity'

@Entity('chat_conversations')
export class ChatConversation {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', default: 'Cuộc trò chuyện mới' })
  title: string

  @Column({ type: 'varchar', default: 'general_base' })
  agentId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User

  @Column({ type: 'uuid' })
  userId: string

  @OneToMany(() => ChatMessage, (message) => message.conversation)
  messages: ChatMessage[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
