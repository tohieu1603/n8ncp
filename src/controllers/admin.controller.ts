import { Response } from 'express'
import { AuthRequest } from '../middlewares'
import { userRepository, postRepository } from '../repositories'
import { response } from '../utils/response'
import { logger } from '../utils/logger'
import type { UserRole } from '../entities'
import type { PostStatus, BlockContent } from '../entities'

// Helper to generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Format user for response (exclude password)
function formatUser(user: {
  id: string
  email: string
  name: string | null
  role: string
  creditsUsed: number
  tokenBalance: number
  isPro: boolean
  proExpiresAt: Date | null
  isActive: boolean
  isEmailVerified: boolean
  avatarUrl: string | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    creditsUsed: Number(user.creditsUsed),
    tokenBalance: Number(user.tokenBalance),
    isPro: user.isPro,
    proExpiresAt: user.proExpiresAt,
    isActive: user.isActive,
    isEmailVerified: user.isEmailVerified,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

class AdminController {
  // ==================== USER MANAGEMENT ====================

  async getUsers(req: AuthRequest, res: Response) {
    try {
      const {
        page = '1',
        limit = '10',
        sortBy = 'createdAt',
        sortOrder = 'DESC',
        role,
        isActive,
        isPro,
        isEmailVerified,
        search,
      } = req.query

      const filters = {
        role: role as UserRole | undefined,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        isPro: isPro === 'true' ? true : isPro === 'false' ? false : undefined,
        isEmailVerified: isEmailVerified === 'true' ? true : isEmailVerified === 'false' ? false : undefined,
        search: search as string | undefined,
      }

      const pagination = {
        page: parseInt(page as string, 10),
        limit: Math.min(parseInt(limit as string, 10), 100),
        sortBy: sortBy as 'createdAt' | 'updatedAt' | 'email' | 'name' | 'creditsUsed',
        sortOrder: sortOrder as 'ASC' | 'DESC',
      }

      const { users, total } = await userRepository.findAllPaginated(filters, pagination)

      return response.success(res, {
        users: users.map(formatUser),
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.ceil(total / pagination.limit),
        },
      })
    } catch (error) {
      logger.error('Failed to get users', error as Error)
      return response.serverError(res, 'Failed to fetch users')
    }
  }

  async getUserById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params
      const user = await userRepository.findById(id)

      if (!user) {
        return response.notFound(res, 'User not found')
      }

      return response.success(res, formatUser(user))
    } catch (error) {
      logger.error('Failed to get user', error as Error)
      return response.serverError(res, 'Failed to fetch user')
    }
  }

  async updateUserRole(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params
      const { role } = req.body

      if (!['user', 'admin'].includes(role)) {
        return response.badRequest(res, 'Invalid role')
      }

      // Prevent self-demotion
      if (req.user?.userId === id && role !== 'admin') {
        return response.badRequest(res, 'Cannot change your own role')
      }

      const user = await userRepository.findById(id)
      if (!user) {
        return response.notFound(res, 'User not found')
      }

      await userRepository.updateRole(id, role)
      logger.info('User role updated', { userId: id, newRole: role, by: req.user?.userId })

      const updated = await userRepository.findById(id)
      return response.success(res, formatUser(updated!))
    } catch (error) {
      logger.error('Failed to update user role', error as Error)
      return response.serverError(res, 'Failed to update role')
    }
  }

  async toggleUserStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params
      const { isActive } = req.body

      // Prevent self-deactivation
      if (req.user?.userId === id && !isActive) {
        return response.badRequest(res, 'Cannot deactivate your own account')
      }

      const user = await userRepository.findById(id)
      if (!user) {
        return response.notFound(res, 'User not found')
      }

      await userRepository.setActiveStatus(id, isActive)
      logger.info('User status updated', { userId: id, isActive, by: req.user?.userId })

      const updated = await userRepository.findById(id)
      return response.success(res, formatUser(updated!))
    } catch (error) {
      logger.error('Failed to toggle user status', error as Error)
      return response.serverError(res, 'Failed to update status')
    }
  }

  async getUserStats(req: AuthRequest, res: Response) {
    try {
      const stats = await userRepository.getStats()
      return response.success(res, stats)
    } catch (error) {
      logger.error('Failed to get user stats', error as Error)
      return response.serverError(res, 'Failed to fetch stats')
    }
  }

  // ==================== POST MANAGEMENT ====================

  async getPosts(req: AuthRequest, res: Response) {
    try {
      const {
        page = '1',
        limit = '10',
        sortBy = 'createdAt',
        sortOrder = 'DESC',
        status,
        authorId,
        tag,
        search,
      } = req.query

      const filters = {
        status: status as PostStatus | undefined,
        authorId: authorId as string | undefined,
        tag: tag as string | undefined,
        search: search as string | undefined,
      }

      const pagination = {
        page: parseInt(page as string, 10),
        limit: Math.min(parseInt(limit as string, 10), 100),
        sortBy: sortBy as 'createdAt' | 'updatedAt' | 'publishedAt' | 'viewCount' | 'title',
        sortOrder: sortOrder as 'ASC' | 'DESC',
      }

      const { posts, total } = await postRepository.findAll(filters, pagination)

      return response.success(res, {
        posts: posts.map((p) => ({
          ...p,
          author: p.author ? { id: p.author.id, name: p.author.name, email: p.author.email } : null,
        })),
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.ceil(total / pagination.limit),
        },
      })
    } catch (error) {
      logger.error('Failed to get posts', error as Error)
      return response.serverError(res, 'Failed to fetch posts')
    }
  }

  async getPostById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params
      const post = await postRepository.findById(id)

      if (!post) {
        return response.notFound(res, 'Post not found')
      }

      return response.success(res, {
        ...post,
        author: post.author ? { id: post.author.id, name: post.author.name, email: post.author.email } : null,
      })
    } catch (error) {
      logger.error('Failed to get post', error as Error)
      return response.serverError(res, 'Failed to fetch post')
    }
  }

  async createPost(req: AuthRequest, res: Response) {
    try {
      const {
        title,
        slug: customSlug,
        excerpt,
        coverImage,
        blocks,
        tags,
        category,
        seoMeta,
        isFeatured,
        readingTime,
        status = 'draft',
      } = req.body

      if (!title?.trim()) {
        return response.badRequest(res, 'Title is required')
      }

      // Generate unique slug from title or use custom slug
      let slug = customSlug?.trim() ? generateSlug(customSlug) : generateSlug(title)
      let slugSuffix = 0
      while (!(await postRepository.isSlugUnique(slug))) {
        slugSuffix++
        slug = `${generateSlug(customSlug?.trim() || title)}-${slugSuffix}`
      }

      const post = await postRepository.create({
        title: title.trim(),
        slug,
        excerpt: excerpt?.trim() || null,
        coverImage: coverImage || null,
        blocks: blocks || [],
        tags: tags || null,
        category: category?.trim() || null,
        seoMeta: seoMeta || null,
        isFeatured: isFeatured || false,
        readingTime: readingTime || 0,
        status: status as PostStatus,
        authorId: req.user!.userId,
        publishedAt: status === 'published' ? new Date() : null,
      })

      logger.info('Post created', { postId: post.id, authorId: req.user?.userId })

      return response.created(res, post)
    } catch (error) {
      logger.error('Failed to create post', error as Error)
      return response.serverError(res, 'Failed to create post')
    }
  }

  async updatePost(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params
      const {
        title,
        slug: customSlug,
        excerpt,
        coverImage,
        blocks,
        tags,
        category,
        seoMeta,
        isFeatured,
        readingTime,
        status,
      } = req.body

      const existingPost = await postRepository.findById(id)
      if (!existingPost) {
        return response.notFound(res, 'Post not found')
      }

      const updateData: Record<string, unknown> = {}

      if (title !== undefined) {
        updateData.title = title.trim()
      }

      // Handle custom slug
      if (customSlug !== undefined) {
        const newSlug = generateSlug(customSlug)
        if (newSlug !== existingPost.slug) {
          let slug = newSlug
          let slugSuffix = 0
          while (!(await postRepository.isSlugUnique(slug, id))) {
            slugSuffix++
            slug = `${newSlug}-${slugSuffix}`
          }
          updateData.slug = slug
        }
      } else if (title !== undefined && title.trim() !== existingPost.title) {
        // Auto-generate slug from title if title changed and no custom slug
        let slug = generateSlug(title)
        let slugSuffix = 0
        while (!(await postRepository.isSlugUnique(slug, id))) {
          slugSuffix++
          slug = `${generateSlug(title)}-${slugSuffix}`
        }
        updateData.slug = slug
      }

      if (excerpt !== undefined) updateData.excerpt = excerpt?.trim() || null
      if (coverImage !== undefined) updateData.coverImage = coverImage || null
      if (blocks !== undefined) updateData.blocks = blocks
      if (tags !== undefined) updateData.tags = tags || null
      if (category !== undefined) updateData.category = category?.trim() || null
      if (seoMeta !== undefined) updateData.seoMeta = seoMeta || null
      if (isFeatured !== undefined) updateData.isFeatured = isFeatured
      if (readingTime !== undefined) updateData.readingTime = readingTime

      if (status !== undefined) {
        updateData.status = status
        if (status === 'published' && existingPost.status !== 'published') {
          updateData.publishedAt = new Date()
        } else if (status === 'draft') {
          updateData.publishedAt = null
        }
      }

      const updated = await postRepository.update(id, updateData)
      logger.info('Post updated', { postId: id, by: req.user?.userId })

      return response.success(res, updated)
    } catch (error) {
      logger.error('Failed to update post', error as Error)
      return response.serverError(res, 'Failed to update post')
    }
  }

  async deletePost(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params

      const post = await postRepository.findById(id)
      if (!post) {
        return response.notFound(res, 'Post not found')
      }

      await postRepository.delete(id)
      logger.info('Post deleted', { postId: id, by: req.user?.userId })

      return response.message(res, 'Post deleted')
    } catch (error) {
      logger.error('Failed to delete post', error as Error)
      return response.serverError(res, 'Failed to delete post')
    }
  }

  async publishPost(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params

      const post = await postRepository.findById(id)
      if (!post) {
        return response.notFound(res, 'Post not found')
      }

      const updated = await postRepository.publish(id)
      logger.info('Post published', { postId: id, by: req.user?.userId })

      return response.success(res, updated)
    } catch (error) {
      logger.error('Failed to publish post', error as Error)
      return response.serverError(res, 'Failed to publish post')
    }
  }

  async unpublishPost(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params

      const post = await postRepository.findById(id)
      if (!post) {
        return response.notFound(res, 'Post not found')
      }

      const updated = await postRepository.unpublish(id)
      logger.info('Post unpublished', { postId: id, by: req.user?.userId })

      return response.success(res, updated)
    } catch (error) {
      logger.error('Failed to unpublish post', error as Error)
      return response.serverError(res, 'Failed to unpublish post')
    }
  }
}

export const adminController = new AdminController()
