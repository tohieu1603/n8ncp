const KIE_API_BASE_URL = 'https://api.kie.ai/api/v1/jobs'
const KIE_API_KEY = process.env.KIE_API_KEY || ''

const TEXT_INSTRUCTION = 'If the image contains any text, signs, labels, or written content, it must be in English only. Do not include Vietnamese or any non-English text.'

export interface CreateTaskInput {
  prompt: string
  image_input?: string[]
  aspect_ratio?: string
  resolution?: string
  output_format?: string
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
    state: string  // "waiting", "processing", "success", "failed"
    resultJson?: string  // JSON string containing resultUrls
    failMsg?: string
    failCode?: string
    // Normalized fields (added after parsing)
    status?: string
    output?: {
      media_url?: string
    }
    error?: string
  }
}

export async function createTask(input: CreateTaskInput): Promise<CreateTaskResponse> {
  const enhancedPrompt = `${input.prompt.trim()}. ${TEXT_INSTRUCTION}`

  const response = await fetch(`${KIE_API_BASE_URL}/createTask`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KIE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'nano-banana-pro',
      input: {
        prompt: enhancedPrompt,
        image_input: input.image_input || [],
        aspect_ratio: input.aspect_ratio || '1:1',
        resolution: input.resolution || '1K',
        output_format: input.output_format || 'png',
      },
    }),
  })

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { msg?: string }
    throw new Error(errorData.msg || `API request failed: ${response.status}`)
  }

  return response.json() as Promise<CreateTaskResponse>
}

export async function getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
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
    // Map state to status
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
