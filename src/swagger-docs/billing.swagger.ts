/**
 * @swagger
 * /api/billing/create:
 *   post:
 *     summary: Create payment request (VietQR)
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentRequest'
 *     responses:
 *       200:
 *         description: Payment created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     paymentId: { type: string }
 *                     transactionId: { type: string }
 *                     amount: { type: number }
 *                     qrCode: { type: string, description: QR code image URL }
 *                     bankInfo:
 *                       type: object
 *                       properties:
 *                         bankName: { type: string }
 *                         accountNumber: { type: string }
 *                         accountName: { type: string }
 *                     expiresAt: { type: string, format: date-time }
 *       400:
 *         description: Invalid amount
 *       401:
 *         description: Unauthorized
 *
 * /api/billing/history:
 *   get:
 *     summary: Get payment history
 *     tags: [Billing]
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
 *           default: 10
 *           maximum: 50
 *     responses:
 *       200:
 *         description: Payment history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     payments:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Payment'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page: { type: number }
 *                         limit: { type: number }
 *                         total: { type: number }
 *                         totalPages: { type: number }
 *       401:
 *         description: Unauthorized
 *
 * /api/billing/check/{transactionId}:
 *   get:
 *     summary: Check payment status
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     status: { type: string, enum: [pending, completed, failed, expired] }
 *                     tokensAdded: { type: number }
 *       404:
 *         description: Payment not found
 *
 * /api/billing/detail/{paymentId}:
 *   get:
 *     summary: Get payment detail
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   $ref: '#/components/schemas/Payment'
 *       404:
 *         description: Payment not found
 *
 * /api/billing/webhook:
 *   post:
 *     summary: SePay webhook callback
 *     tags: [Billing]
 *     description: Webhook endpoint for SePay payment notifications. Do not call directly.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content: { type: string }
 *               transferAmount: { type: number }
 *     responses:
 *       200:
 *         description: Webhook processed
 */

export {}
