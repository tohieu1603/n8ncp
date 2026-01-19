/**
 * @swagger
 * /api/chat/agents:
 *   get:
 *     summary: Get available AI agents
 *     tags: [Chat]
 *     responses:
 *       200:
 *         description: List of agents
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Agent'
 *
 * /api/chat:
 *   post:
 *     summary: Send chat message (non-streaming)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChatRequest'
 *     responses:
 *       200:
 *         description: Chat response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     message: { type: string }
 *                     usage:
 *                       type: object
 *                       properties:
 *                         promptTokens: { type: number }
 *                         completionTokens: { type: number }
 *                         totalTokens: { type: number }
 *                         cost: { type: number }
 *       400:
 *         description: Insufficient tokens
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 *
 * /api/chat/stream:
 *   post:
 *     summary: Send chat message (streaming)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChatRequest'
 *     responses:
 *       200:
 *         description: Server-Sent Events stream
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               description: |
 *                 SSE stream with events:
 *                 - data: {"content": "..."} - Partial content
 *                 - data: {"done": true, "usage": {...}} - Stream complete
 *       400:
 *         description: Insufficient tokens
 *       401:
 *         description: Unauthorized
 */

export {}
