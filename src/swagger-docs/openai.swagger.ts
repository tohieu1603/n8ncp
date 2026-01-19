/**
 * @swagger
 * /v1/images/generations:
 *   post:
 *     summary: OpenAI-compatible image generation
 *     tags: [OpenAI Compatible]
 *     security:
 *       - apiKey: []
 *     description: |
 *       Generate images using OpenAI-compatible API format.
 *       Use your ImageGen API key with Bearer prefix: `Bearer sk-xxxxx`
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [prompt]
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: Image generation prompt
 *                 example: A beautiful sunset over mountains
 *               model:
 *                 type: string
 *                 default: kie-ai
 *               n:
 *                 type: integer
 *                 default: 1
 *                 maximum: 1
 *                 description: Number of images (currently only 1 supported)
 *               size:
 *                 type: string
 *                 enum: ['1024x1024', '1792x1024', '1024x1792']
 *                 default: '1024x1024'
 *                 description: |
 *                   Image size:
 *                   - 1024x1024 = 1:1
 *                   - 1792x1024 = 16:9
 *                   - 1024x1792 = 9:16
 *               response_format:
 *                 type: string
 *                 enum: [url, b64_json]
 *                 default: url
 *     responses:
 *       200:
 *         description: Generated image
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 created: { type: integer, description: Unix timestamp }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       url: { type: string, description: Image URL }
 *                       revised_prompt: { type: string }
 *             example:
 *               created: 1704067200
 *               data:
 *                 - url: https://cdn.example.com/image.png
 *                   revised_prompt: A beautiful sunset over mountains
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 *                   properties:
 *                     message: { type: string }
 *                     type: { type: string }
 *                     code: { type: string }
 *       401:
 *         description: Invalid API key
 *       402:
 *         description: Insufficient tokens
 *       429:
 *         description: Rate limit exceeded
 *
 * /v1/models:
 *   get:
 *     summary: List available models
 *     tags: [OpenAI Compatible]
 *     security:
 *       - apiKey: []
 *     responses:
 *       200:
 *         description: List of models
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 object: { type: string, example: list }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       object: { type: string, example: model }
 *                       created: { type: integer }
 *                       owned_by: { type: string }
 */

export {}
