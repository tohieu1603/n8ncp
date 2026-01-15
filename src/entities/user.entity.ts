import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm'
import { UsageLog } from './usage-log.entity'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true })
  email: string

  @Column()
  password: string

  @Column({ nullable: true, type: 'varchar' })
  name: string | null

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  creditsUsed: number

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  totalSpentUsd: number

  @Column({ type: 'bigint', default: 0 })
  tokenBalance: number

  @Column({ type: 'bigint', default: 100000 })
  tokenLimit: number

  @Column({ default: false })
  isPro: boolean

  @Column({ type: 'timestamp', nullable: true })
  proExpiresAt: Date | null

  @Column({ default: true })
  isActive: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @OneToMany(() => UsageLog, (log) => log.user)
  usageLogs: UsageLog[]
}
