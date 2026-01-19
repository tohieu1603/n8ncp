/**
 * Article Image Generation Service
 * Uses Seedream 4.5 text-to-image model for generating article illustrations
 */

const KIE_API_BASE_URL = 'https://api.kie.ai/api/v1/jobs'
const KIE_API_KEY = process.env.KIE_API_KEY || ''

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4'

export interface ArticleImageInput {
  prompt: string
  aspect_ratio?: AspectRatio
}

export interface ArticleImageBatchInput {
  images: ArticleImageInput[]
}

export interface CreateTaskResponse {
  code: number
  msg: string
  data: {
    taskId: string
  }
}

export interface TaskStatusResponse {
  code: number
  msg: string
  data: {
    taskId: string
    state: string
    resultJson?: string
    failMsg?: string
    status?: string
    output?: {
      media_url?: string
    }
    error?: string
  }
}

/**
 * Create image generation task using Seedream 4.5 model
 */
export async function createArticleImageTask(input: ArticleImageInput): Promise<CreateTaskResponse> {
  const response = await fetch(`${KIE_API_BASE_URL}/createTask`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KIE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'z-image',
      input: {
        prompt: input.prompt,
        aspect_ratio: input.aspect_ratio || '16:9',
      },
    }),
  })

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { msg?: string }
    throw new Error(errorData.msg || `API request failed: ${response.status}`)
  }

  return response.json() as Promise<CreateTaskResponse>
}

/**
 * Get task status for article image
 */
export async function getArticleImageStatus(taskId: string): Promise<TaskStatusResponse> {
  const response = await fetch(`${KIE_API_BASE_URL}/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${KIE_API_KEY}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`)
  }

  const result = await response.json() as TaskStatusResponse

  // Normalize response format
  if (result.data) {
    if (result.data.state === 'success') {
      result.data.status = 'SUCCESS'
    } else if (result.data.state === 'failed') {
      result.data.status = 'FAILED'
      result.data.error = result.data.failMsg || 'Generation failed'
    } else {
      result.data.status = 'processing'
    }

    // Parse resultJson to get media_url
    if (result.data.resultJson) {
      try {
        const parsed = JSON.parse(result.data.resultJson)
        if (parsed.resultUrls && parsed.resultUrls.length > 0) {
          result.data.output = { media_url: parsed.resultUrls[0] }
        }
      } catch {
        // Ignore parse errors
      }
    }
  }

  return result
}

/**
 * Create batch image generation tasks
 * Returns array of task IDs for polling
 */
export async function createArticleImageBatch(
  inputs: ArticleImageInput[]
): Promise<{ taskIds: string[]; errors: { index: number; error: string }[] }> {
  const taskIds: string[] = []
  const errors: { index: number; error: string }[] = []

  // Process sequentially to avoid rate limiting
  for (let i = 0; i < inputs.length; i++) {
    try {
      const result = await createArticleImageTask(inputs[i])
      if (result.code === 200) {
        taskIds.push(result.data.taskId)
      } else {
        errors.push({ index: i, error: result.msg || 'Unknown error' })
      }
      // Small delay between requests
      if (i < inputs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    } catch (error) {
      errors.push({ index: i, error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  return { taskIds, errors }
}

/**
 * Poll multiple tasks and return results
 */
export async function pollArticleImageBatch(
  taskIds: string[],
  maxAttempts = 60,
  intervalMs = 2000
): Promise<{
  results: { taskId: string; url: string | null; error: string | null }[]
}> {
  const results: { taskId: string; url: string | null; error: string | null }[] = []
  const pending = new Set(taskIds)

  for (let attempt = 0; attempt < maxAttempts && pending.size > 0; attempt++) {
    for (const taskId of pending) {
      try {
        const status = await getArticleImageStatus(taskId)
        if (status.data.status === 'SUCCESS') {
          results.push({
            taskId,
            url: status.data.output?.media_url || null,
            error: null,
          })
          pending.delete(taskId)
        } else if (status.data.status === 'FAILED') {
          results.push({
            taskId,
            url: null,
            error: status.data.error || 'Generation failed',
          })
          pending.delete(taskId)
        }
      } catch (error) {
        // Continue polling on transient errors
      }
    }

    if (pending.size > 0) {
      await new Promise(resolve => setTimeout(resolve, intervalMs))
    }
  }

  // Mark remaining as timeout
  for (const taskId of pending) {
    results.push({ taskId, url: null, error: 'Timeout' })
  }

  return { results }
}
