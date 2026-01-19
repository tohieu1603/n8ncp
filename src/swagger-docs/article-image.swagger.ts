/**
 * @swagger
 * /api/article-images:
 *   post:
 *     summary: Create single article image
 *     tags: [Article Images]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [prompt]
 *             properties:
 *               prompt: { type: string, description: Image generation prompt }
 *               aspect_ratio:
 *                 type: string
 *                 enum: ['1:1', '16:9', '9:16', '4:3', '3:4']
 *                 default: '16:9'
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
 *                     message: { type: string }
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *
 * /api/article-images/batch:
 *   post:
 *     summary: Create batch article images
 *     tags: [Article Images]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [images]
 *             properties:
 *               images:
 *                 type: array
 *                 maxItems: 10
 *                 items:
 *                   type: object
 *                   required: [prompt]
 *                   properties:
 *                     prompt: { type: string }
 *                     aspect_ratio: { type: string, enum: ['1:1', '16:9', '9:16', '4:3', '3:4'] }
 *     responses:
 *       200:
 *         description: Batch created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     taskIds: { type: array, items: { type: string } }
 *                     errors: { type: array }
 *                     message: { type: string }
 *
 * /api/article-images/status:
 *   get:
 *     summary: Get single task status
 *     tags: [Article Images]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
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
 *                         media_url: { type: string }
 *                     error: { type: string }
 *
 * /api/article-images/status/batch:
 *   post:
 *     summary: Get batch status
 *     tags: [Article Images]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [taskIds]
 *             properties:
 *               taskIds:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200:
 *         description: Batch status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           taskId: { type: string }
 *                           status: { type: string }
 *                           output: { type: object }
 *                           error: { type: string }
 */

export {}
