import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { User } from './user.entity'

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'expired'

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'uuid' })
  userId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User

  @Column()
  transactionId: string

  @Column({ type: 'decimal', precision: 12, scale: 0 })
  amount: number // VND

  @Column({ type: 'int', default: 0 })
  credits: number

  @Column()
  planId: string

  @Column()
  description: string

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: PaymentStatus

  @Column({ type: 'text', nullable: true })
  qrCode: string

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    bankCode?: string
    bankName?: string
    accountNumber?: string
    sepayRef?: string
  }

  @CreateDateColumn()
  createdAt: Date
}
