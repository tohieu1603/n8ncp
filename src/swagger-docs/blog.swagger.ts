/**
 * @swagger
 * /api/blog:
 *   get:
 *     summary: Get published blog posts
 *     tags: [Blog]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *         description: Filter by tag
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and excerpt
 *     responses:
 *       200:
 *         description: List of blog posts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     posts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/BlogPost'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page: { type: number }
 *                         limit: { type: number }
 *                         total: { type: number }
 *                         totalPages: { type: number }
 *
 * /api/blog/{slug}:
 *   get:
 *     summary: Get blog post by slug
 *     tags: [Blog]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: preview
 *         schema:
 *           type: boolean
 *         description: Set to true to view draft posts (for admin preview)
 *     responses:
 *       200:
 *         description: Blog post
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   $ref: '#/components/schemas/BlogPost'
 *       404:
 *         description: Post not found
 *
 * /api/blog/featured/list:
 *   get:
 *     summary: Get featured blog posts
 *     tags: [Blog]
 *     responses:
 *       200:
 *         description: Featured posts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     posts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/BlogPost'
 */

export {}
