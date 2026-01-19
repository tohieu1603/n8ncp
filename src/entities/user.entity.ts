import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm'
import { UsageLog } from './usage-log.entity'

export type UserRole = 'user' | 'admin'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true })
  email: string

  @Column({ nullable: true, type: 'varchar' })
  password: string | null

  @Column({ nullable: true, type: 'varchar' })
  name: string | null

  @Column({ type: 'varchar', default: 'user' })
  role: UserRole

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  creditsUsed: number

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  totalSpentUsd: number

  @Column({ type: 'bigint', default: 0 })
  tokenBalance: number

  @Column({ default: false })
  isPro: boolean

  @Column({ type: 'timestamp', nullable: true })
  proExpiresAt: Date | null

  @Column({ default: true })
  isActive: boolean

  @Column({ default: false })
  isEmailVerified: boolean

  // Google OAuth fields
  @Column({ nullable: true, type: 'varchar' })
  googleId: string | null

  @Column({ nullable: true, type: 'varchar' })
  avatarUrl: string | null

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @OneToMany(() => UsageLog, (log) => log.user)
  usageLogs: UsageLog[]
}
