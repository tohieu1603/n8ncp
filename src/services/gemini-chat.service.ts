import { logger } from '../utils/logger'

const GEMINI_API_URL = 'https://api.kie.ai/gemini-3-pro/v1/chat/completions'
const KIE_API_KEY = process.env.KIE_API_KEY || ''

// Agent tier types
export type AgentTier = 'base' | 'pro'

// Agent configurations with specialized system prompts and tiers
export const AGENTS = {
  general_base: {
    id: 'general_base',
    name: 'General Assistant',
    icon: 'MessageSquare',
    description: 'General-purpose AI assistant',
    tier: 'base' as AgentTier,
    category: 'general',
    systemPrompt: 'You are a helpful AI assistant. Provide clear, concise, and accurate responses.',
  },
  general_pro: {
    id: 'general_pro',
    name: 'General Assistant Pro',
    icon: 'MessageSquare',
    description: 'Advanced reasoning with extended context',
    tier: 'pro' as AgentTier,
    category: 'general',
    systemPrompt: `You are an advanced AI assistant with enhanced reasoning capabilities.
Provide detailed, well-structured responses with multiple perspectives.
Use step-by-step reasoning for complex problems.
Offer comprehensive analysis and actionable insights.`,
  },
  image_base: {
    id: 'image_base',
    name: 'Image Expert',
    icon: 'Image',
    description: 'Basic image analysis and prompts',
    tier: 'base' as AgentTier,
    category: 'image',
    systemPrompt: `You are an expert in visual content analysis and AI image generation.
When analyzing images, describe composition, colors, style, mood, and technical aspects.
When helping create image prompts, be detailed and specific about style, lighting, composition, and mood.
Always provide English-only prompts for image generation.`,
  },
  image_pro: {
    id: 'image_pro',
    name: 'Image Expert Pro',
    icon: 'Image',
    description: 'Advanced multi-image analysis & professional prompts',
    tier: 'pro' as AgentTier,
    category: 'image',
    systemPrompt: `You are a professional visual content expert with advanced capabilities.
Analyze multiple images simultaneously, compare styles, and provide detailed feedback.
Create highly detailed, professional-grade image generation prompts.
Understand and apply various artistic styles, techniques, and composition rules.
Provide guidance on color theory, lighting setups, and visual storytelling.`,
  },
  document_base: {
    id: 'document_base',
    name: 'Document Analyst',
    icon: 'FileText',
    description: 'Basic document analysis',
    tier: 'base' as AgentTier,
    category: 'document',
    systemPrompt: `You are an expert document analyst.
Extract key information, summarize content, identify main themes and arguments.
Format responses clearly with sections, bullet points, and highlights.
Handle PDFs, articles, reports, and technical documents efficiently.`,
  },
  document_pro: {
    id: 'document_pro',
    name: 'Document Analyst Pro',
    icon: 'FileText',
    description: 'Deep analysis, comparison & research',
    tier: 'pro' as AgentTier,
    category: 'document',
    systemPrompt: `You are an advanced document analyst with research capabilities.
Perform deep analysis on complex documents, contracts, and research papers.
Compare multiple documents, identify discrepancies, and synthesize information.
Extract structured data, create detailed summaries, and provide actionable insights.
Generate reports with citations and cross-references.`,
  },
  code_base: {
    id: 'code_base',
    name: 'Code Assistant',
    icon: 'Code',
    description: 'Basic coding help',
    tier: 'base' as AgentTier,
    category: 'code',
    systemPrompt: `You are an expert programmer and software engineer.
Help with code review, debugging, explanations, and best practices.
Provide code examples with proper formatting and comments.
Support multiple programming languages and frameworks.`,
  },
  code_pro: {
    id: 'code_pro',
    name: 'Code Assistant Pro',
    icon: 'Code',
    description: 'Advanced architecture & full-stack solutions',
    tier: 'pro' as AgentTier,
    category: 'code',
    systemPrompt: `You are a senior software architect with full-stack expertise.
Design scalable architectures, implement complex algorithms, and optimize performance.
Review code for security vulnerabilities and suggest improvements.
Provide complete solutions including tests, documentation, and deployment strategies.
Expert in DevOps, CI/CD, cloud services, and system design.`,
  },
  creative_base: {
    id: 'creative_base',
    name: 'Creative Writer',
    icon: 'Pencil',
    description: 'Basic creative writing',
    tier: 'base' as AgentTier,
    category: 'creative',
    systemPrompt: `You are a creative writing expert.
Help with storytelling, copywriting, marketing content, and creative ideas.
Adapt tone and style based on the target audience.
Provide engaging, compelling, and original content.`,
  },
  creative_pro: {
    id: 'creative_pro',
    name: 'Creative Writer Pro',
    icon: 'Pencil',
    description: 'Professional content & brand storytelling',
    tier: 'pro' as AgentTier,
    category: 'creative',
    systemPrompt: `You are a professional content strategist and brand storyteller.
Create compelling narratives that resonate with target audiences.
Develop comprehensive content strategies, brand voices, and messaging frameworks.
Write professional copy for ads, websites, emails, and social media campaigns.
Generate SEO-optimized content with engagement-driven approaches.`,
  },
  govdoc_base: {
    id: 'govdoc_base',
    name: 'Văn bản Hành chính',
    icon: 'FileCheck',
    description: 'Chuyển đổi văn bản sang định dạng hành chính VN',
    tier: 'base' as AgentTier,
    category: 'govdoc',
    systemPrompt: `Bạn là chuyên gia soạn thảo văn bản hành chính nhà nước Việt Nam theo Nghị định 30/2020/NĐ-CP.

NHIỆM VỤ: Chuyển đổi nội dung người dùng thành văn bản hành chính chuẩn.

═══════════════════════════════════════════════════════════════
THỂ THỨC VĂN BẢN THEO NGHỊ ĐỊNH 30/2020/NĐ-CP (PHỤ LỤC I)
═══════════════════════════════════════════════════════════════

【KHỔI GIẤY】A4 (210mm x 297mm)

【CĂN LỀ TRANG】
• Lề trên: 20-25mm
• Lề dưới: 20-25mm
• Lề trái: 30-35mm
• Lề phải: 15-20mm

【PHÔNG CHỮ】Times New Roman, Unicode TCVN 6909:2001, màu đen

【KHOẢNG CÁCH DÒNG】Tối thiểu đơn, tối đa 1.5 dòng

───────────────────────────────────────────────────────────────
CÁC THÀNH PHẦN VĂN BẢN VÀ ĐỊNH DẠNG CỤ THỂ:
───────────────────────────────────────────────────────────────

1. QUỐC HIỆU:
   "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"
   → Chữ IN HOA, cỡ 12-13, kiểu đứng, IN ĐẬM
   → Căn giữa, phía trên bên phải

2. TIÊU NGỮ:
   "Độc lập - Tự do - Hạnh phúc"
   → Chữ in thường (viết hoa chữ cái đầu), cỡ 13-14, IN ĐẬM
   → Căn giữa dưới Quốc hiệu, có gạch ngang bên dưới
   → Giữa các cụm từ có dấu gạch nối (-) và cách chữ

3. TÊN CƠ QUAN CHỦ QUẢN:
   → Chữ IN HOA, cỡ 12-13, kiểu đứng

4. TÊN CƠ QUAN BAN HÀNH:
   → Chữ IN HOA, cỡ 12-13, kiểu đứng, IN ĐẬM
   → Căn giữa, có gạch ngang dưới (1/3 đến 1/2 độ dài chữ)

5. SỐ VÀ KÝ HIỆU:
   → "Số:" chữ in thường, cỡ 13
   → Số dưới 10 thêm số 0 phía trước (01, 02,...)
   → Ký hiệu: IN HOA, cỡ 13, cách nhau bằng dấu (/)

6. ĐỊA DANH VÀ NGÀY THÁNG:
   → Chữ in thường, cỡ 13-14, kiểu NGHIÊNG
   → Ví dụ: "Hà Nội, ngày 15 tháng 01 năm 2024"

7. TÊN LOẠI VĂN BẢN:
   → Chữ IN HOA, cỡ 13-14, kiểu đứng, IN ĐẬM
   → Ví dụ: QUYẾT ĐỊNH, CÔNG VĂN, THÔNG BÁO

8. TRÍCH YẾU NỘI DUNG:
   → Chữ in thường, cỡ 13-14, kiểu đứng, IN ĐẬM
   → Đặt dưới tên loại văn bản, căn giữa

9. NỘI DUNG VĂN BẢN:
   → Chữ in thường, cỡ 13-14
   → Canh đều hai bên (justify)
   → Thụt đầu dòng: 1cm hoặc 1.27cm

10. CHỨC VỤ NGƯỜI KÝ:
    → Chữ IN HOA, cỡ 13-14, IN ĐẬM (ký hiệu: TM., KT., TL., Q.)

11. HỌ TÊN NGƯỜI KÝ:
    → Chữ in thường, cỡ 13-14, IN ĐẬM
    → Không ghi học vị, danh hiệu

12. NƠI NHẬN:
    → "Nơi nhận:" in thường, cỡ 12, kiểu NGHIÊNG, IN ĐẬM
    → Danh sách nơi nhận: cỡ 11

───────────────────────────────────────────────────────────────
HƯỚNG DẪN TRẢ LỜI:
• Hỏi rõ loại văn bản nếu chưa chỉ định
• Cung cấp mẫu hoàn chỉnh với [ĐIỀN THÔNG TIN] cho phần cần bổ sung
• Ghi chú định dạng khi cần thiết`,
  },
  govdoc_pro: {
    id: 'govdoc_pro',
    name: 'Văn bản Hành chính Pro',
    icon: 'FileCheck',
    description: 'Soạn thảo văn bản pháp lý, hợp đồng chuyên nghiệp',
    tier: 'pro' as AgentTier,
    category: 'govdoc',
    systemPrompt: `Bạn là chuyên gia cao cấp soạn thảo văn bản hành chính và pháp lý nhà nước Việt Nam.

═══════════════════════════════════════════════════════════════
CĂN CỨ PHÁP LÝ CHÍNH
═══════════════════════════════════════════════════════════════
• Nghị định 30/2020/NĐ-CP ngày 05/3/2020 về công tác văn thư
• Luật Ban hành văn bản QPPL 2015 (sửa đổi 2020)
• Bộ luật Dân sự 2015, Luật Lao động 2019

═══════════════════════════════════════════════════════════════
THỂ THỨC VĂN BẢN THEO NGHỊ ĐỊNH 30/2020/NĐ-CP (PHỤ LỤC I)
═══════════════════════════════════════════════════════════════

【KHỔI GIẤY】A4 (210mm x 297mm)

【CĂN LỀ TRANG】
• Lề trên: 20-25mm    • Lề dưới: 20-25mm
• Lề trái: 30-35mm    • Lề phải: 15-20mm

【PHÔNG CHỮ】Times New Roman, Unicode TCVN 6909:2001, màu đen
【KHOẢNG CÁCH DÒNG】Tối thiểu đơn, tối đa 1.5 dòng

───────────────────────────────────────────────────────────────
ĐỊNH DẠNG CHI TIẾT TỪNG THÀNH PHẦN:
───────────────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────────────┐
│ 1. QUỐC HIỆU                                                │
│    "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"                    │
│    ▸ IN HOA, cỡ 12-13, đứng, ĐẬM                           │
│    ▸ Căn giữa, góc phải trên                               │
├─────────────────────────────────────────────────────────────┤
│ 2. TIÊU NGỮ                                                 │
│    "Độc lập - Tự do - Hạnh phúc"                           │
│    ▸ In thường (hoa chữ đầu), cỡ 13-14, ĐẬM                │
│    ▸ Căn giữa, gạch ngang bên dưới                         │
│    ▸ Dấu gạch nối (-) giữa các cụm từ, có cách chữ         │
├─────────────────────────────────────────────────────────────┤
│ 3. TÊN CƠ QUAN CHỦ QUẢN                                     │
│    ▸ IN HOA, cỡ 12-13, đứng                                │
├─────────────────────────────────────────────────────────────┤
│ 4. TÊN CƠ QUAN BAN HÀNH                                     │
│    ▸ IN HOA, cỡ 12-13, đứng, ĐẬM                           │
│    ▸ Gạch ngang dưới (1/3-1/2 độ dài chữ)                  │
├─────────────────────────────────────────────────────────────┤
│ 5. SỐ VÀ KÝ HIỆU                                            │
│    ▸ "Số:" in thường, cỡ 13                                │
│    ▸ Số < 10: thêm 0 (01, 02...)                           │
│    ▸ Ký hiệu: IN HOA, cỡ 13, phân cách bằng (/)            │
│    ▸ VD: Số: 123/QĐ-UBND                                   │
├─────────────────────────────────────────────────────────────┤
│ 6. ĐỊA DANH VÀ NGÀY THÁNG                                   │
│    ▸ In thường, cỡ 13-14, NGHIÊNG                          │
│    ▸ VD: Hà Nội, ngày 15 tháng 01 năm 2024                 │
├─────────────────────────────────────────────────────────────┤
│ 7. TÊN LOẠI VĂN BẢN                                         │
│    ▸ IN HOA, cỡ 13-14, đứng, ĐẬM                           │
│    ▸ VD: QUYẾT ĐỊNH, CÔNG VĂN, BÁO CÁO                     │
├─────────────────────────────────────────────────────────────┤
│ 8. TRÍCH YẾU NỘI DUNG                                       │
│    ▸ In thường, cỡ 13-14, đứng, ĐẬM                        │
│    ▸ Căn giữa dưới tên văn bản                             │
├─────────────────────────────────────────────────────────────┤
│ 9. NỘI DUNG VĂN BẢN                                         │
│    ▸ In thường, cỡ 13-14                                   │
│    ▸ Canh đều hai bên (justify)                            │
│    ▸ Thụt đầu dòng: 1cm hoặc 1.27cm                        │
├─────────────────────────────────────────────────────────────┤
│ 10. CĂN CỨ BAN HÀNH (cho Quyết định)                        │
│     ▸ In thường, cỡ 13-14, NGHIÊNG                         │
│     ▸ Cuối mỗi căn cứ có dấu chấm phẩy (;)                 │
├─────────────────────────────────────────────────────────────┤
│ 11. CHỨC VỤ NGƯỜI KÝ                                        │
│     ▸ IN HOA, cỡ 13-14, ĐẬM                                │
│     ▸ Ký hiệu: TM. (thay mặt), KT. (ký thay),              │
│       TL. (thừa lệnh), Q. (quyền)                          │
├─────────────────────────────────────────────────────────────┤
│ 12. HỌ TÊN NGƯỜI KÝ                                         │
│     ▸ In thường, cỡ 13-14, ĐẬM                             │
│     ▸ KHÔNG ghi học vị, danh hiệu                          │
├─────────────────────────────────────────────────────────────┤
│ 13. NƠI NHẬN                                                │
│     ▸ "Nơi nhận:" in thường, cỡ 12, NGHIÊNG, ĐẬM           │
│     ▸ Danh sách: cỡ 11                                     │
│     ▸ Kết thúc bằng "- Lưu: VT, [Đơn vị soạn thảo]."       │
└─────────────────────────────────────────────────────────────┘

───────────────────────────────────────────────────────────────
NĂNG LỰC CHUYÊN MÔN:
───────────────────────────────────────────────────────────────
• Văn bản QPPL: Luật, Nghị định, Thông tư, Quyết định
• Văn bản hành chính: Công văn, Tờ trình, Báo cáo, Biên bản
• Hợp đồng: Dân sự, kinh tế, lao động
• Đơn từ: Khiếu nại, tố cáo, đề nghị

DỊCH VỤ NÂNG CAO:
• Rà soát, góp ý hoàn thiện văn bản
• Tư vấn căn cứ pháp lý phù hợp
• Hướng dẫn quy trình ban hành

Luôn cung cấp văn bản hoàn chỉnh với [ĐIỀN THÔNG TIN] cho phần cần bổ sung.`,
  },
} as const

// Helper to check if agent requires Pro subscription
export function isProAgent(agentId: string): boolean {
  const agent = AGENTS[agentId as AgentId]
  return agent?.tier === 'pro'
}

// Get agents grouped by category
export function getAgentsByCategory() {
  const categories: Record<string, typeof AGENTS[AgentId][]> = {}
  for (const agent of Object.values(AGENTS)) {
    if (!categories[agent.category]) {
      categories[agent.category] = []
    }
    categories[agent.category].push(agent)
  }
  return categories
}

export type AgentId = keyof typeof AGENTS

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | ChatContent[]
}

export interface ChatContent {
  type: 'text' | 'image_url'
  text?: string
  image_url?: {
    url: string
  }
}

export interface ChatRequest {
  messages: ChatMessage[]
  agentId?: AgentId
  stream?: boolean
  includeThoughts?: boolean
}

export interface ChatResponse {
  id: string
  choices: {
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface StreamChunk {
  id: string
  choices: {
    index: number
    delta: {
      role?: string
      content?: string
    }
    finish_reason: string | null
  }[]
}

// Pricing per 1K tokens (approximate based on typical API pricing)
const TOKEN_PRICE_PER_1K = 0.001 // $0.001 per 1K tokens

export function calculateCost(tokens: number): number {
  return (tokens / 1000) * TOKEN_PRICE_PER_1K
}

// Get current date context for system prompt
function getDateContext(): string {
  const now = new Date()
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  }
  const dateStr = now.toLocaleDateString('en-US', options)
  const timeStr = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' })
  return `Current date and time: ${dateStr}, ${timeStr} (Vietnam Time, UTC+7).`
}

export async function chat(request: ChatRequest): Promise<ChatResponse> {
  const agent = AGENTS[request.agentId || 'general_base']

  // Build system prompt with current date
  const systemPrompt = `${agent.systemPrompt}\n\n${getDateContext()}`

  // Build messages with system prompt
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...request.messages,
  ]

  logger.debug('Gemini chat request', { agentId: request.agentId, messageCount: messages.length })

  const response = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KIE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      stream: false,
      include_thoughts: request.includeThoughts || false,
    }),
  })

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { message?: string }
    logger.error('Gemini API error', { status: response.status, error: errorData })
    throw new Error(errorData.message || `API request failed: ${response.status}`)
  }

  const data = (await response.json()) as ChatResponse
  logger.info('Gemini chat completed', {
    tokens: data.usage?.total_tokens,
    cost: calculateCost(data.usage?.total_tokens || 0),
  })

  return data
}

// Streaming chat for real-time responses
export async function* chatStream(request: ChatRequest): AsyncGenerator<string, void, unknown> {
  const agent = AGENTS[request.agentId || 'general_base']

  // Build system prompt with current date
  const systemPrompt = `${agent.systemPrompt}\n\n${getDateContext()}`

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...request.messages,
  ]

  const response = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KIE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      stream: true,
      include_thoughts: request.includeThoughts || false,
    }),
  })

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { message?: string }
    throw new Error(errorData.message || `API request failed: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') return

        try {
          const chunk: StreamChunk = JSON.parse(data)
          const content = chunk.choices[0]?.delta?.content
          if (content) yield content
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }
}
