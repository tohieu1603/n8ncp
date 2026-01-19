/**
 * @swagger
 * /api/usage/summary:
 *   get:
 *     summary: Get usage summary
 *     tags: [Usage]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usage summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   $ref: '#/components/schemas/UsageSummary'
 *       401:
 *         description: Unauthorized
 *
 * /api/usage/logs:
 *   get:
 *     summary: Get usage logs
 *     tags: [Usage]
 *     security:
 *       - bearerAuth: []
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
 *           default: 20
 *           maximum: 100
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           enum: [generate_image, chat, api_call]
 *         description: Filter by action type
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Usage logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     logs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string }
 *                           action: { type: string }
 *                           tokensUsed: { type: number }
 *                           success: { type: boolean }
 *                           createdAt: { type: string, format: date-time }
 *                     pagination:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *
 * /api/usage/stats:
 *   get:
 *     summary: Get usage statistics
 *     tags: [Usage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: week
 *     responses:
 *       200:
 *         description: Usage statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     daily:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date: { type: string }
 *                           images: { type: number }
 *                           tokens: { type: number }
 *       401:
 *         description: Unauthorized
 */

export {}
