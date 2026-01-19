/**
 * Public Blog Routes - No authentication required
 */
import { Router, Request, Response } from 'express'
import { postRepository } from '../repositories'
import { response } from '../utils/response'
import { logger } from '../utils/logger'

const router = Router()

// Format post for public response (exclude sensitive data)
function formatPublicPost(post: {
  id: string
  title: string
  slug: string
  excerpt: string | null
  coverImage: string | null
  blocks: unknown[]
  status: string
  tags: string[] | null
  category: string | null
  seoMeta: unknown
  isFeatured: boolean
  readingTime: number
  viewCount: number
  publishedAt: Date | null
  createdAt: Date
  author: { id: string; name: string | null; email: string } | null
}) {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    coverImage: post.coverImage,
    blocks: post.blocks,
    tags: post.tags,
    category: post.category,
    seoMeta: post.seoMeta,
    isFeatured: post.isFeatured,
    readingTime: post.readingTime,
    viewCount: Number(post.viewCount),
    publishedAt: post.publishedAt,
    createdAt: post.createdAt,
    author: post.author ? { name: post.author.name } : null,
  }
}

/**
 * GET /api/blog - Get published posts (paginated)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '10',
      tag,
      search,
    } = req.query

    const pagination = {
      page: parseInt(page as string, 10),
      limit: Math.min(parseInt(limit as string, 10), 50),
      sortBy: 'publishedAt' as const,
      sortOrder: 'DESC' as const,
    }

    const filters = {
      status: 'published' as const,
      tag: tag as string | undefined,
      search: search as string | undefined,
    }

    const { posts, total } = await postRepository.findAll(filters, pagination)

    return response.success(res, {
      posts: posts.map(formatPublicPost),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    })
  } catch (error) {
    logger.error('Failed to get blog posts', error as Error)
    return response.serverError(res, 'Failed to fetch posts')
  }
})

/**
 * GET /api/blog/:slug - Get single post by slug
 */
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params
    const { preview } = req.query

    const post = await postRepository.findBySlug(slug)

    if (!post) {
      return response.notFound(res, 'Post not found')
    }

    // Only allow published posts (unless preview mode)
    if (post.status !== 'published' && preview !== 'true') {
      return response.notFound(res, 'Post not found')
    }

    // Increment view count (only for published, non-preview)
    if (post.status === 'published' && preview !== 'true') {
      await postRepository.incrementViewCount(post.id)
    }

    return response.success(res, formatPublicPost(post))
  } catch (error) {
    logger.error('Failed to get blog post', error as Error)
    return response.serverError(res, 'Failed to fetch post')
  }
})

/**
 * GET /api/blog/featured - Get featured posts
 */
router.get('/featured/list', async (_req: Request, res: Response) => {
  try {
    const { posts } = await postRepository.findAll(
      { status: 'published' },
      { page: 1, limit: 5, sortBy: 'publishedAt', sortOrder: 'DESC' }
    )

    const featuredPosts = posts.filter(p => p.isFeatured)

    return response.success(res, {
      posts: featuredPosts.map(formatPublicPost),
    })
  } catch (error) {
    logger.error('Failed to get featured posts', error as Error)
    return response.serverError(res, 'Failed to fetch featured posts')
  }
})

export default router
