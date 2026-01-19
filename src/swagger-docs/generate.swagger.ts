/**
 * @swagger
 * /api/generate:
 *   post:
 *     summary: Create image generation task
 *     tags: [Generate]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenerateRequest'
 *     responses:
 *       200:
 *         description: Task created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     taskId: { type: string }
 *                     status: { type: string, enum: [processing] }
 *       400:
 *         description: Invalid request or insufficient tokens
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 *
 * /api/generate/status:
 *   get:
 *     summary: Get image generation task status
 *     tags: [Generate]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID from create request
 *     responses:
 *       200:
 *         description: Task status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     taskId: { type: string }
 *                     status: { type: string, enum: [processing, completed, failed] }
 *                     output:
 *                       type: object
 *                       properties:
 *                         media_url: { type: string, description: Generated image URL }
 *                     error: { type: string }
 *       400:
 *         description: Task ID required
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Task not found
 */

export {}
