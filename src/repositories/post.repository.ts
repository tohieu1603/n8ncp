import { AppDataSource } from '../data-source'
import { Post, PostStatus } from '../entities'

const postRepo = AppDataSource.getRepository(Post)

export interface PostFilters {
  status?: PostStatus
  authorId?: string
  tag?: string
  search?: string
}

export interface PaginationOptions {
  page?: number
  limit?: number
  sortBy?: 'createdAt' | 'updatedAt' | 'publishedAt' | 'viewCount' | 'title'
  sortOrder?: 'ASC' | 'DESC'
}

export const postRepository = {
  async findById(id: string): Promise<Post | null> {
    return postRepo.findOne({
      where: { id },
      relations: ['author'],
    })
  },

  async findBySlug(slug: string): Promise<Post | null> {
    return postRepo.findOne({
      where: { slug },
      relations: ['author'],
    })
  },

  async findAll(
    filters: PostFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<{ posts: Post[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = pagination

    const query = postRepo
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')

    if (filters.status) {
      query.andWhere('post.status = :status', { status: filters.status })
    }

    if (filters.authorId) {
      query.andWhere('post.authorId = :authorId', { authorId: filters.authorId })
    }

    if (filters.tag) {
      query.andWhere(':tag = ANY(post.tags)', { tag: filters.tag })
    }

    if (filters.search) {
      query.andWhere(
        '(post.title ILIKE :search OR post.excerpt ILIKE :search)',
        { search: `%${filters.search}%` }
      )
    }

    const [posts, total] = await query
      .orderBy(`post.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount()

    return { posts, total }
  },

  async findPublished(pagination: PaginationOptions = {}): Promise<{ posts: Post[]; total: number }> {
    return this.findAll({ status: 'published' }, pagination)
  },

  async create(data: Partial<Post>): Promise<Post> {
    const post = postRepo.create(data)
    return postRepo.save(post)
  },

  async update(id: string, data: Partial<Post>): Promise<Post | null> {
    const post = await this.findById(id)
    if (!post) return null
    Object.assign(post, data)
    return postRepo.save(post)
  },

  async delete(id: string): Promise<boolean> {
    const result = await postRepo.delete(id)
    return (result.affected ?? 0) > 0
  },

  async incrementViewCount(id: string): Promise<void> {
    await postRepo.increment({ id }, 'viewCount', 1)
  },

  async publish(id: string): Promise<Post | null> {
    await postRepo.update(id, {
      status: 'published',
      publishedAt: new Date(),
    })
    return this.findById(id)
  },

  async unpublish(id: string): Promise<Post | null> {
    await postRepo.update(id, {
      status: 'draft',
      publishedAt: null,
    })
    return this.findById(id)
  },

  async archive(id: string): Promise<Post | null> {
    await postRepo.update(id, { status: 'archived' })
    return this.findById(id)
  },

  async isSlugUnique(slug: string, excludeId?: string): Promise<boolean> {
    const query = postRepo.createQueryBuilder('post').where('post.slug = :slug', { slug })
    if (excludeId) {
      query.andWhere('post.id != :excludeId', { excludeId })
    }
    const count = await query.getCount()
    return count === 0
  },
}
