/**
 * @swagger
 * /api/keys:
 *   get:
 *     summary: Get user's API keys
 *     tags: [Keys]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of API keys
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ApiKey'
 *       401:
 *         description: Unauthorized
 *
 *   post:
 *     summary: Create new API key
 *     tags: [Keys]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, description: Key name/label }
 *     responses:
 *       201:
 *         description: API key created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     name: { type: string }
 *                     key: { type: string, description: Full API key (only shown once!) }
 *                     createdAt: { type: string, format: date-time }
 *       400:
 *         description: Maximum keys reached (5)
 *       401:
 *         description: Unauthorized
 *
 * /api/keys/{id}:
 *   delete:
 *     summary: Delete API key
 *     tags: [Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Key deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Key not found
 */

export {}
