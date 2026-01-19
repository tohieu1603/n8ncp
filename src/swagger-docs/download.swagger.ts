/**
 * @swagger
 * /api/download:
 *   get:
 *     summary: Download image via proxy (CORS bypass)
 *     tags: [Download]
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *         description: |
 *           Image URL to download. Must be from whitelisted domains:
 *           - api.kie.ai, cdn.kie.ai
 *           - storage.googleapis.com
 *           - s3.amazonaws.com
 *           - res.cloudinary.com
 *           - fal.media, v3.fal.media
 *           - replicate.delivery
 *     responses:
 *       200:
 *         description: Image file
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid URL or domain not allowed
 *       504:
 *         description: Request timeout
 */

export {}
