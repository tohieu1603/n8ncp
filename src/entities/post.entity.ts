import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { User } from './user.entity'

export type PostStatus = 'draft' | 'published' | 'archived'

export interface BlockContent {
  id: string
  type: 'text' | 'heading' | 'image' | 'code' | 'quote' | 'list' | 'divider'
  data: Record<string, unknown>
}

export interface SeoMeta {
  metaTitle?: string
  metaDescription?: string
  metaKeywords?: string[]
  ogImage?: string
  canonicalUrl?: string
  noIndex?: boolean
  noFollow?: boolean
}

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 255 })
  title: string

  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string

  @Column({ type: 'text', nullable: true })
  excerpt: string | null

  @Column({ type: 'varchar', nullable: true })
  coverImage: string | null

  @Column({ type: 'jsonb', default: [] })
  blocks: BlockContent[]

  @Column({ type: 'varchar', default: 'draft' })
  status: PostStatus

  // Tags - array of tag strings
  @Column({ type: 'simple-array', nullable: true })
  tags: string[] | null

  // Category
  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null

  // SEO Meta
  @Column({ type: 'jsonb', nullable: true })
  seoMeta: SeoMeta | null

  // Featured post
  @Column({ type: 'boolean', default: false })
  isFeatured: boolean

  // Reading time (minutes)
  @Column({ type: 'int', default: 0 })
  readingTime: number

  @Column({ type: 'int', default: 0 })
  viewCount: number

  @Column({ type: 'uuid' })
  authorId: string

  @ManyToOne(() => User)
  @JoinColumn({ name: 'authorId' })
  author: User

  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date | null

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
