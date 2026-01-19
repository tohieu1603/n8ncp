/**
 * @swagger
 * /api/convert/word-to-pdf:
 *   post:
 *     summary: Convert Word document to PDF
 *     tags: [Convert]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fileUrl]
 *             properties:
 *               fileUrl: { type: string, description: URL to Word document }
 *               fileName: { type: string }
 *     responses:
 *       200:
 *         description: Conversion started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     jobId: { type: string }
 *                     status: { type: string }
 *                     message: { type: string }
 *       400:
 *         description: File URL required
 *       401:
 *         description: Unauthorized
 *
 * /api/convert/pdf-to-word:
 *   post:
 *     summary: Convert PDF to Word document
 *     tags: [Convert]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fileUrl]
 *             properties:
 *               fileUrl: { type: string, description: URL to PDF file }
 *               fileName: { type: string }
 *     responses:
 *       200:
 *         description: Conversion started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     jobId: { type: string }
 *                     status: { type: string }
 *                     message: { type: string }
 *
 * /api/convert/status:
 *   get:
 *     summary: Get conversion job status
 *     tags: [Convert]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     jobId: { type: string }
 *                     status: { type: string, enum: [processing, completed, failed] }
 *                     downloadUrl: { type: string, description: Download URL (when completed) }
 *
 * /api/convert/upload:
 *   post:
 *     summary: Upload file for conversion
 *     tags: [Convert]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fileData, fileName]
 *             properties:
 *               fileData: { type: string, description: Base64 encoded file data }
 *               fileName: { type: string }
 *               mimeType: { type: string }
 *     responses:
 *       200:
 *         description: File uploaded
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
 */

export {}
