import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { User } from './user.entity'

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'uuid' })
  userId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User

  @Column()
  name: string

  @Column({ unique: true })
  keyHash: string

  @Column()
  keyPrefix: string // First 8 chars for display

  @Column({ nullable: true })
  encryptedKey: string // Encrypted full key for retrieval

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date | null

  @Column({ default: true })
  isActive: boolean

  @CreateDateColumn()
  createdAt: Date
}
