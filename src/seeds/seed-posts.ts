/**
 * Seed Script - Sample Blog Posts
 * Run: npx ts-node src/seeds/seed-posts.ts
 */

import 'reflect-metadata'
import 'dotenv/config'
import { AppDataSource } from '../data-source'
import { Post, User, BlockContent, SeoMeta } from '../entities'

const samplePosts: Array<{
  title: string
  slug: string
  excerpt: string
  category: string
  tags: string[]
  coverImage: string
  blocks: BlockContent[]
  seoMeta: SeoMeta
  isFeatured: boolean
  readingTime: number
  status: 'draft' | 'published'
}> = [
  {
    title: 'Hướng Dẫn Sử Dụng AI Tạo Ảnh Chuyên Nghiệp',
    slug: 'huong-dan-su-dung-ai-tao-anh-chuyen-nghiep',
    excerpt: 'Khám phá cách sử dụng AI để tạo ra những hình ảnh chất lượng cao cho website, marketing và thiết kế đồ họa.',
    category: 'Hướng dẫn',
    tags: ['AI', 'Tạo ảnh', 'Tutorial', 'Thiết kế'],
    coverImage: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200',
    isFeatured: true,
    readingTime: 8,
    status: 'published',
    seoMeta: {
      metaTitle: 'Hướng Dẫn Sử Dụng AI Tạo Ảnh Chuyên Nghiệp | ImageGen AI',
      metaDescription: 'Học cách sử dụng công nghệ AI tiên tiến để tạo ra hình ảnh chất lượng cao. Hướng dẫn chi tiết từ cơ bản đến nâng cao.',
      metaKeywords: ['AI tạo ảnh', 'hướng dẫn AI', 'thiết kế ảnh AI', 'image generation'],
      noIndex: false,
      noFollow: false,
    },
    blocks: [
      {
        id: 'intro-1',
        type: 'heading',
        data: { text: 'Giới thiệu về AI Tạo Ảnh', level: 2 },
      },
      {
        id: 'intro-2',
        type: 'text',
        data: {
          text: 'Công nghệ AI tạo ảnh đã cách mạng hóa cách chúng ta sáng tạo nội dung hình ảnh. Từ việc tạo ra những bức ảnh độc đáo cho website đến thiết kế marketing chuyên nghiệp, AI đang mở ra những khả năng vô tận.',
        },
      },
      {
        id: 'section-1',
        type: 'heading',
        data: { text: 'Bước 1: Viết Prompt Hiệu Quả', level: 2 },
      },
      {
        id: 'content-1',
        type: 'text',
        data: {
          text: 'Prompt là yếu tố quan trọng nhất khi sử dụng AI tạo ảnh. Một prompt tốt cần mô tả chi tiết về chủ thể, phong cách, ánh sáng, và bối cảnh mong muốn.',
        },
      },
      {
        id: 'list-1',
        type: 'list',
        data: {
          style: 'unordered',
          items: [
            'Mô tả chủ thể chính một cách rõ ràng',
            'Chỉ định phong cách nghệ thuật (realistic, anime, oil painting...)',
            'Thêm thông tin về ánh sáng và màu sắc',
            'Đề cập đến góc chụp và composition',
          ],
        },
      },
      {
        id: 'section-2',
        type: 'heading',
        data: { text: 'Bước 2: Chọn Tỷ Lệ Khung Hình', level: 2 },
      },
      {
        id: 'content-2',
        type: 'text',
        data: {
          text: 'Tùy vào mục đích sử dụng, bạn cần chọn tỷ lệ khung hình phù hợp. Ảnh landscape (16:9) phù hợp cho banner, trong khi portrait (9:16) thích hợp cho story và post dọc.',
        },
      },
      {
        id: 'quote-1',
        type: 'quote',
        data: {
          text: 'AI không thay thế sự sáng tạo của con người - nó chỉ là công cụ để hiện thực hóa ý tưởng nhanh hơn.',
        },
      },
    ],
  },
  {
    title: '10 Mẹo Tối Ưu Hình Ảnh Cho Website',
    slug: '10-meo-toi-uu-hinh-anh-cho-website',
    excerpt: 'Tìm hiểu cách tối ưu hóa hình ảnh để tăng tốc độ tải trang và cải thiện SEO cho website của bạn.',
    category: 'SEO',
    tags: ['SEO', 'Tối ưu', 'Website', 'Performance'],
    coverImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200',
    isFeatured: false,
    readingTime: 6,
    status: 'published',
    seoMeta: {
      metaTitle: '10 Mẹo Tối Ưu Hình Ảnh Cho Website - Tăng Tốc Độ Tải Trang',
      metaDescription: 'Hướng dẫn chi tiết cách tối ưu hình ảnh website để cải thiện Core Web Vitals, tăng tốc độ tải và ranking SEO.',
      metaKeywords: ['tối ưu hình ảnh', 'website performance', 'SEO hình ảnh', 'core web vitals'],
      noIndex: false,
      noFollow: false,
    },
    blocks: [
      {
        id: 'intro-1',
        type: 'text',
        data: {
          text: 'Hình ảnh chiếm phần lớn dung lượng của một trang web. Tối ưu hóa hình ảnh đúng cách có thể giảm thời gian tải trang lên đến 80% và cải thiện đáng kể trải nghiệm người dùng.',
        },
      },
      {
        id: 'tip-1',
        type: 'heading',
        data: { text: '1. Sử Dụng Định Dạng WebP', level: 2 },
      },
      {
        id: 'content-1',
        type: 'text',
        data: {
          text: 'WebP là định dạng hình ảnh hiện đại của Google, cho phép nén ảnh tốt hơn 25-35% so với JPEG và PNG mà không làm giảm chất lượng.',
        },
      },
      {
        id: 'tip-2',
        type: 'heading',
        data: { text: '2. Lazy Loading', level: 2 },
      },
      {
        id: 'content-2',
        type: 'text',
        data: {
          text: 'Chỉ tải hình ảnh khi chúng sắp xuất hiện trong viewport. Điều này giúp giảm tải ban đầu và tiết kiệm băng thông cho người dùng.',
        },
      },
      {
        id: 'code-1',
        type: 'code',
        data: {
          code: '<img src="image.webp" loading="lazy" alt="Description" />',
          language: 'html',
        },
      },
      {
        id: 'tip-3',
        type: 'heading',
        data: { text: '3. Responsive Images', level: 2 },
      },
      {
        id: 'content-3',
        type: 'text',
        data: {
          text: 'Sử dụng srcset để cung cấp nhiều kích thước ảnh khác nhau cho các thiết bị khác nhau. Mobile không cần tải ảnh 4K!',
        },
      },
    ],
  },
  {
    title: 'Xu Hướng Thiết Kế Đồ Họa 2025',
    slug: 'xu-huong-thiet-ke-do-hoa-2025',
    excerpt: 'Khám phá những xu hướng thiết kế đồ họa hot nhất năm 2025 và cách áp dụng chúng vào dự án của bạn.',
    category: 'Xu hướng',
    tags: ['Thiết kế', 'Trend', '2025', 'Đồ họa'],
    coverImage: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=1200',
    isFeatured: true,
    readingTime: 10,
    status: 'published',
    seoMeta: {
      metaTitle: 'Xu Hướng Thiết Kế Đồ Họa 2025 - Những Trend Không Thể Bỏ Qua',
      metaDescription: 'Tổng hợp 8 xu hướng thiết kế đồ họa nổi bật nhất năm 2025: AI art, 3D rendering, gradient mesh và nhiều hơn nữa.',
      metaKeywords: ['xu hướng thiết kế 2025', 'design trends', 'đồ họa 2025', 'graphic design'],
      noIndex: false,
      noFollow: false,
    },
    blocks: [
      {
        id: 'intro-1',
        type: 'text',
        data: {
          text: 'Năm 2025 đánh dấu sự bùng nổ của AI trong thiết kế, cùng với sự quay trở lại của nhiều phong cách cổ điển được làm mới. Hãy cùng điểm qua những xu hướng nổi bật nhất.',
        },
      },
      {
        id: 'trend-1',
        type: 'heading',
        data: { text: '1. AI-Generated Art', level: 2 },
      },
      {
        id: 'content-1',
        type: 'text',
        data: {
          text: 'AI không chỉ là công cụ mà đã trở thành một phong cách riêng. Nhiều thương hiệu đang sử dụng AI art với aesthetic độc đáo, kết hợp giữa sự hoàn hảo của máy và cảm xúc của con người.',
        },
      },
      {
        id: 'trend-2',
        type: 'heading',
        data: { text: '2. 3D Typography', level: 2 },
      },
      {
        id: 'content-2',
        type: 'text',
        data: {
          text: 'Typography 3D với hiệu ứng ánh sáng, phản chiếu và texture đang được ưa chuộng trong branding và quảng cáo. Công nghệ rendering ngày càng dễ tiếp cận.',
        },
      },
      {
        id: 'trend-3',
        type: 'heading',
        data: { text: '3. Gradient Mesh', level: 2 },
      },
      {
        id: 'content-3',
        type: 'text',
        data: {
          text: 'Gradient không còn đơn giản là chuyển màu linear. Gradient mesh tạo ra những hiệu ứng màu sắc phức tạp, organic và bắt mắt.',
        },
      },
      {
        id: 'trend-4',
        type: 'heading',
        data: { text: '4. Neo-Brutalism', level: 2 },
      },
      {
        id: 'content-4',
        type: 'text',
        data: {
          text: 'Phong cách thiết kế thô ráp, bold với màu sắc tương phản cao và typography mạnh mẽ. Neo-Brutalism đang chiếm lĩnh UI/UX design.',
        },
      },
    ],
  },
  {
    title: 'Cách Tạo Ảnh Minh Họa Cho Bài Viết Blog',
    slug: 'cach-tao-anh-minh-hoa-cho-bai-viet-blog',
    excerpt: 'Hướng dẫn từng bước tạo ảnh minh họa chuyên nghiệp cho bài viết blog bằng công cụ AI.',
    category: 'Hướng dẫn',
    tags: ['Blog', 'Minh họa', 'AI', 'Content'],
    coverImage: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200',
    isFeatured: false,
    readingTime: 5,
    status: 'published',
    seoMeta: {
      metaTitle: 'Cách Tạo Ảnh Minh Họa Cho Bài Viết Blog Bằng AI',
      metaDescription: 'Học cách sử dụng AI để tạo ảnh minh họa đẹp mắt cho blog. Tiết kiệm thời gian và chi phí so với stock photo.',
      metaKeywords: ['ảnh minh họa blog', 'AI blog image', 'tạo ảnh cho bài viết', 'blog illustration'],
      noIndex: false,
      noFollow: false,
    },
    blocks: [
      {
        id: 'intro-1',
        type: 'text',
        data: {
          text: 'Ảnh minh họa chất lượng giúp bài viết blog thu hút hơn và tăng engagement. Với AI, bạn có thể tạo ra những hình ảnh độc đáo, không trùng lặp với bất kỳ ai.',
        },
      },
      {
        id: 'step-1',
        type: 'heading',
        data: { text: 'Bước 1: Xác Định Chủ Đề', level: 2 },
      },
      {
        id: 'content-1',
        type: 'text',
        data: {
          text: 'Đọc lại bài viết và xác định 3-5 keyword chính. Những keyword này sẽ là nền tảng để tạo prompt cho AI.',
        },
      },
      {
        id: 'step-2',
        type: 'heading',
        data: { text: 'Bước 2: Chọn Phong Cách', level: 2 },
      },
      {
        id: 'content-2',
        type: 'text',
        data: {
          text: 'Quyết định phong cách phù hợp với brand: realistic, illustration, minimalist, abstract... Giữ nhất quán xuyên suốt các bài viết.',
        },
      },
      {
        id: 'step-3',
        type: 'heading',
        data: { text: 'Bước 3: Sử Dụng Article Illustrator', level: 2 },
      },
      {
        id: 'content-3',
        type: 'text',
        data: {
          text: 'Dùng tính năng Article Illustrator của ImageGen AI - chỉ cần paste nội dung bài viết, AI sẽ tự động đề xuất và tạo ảnh phù hợp cho từng section.',
        },
      },
      {
        id: 'quote-1',
        type: 'quote',
        data: {
          text: 'Ảnh minh họa tùy chỉnh giúp tăng 40% thời gian đọc bài so với stock photo generic.',
        },
      },
    ],
  },
  {
    title: 'So Sánh Các Công Cụ AI Tạo Ảnh Phổ Biến',
    slug: 'so-sanh-cac-cong-cu-ai-tao-anh-pho-bien',
    excerpt: 'Đánh giá chi tiết và so sánh các công cụ AI tạo ảnh hàng đầu: DALL-E, Midjourney, Stable Diffusion và ImageGen AI.',
    category: 'Review',
    tags: ['AI', 'So sánh', 'Review', 'Tools'],
    coverImage: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200',
    isFeatured: false,
    readingTime: 12,
    status: 'draft',
    seoMeta: {
      metaTitle: 'So Sánh DALL-E vs Midjourney vs Stable Diffusion vs ImageGen AI',
      metaDescription: 'Đánh giá chi tiết các công cụ AI tạo ảnh: chất lượng, giá cả, tính năng và use case phù hợp cho từng tool.',
      metaKeywords: ['so sánh AI tạo ảnh', 'DALL-E vs Midjourney', 'AI image generator review', 'best AI art tool'],
      noIndex: false,
      noFollow: false,
    },
    blocks: [
      {
        id: 'intro-1',
        type: 'text',
        data: {
          text: 'Thị trường AI tạo ảnh đang bùng nổ với nhiều công cụ cạnh tranh. Mỗi tool có điểm mạnh riêng, phù hợp với các use case khác nhau. Bài viết này sẽ giúp bạn chọn được công cụ phù hợp nhất.',
        },
      },
      {
        id: 'tool-1',
        type: 'heading',
        data: { text: '1. DALL-E 3 (OpenAI)', level: 2 },
      },
      {
        id: 'content-1',
        type: 'text',
        data: {
          text: 'DALL-E 3 nổi bật với khả năng hiểu prompt phức tạp và tạo ra hình ảnh với text chính xác. Tích hợp sẵn trong ChatGPT, rất tiện cho người dùng cơ bản.',
        },
      },
      {
        id: 'list-1',
        type: 'list',
        data: {
          style: 'unordered',
          items: ['Ưu điểm: Prompt understanding tốt, text rendering chính xác', 'Nhược điểm: Giá cao, ít tùy chỉnh style', 'Giá: ~$20/tháng với ChatGPT Plus'],
        },
      },
      {
        id: 'tool-2',
        type: 'heading',
        data: { text: '2. Midjourney', level: 2 },
      },
      {
        id: 'content-2',
        type: 'text',
        data: {
          text: 'Midjourney là lựa chọn hàng đầu cho artistic output. Hình ảnh có aesthetic đặc trưng, phù hợp cho thiết kế sáng tạo và concept art.',
        },
      },
      {
        id: 'list-2',
        type: 'list',
        data: {
          style: 'unordered',
          items: ['Ưu điểm: Chất lượng nghệ thuật cao, style độc đáo', 'Nhược điểm: Chỉ qua Discord, learning curve cao', 'Giá: $10-60/tháng'],
        },
      },
      {
        id: 'tool-3',
        type: 'heading',
        data: { text: '3. Stable Diffusion', level: 2 },
      },
      {
        id: 'content-3',
        type: 'text',
        data: {
          text: 'Open-source và có thể chạy local. Cộng đồng lớn với nhiều custom models (LoRA, checkpoints). Phù hợp cho developer và power user.',
        },
      },
      {
        id: 'tool-4',
        type: 'heading',
        data: { text: '4. ImageGen AI', level: 2 },
      },
      {
        id: 'content-4',
        type: 'text',
        data: {
          text: 'Giải pháp all-in-one với nhiều tính năng chuyên biệt: Article Illustrator, batch generation, format conversion. Giao diện thân thiện, giá cả cạnh tranh.',
        },
      },
      {
        id: 'divider-1',
        type: 'divider',
        data: {},
      },
      {
        id: 'conclusion',
        type: 'heading',
        data: { text: 'Kết Luận', level: 2 },
      },
      {
        id: 'content-5',
        type: 'text',
        data: {
          text: 'Không có công cụ nào hoàn hảo cho mọi use case. DALL-E cho simplicity, Midjourney cho art, Stable Diffusion cho control, ImageGen AI cho workflow đa năng.',
        },
      },
    ],
  },
  // ==================== AGENT MODELS POSTS ====================
  {
    title: 'Giới Thiệu Các AI Agent Trong ImageGen AI',
    slug: 'gioi-thieu-cac-ai-agent-trong-imagegen-ai',
    excerpt: 'Tìm hiểu chi tiết về 12 AI Agent chuyên biệt trong ImageGen AI - từ General đến Code, Creative, Legal và nhiều hơn nữa.',
    category: 'Hướng dẫn',
    tags: ['AI Agent', 'ChatGPT', 'Hướng dẫn', 'Features'],
    coverImage: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200',
    isFeatured: true,
    readingTime: 15,
    status: 'published',
    seoMeta: {
      metaTitle: 'Giới Thiệu 12 AI Agent Chuyên Biệt Trong ImageGen AI',
      metaDescription: 'Hướng dẫn chi tiết về các AI Agent trong ImageGen AI: General, Image, Document, Code, Creative, Legal - mỗi agent một chuyên môn riêng.',
      metaKeywords: ['AI agent', 'chatbot', 'ImageGen AI', 'trợ lý ảo', 'AI assistant'],
      noIndex: false,
      noFollow: false,
    },
    blocks: [
      {
        id: 'intro-1',
        type: 'heading',
        data: { text: 'AI Agent Là Gì?', level: 2 },
      },
      {
        id: 'intro-2',
        type: 'text',
        data: {
          text: 'AI Agent là các trợ lý ảo được đào tạo chuyên sâu cho từng lĩnh vực cụ thể. Thay vì một chatbot generic trả lời mọi thứ, mỗi Agent trong ImageGen AI được tối ưu hóa cho một nhiệm vụ riêng - giúp bạn nhận được câu trả lời chính xác và chuyên nghiệp hơn.',
        },
      },
      {
        id: 'intro-3',
        type: 'quote',
        data: {
          text: 'Mỗi AI Agent như một chuyên gia trong lĩnh vực riêng - bạn sẽ không hỏi bác sĩ về code, cũng như không nhờ lập trình viên viết hợp đồng.',
        },
      },
      {
        id: 'section-1',
        type: 'heading',
        data: { text: '1. General Agent - Trợ Lý Đa Năng', level: 2 },
      },
      {
        id: 'content-1',
        type: 'text',
        data: {
          text: 'General Agent là trợ lý mặc định, có thể trả lời mọi câu hỏi từ kiến thức tổng quát, giải thích concept, đưa ra lời khuyên hay thảo luận ý tưởng.',
        },
      },
      {
        id: 'list-1',
        type: 'list',
        data: {
          style: 'unordered',
          items: [
            'General (Base): Giới hạn 4K token context, phù hợp câu hỏi ngắn',
            'General Pro: Context 32K token, suy luận phức tạp, phân tích chuyên sâu',
          ],
        },
      },
      {
        id: 'section-2',
        type: 'heading',
        data: { text: '2. Image Agent - Chuyên Gia Hình Ảnh', level: 2 },
      },
      {
        id: 'content-2',
        type: 'text',
        data: {
          text: 'Image Agent chuyên về mọi thứ liên quan đến hình ảnh: phân tích ảnh, gợi ý prompt để tạo ảnh AI, tư vấn về composition, màu sắc và phong cách thiết kế.',
        },
      },
      {
        id: 'list-2',
        type: 'list',
        data: {
          style: 'unordered',
          items: [
            'Image (Base): Phân tích 1 ảnh, gợi ý prompt cơ bản',
            'Image Pro: Phân tích đa ảnh, prompt chuyên nghiệp cho Midjourney/DALL-E/Stable Diffusion',
          ],
        },
      },
      {
        id: 'section-3',
        type: 'heading',
        data: { text: '3. Document Agent - Chuyên Gia Tài Liệu', level: 2 },
      },
      {
        id: 'content-3',
        type: 'text',
        data: {
          text: 'Document Agent xử lý mọi vấn đề về văn bản: tóm tắt tài liệu dài, trích xuất thông tin quan trọng, so sánh nhiều tài liệu và tạo báo cáo.',
        },
      },
      {
        id: 'list-3',
        type: 'list',
        data: {
          style: 'unordered',
          items: [
            'Document (Base): Tóm tắt, trích xuất thông tin từ 1 tài liệu',
            'Document Pro: Phân tích sâu, so sánh nhiều tài liệu, tạo báo cáo chi tiết',
          ],
        },
      },
      {
        id: 'section-4',
        type: 'heading',
        data: { text: '4. Code Agent - Chuyên Gia Lập Trình', level: 2 },
      },
      {
        id: 'content-4',
        type: 'text',
        data: {
          text: 'Code Agent là trợ thủ đắc lực cho developer: debug code, giải thích logic phức tạp, review code, đề xuất tối ưu hóa và hỗ trợ kiến trúc hệ thống.',
        },
      },
      {
        id: 'list-4',
        type: 'list',
        data: {
          style: 'unordered',
          items: [
            'Code (Base): Debug, giải thích code, viết function đơn giản',
            'Code Pro: Kiến trúc full-stack, review code chuyên nghiệp, tối ưu performance',
          ],
        },
      },
      {
        id: 'code-1',
        type: 'code',
        data: {
          code: '// Ví dụ: Hỏi Code Agent\n"Giải thích đoạn code này và đề xuất cách tối ưu:\nconst data = users.filter(u => u.active).map(u => u.name)"',
          language: 'javascript',
        },
      },
      {
        id: 'section-5',
        type: 'heading',
        data: { text: '5. Creative Agent - Chuyên Gia Sáng Tạo', level: 2 },
      },
      {
        id: 'content-5',
        type: 'text',
        data: {
          text: 'Creative Agent hỗ trợ mọi công việc sáng tạo nội dung: viết content marketing, brainstorm ý tưởng, copywriting, kịch bản video và tối ưu SEO.',
        },
      },
      {
        id: 'list-5',
        type: 'list',
        data: {
          style: 'unordered',
          items: [
            'Creative (Base): Viết content cơ bản, ý tưởng marketing',
            'Creative Pro: Copywriting chuyên nghiệp, kịch bản & SEO, content strategy',
          ],
        },
      },
      {
        id: 'section-6',
        type: 'heading',
        data: { text: '6. Legal Agent - Chuyên Gia Văn Bản Pháp Lý', level: 2 },
      },
      {
        id: 'content-6',
        type: 'text',
        data: {
          text: 'Legal Agent (còn gọi là Văn bản) chuyên về văn bản pháp lý và tài chính: đọc hiểu hợp đồng, tóm tắt điều khoản, soạn thảo văn bản và tư vấn cơ bản.',
        },
      },
      {
        id: 'list-6',
        type: 'list',
        data: {
          style: 'unordered',
          items: [
            'Văn bản (Base): Đọc & sửa văn bản, tóm tắt điều khoản pháp lý',
            'Văn bản Pro: Tư vấn pháp lý & tài chính, soạn hợp đồng chuyên nghiệp',
          ],
        },
      },
      {
        id: 'divider-1',
        type: 'divider',
        data: {},
      },
      {
        id: 'section-7',
        type: 'heading',
        data: { text: 'Base vs Pro - Khác Biệt Gì?', level: 2 },
      },
      {
        id: 'content-7',
        type: 'text',
        data: {
          text: 'Mỗi Agent đều có 2 phiên bản: Base (miễn phí) và Pro (yêu cầu subscription). Sự khác biệt chính nằm ở:',
        },
      },
      {
        id: 'list-7',
        type: 'list',
        data: {
          style: 'unordered',
          items: [
            'Context length: Pro có context dài hơn 4-8 lần, xử lý được tài liệu lớn',
            'Model: Pro sử dụng model AI mạnh hơn với khả năng suy luận tốt hơn',
            'Tính năng: Pro có thêm các tính năng nâng cao như phân tích đa file, output format đặc biệt',
          ],
        },
      },
      {
        id: 'conclusion-1',
        type: 'heading',
        data: { text: 'Cách Chọn Agent Phù Hợp', level: 2 },
      },
      {
        id: 'content-8',
        type: 'text',
        data: {
          text: 'Chọn Agent dựa trên công việc cần làm - không phải Agent nào cũng phù hợp cho mọi task. Ví dụ: hỏi về prompt ảnh → Image Agent, cần debug code → Code Agent, soạn email marketing → Creative Agent.',
        },
      },
      {
        id: 'quote-1',
        type: 'quote',
        data: {
          text: 'Tip: Bắt đầu với Base Agent, chỉ upgrade lên Pro khi cần xử lý công việc phức tạp hoặc context dài.',
        },
      },
    ],
  },
  {
    title: 'Hướng Dẫn Sử Dụng Code Agent Hiệu Quả',
    slug: 'huong-dan-su-dung-code-agent-hieu-qua',
    excerpt: 'Tận dụng tối đa Code Agent để debug, review code, học lập trình và xây dựng kiến trúc hệ thống.',
    category: 'Hướng dẫn',
    tags: ['Code Agent', 'Lập trình', 'Debug', 'Tutorial'],
    coverImage: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200',
    isFeatured: false,
    readingTime: 10,
    status: 'published',
    seoMeta: {
      metaTitle: 'Hướng Dẫn Sử Dụng Code Agent - Debug & Review Code Với AI',
      metaDescription: 'Học cách sử dụng Code Agent để debug nhanh, review code chuyên nghiệp, giải thích logic và tối ưu performance.',
      metaKeywords: ['code agent', 'AI coding', 'debug với AI', 'code review', 'lập trình AI'],
      noIndex: false,
      noFollow: false,
    },
    blocks: [
      {
        id: 'intro-1',
        type: 'text',
        data: {
          text: 'Code Agent là một trong những Agent mạnh nhất trong ImageGen AI, được thiết kế đặc biệt cho developer. Bài viết này hướng dẫn cách khai thác tối đa Code Agent.',
        },
      },
      {
        id: 'section-1',
        type: 'heading',
        data: { text: '1. Debug Code Nhanh Chóng', level: 2 },
      },
      {
        id: 'content-1',
        type: 'text',
        data: {
          text: 'Thay vì mất hàng giờ tìm bug, hãy paste code và error message cho Code Agent. Agent sẽ phân tích và chỉ ra chính xác vấn đề cùng cách fix.',
        },
      },
      {
        id: 'code-1',
        type: 'code',
        data: {
          code: '// Prompt mẫu để debug:\n"Tôi gặp lỗi TypeError: Cannot read property \'map\' of undefined\nCode:\nconst items = data.results.map(item => item.name)\n\nGiúp tôi fix lỗi này"',
          language: 'text',
        },
      },
      {
        id: 'section-2',
        type: 'heading',
        data: { text: '2. Giải Thích Code Phức Tạp', level: 2 },
      },
      {
        id: 'content-2',
        type: 'text',
        data: {
          text: 'Gặp đoạn code legacy khó hiểu? Code Agent sẽ giải thích từng phần một cách dễ hiểu, kể cả những pattern phức tạp như recursion, closure hay design patterns.',
        },
      },
      {
        id: 'section-3',
        type: 'heading',
        data: { text: '3. Review & Tối Ưu Code', level: 2 },
      },
      {
        id: 'content-3',
        type: 'text',
        data: {
          text: 'Code Pro Agent có thể review code như một senior developer: phát hiện code smell, đề xuất refactor, cải thiện performance và đảm bảo best practices.',
        },
      },
      {
        id: 'list-1',
        type: 'list',
        data: {
          style: 'unordered',
          items: [
            'Phát hiện potential bugs và edge cases',
            'Đề xuất cải thiện readability và maintainability',
            'Gợi ý tối ưu performance (Big O complexity)',
            'Kiểm tra security vulnerabilities cơ bản',
          ],
        },
      },
      {
        id: 'section-4',
        type: 'heading',
        data: { text: '4. Học Công Nghệ Mới', level: 2 },
      },
      {
        id: 'content-4',
        type: 'text',
        data: {
          text: 'Muốn học React, TypeScript hay bất kỳ framework nào? Code Agent giải thích concept với ví dụ thực tế, giúp bạn hiểu nhanh hơn đọc documentation.',
        },
      },
      {
        id: 'section-5',
        type: 'heading',
        data: { text: '5. Viết Code Từ Mô Tả', level: 2 },
      },
      {
        id: 'content-5',
        type: 'text',
        data: {
          text: 'Mô tả chức năng bạn cần, Code Agent sẽ viết code với structure tốt, có comment và handle edge cases.',
        },
      },
      {
        id: 'code-2',
        type: 'code',
        data: {
          code: '// Prompt mẫu:\n"Viết function TypeScript để validate email\nvới các yêu cầu:\n- Check format email hợp lệ\n- Không cho phép email tạm thời (tempmail)\n- Return object với isValid và error message"',
          language: 'text',
        },
      },
      {
        id: 'quote-1',
        type: 'quote',
        data: {
          text: 'Tip: Cung cấp context càng nhiều càng tốt - tech stack, framework version, và mục đích sử dụng để nhận được code phù hợp nhất.',
        },
      },
    ],
  },
  {
    title: 'Creative Agent - Trợ Lý Sáng Tạo Nội Dung',
    slug: 'creative-agent-tro-ly-sang-tao-noi-dung',
    excerpt: 'Khám phá cách sử dụng Creative Agent để viết content marketing, copywriting, và lên ý tưởng sáng tạo.',
    category: 'Hướng dẫn',
    tags: ['Creative Agent', 'Content Marketing', 'Copywriting', 'SEO'],
    coverImage: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200',
    isFeatured: false,
    readingTime: 8,
    status: 'published',
    seoMeta: {
      metaTitle: 'Creative Agent - Viết Content Marketing & Copywriting Với AI',
      metaDescription: 'Hướng dẫn sử dụng Creative Agent để brainstorm ý tưởng, viết content viral, copywriting chuyên nghiệp và tối ưu SEO.',
      metaKeywords: ['creative agent', 'AI content', 'copywriting AI', 'content marketing', 'viết content'],
      noIndex: false,
      noFollow: false,
    },
    blocks: [
      {
        id: 'intro-1',
        type: 'text',
        data: {
          text: 'Creative Agent là người bạn đồng hành cho marketer và content creator. Từ brainstorm ý tưởng đến viết copy hoàn chỉnh, Creative Agent giúp bạn sáng tạo hiệu quả hơn.',
        },
      },
      {
        id: 'section-1',
        type: 'heading',
        data: { text: '1. Brainstorm Ý Tưởng', level: 2 },
      },
      {
        id: 'content-1',
        type: 'text',
        data: {
          text: 'Bí ý tưởng? Đưa cho Creative Agent chủ đề và target audience, nhận về hàng loạt góc tiếp cận sáng tạo cho content của bạn.',
        },
      },
      {
        id: 'section-2',
        type: 'heading',
        data: { text: '2. Viết Content Marketing', level: 2 },
      },
      {
        id: 'content-2',
        type: 'text',
        data: {
          text: 'Blog post, social media caption, email newsletter - Creative Agent viết được tất cả với tone phù hợp brand voice của bạn.',
        },
      },
      {
        id: 'list-1',
        type: 'list',
        data: {
          style: 'unordered',
          items: [
            'Blog posts với SEO optimization',
            'Facebook/Instagram captions engaging',
            'Email subject lines có CTR cao',
            'Video scripts cho YouTube/TikTok',
          ],
        },
      },
      {
        id: 'section-3',
        type: 'heading',
        data: { text: '3. Copywriting Chuyên Nghiệp (Pro)', level: 2 },
      },
      {
        id: 'content-3',
        type: 'text',
        data: {
          text: 'Creative Pro Agent áp dụng các framework copywriting kinh điển: AIDA, PAS, FAB... để viết sales copy, landing page và quảng cáo convert cao.',
        },
      },
      {
        id: 'section-4',
        type: 'heading',
        data: { text: '4. Tối Ưu SEO Content', level: 2 },
      },
      {
        id: 'content-4',
        type: 'text',
        data: {
          text: 'Creative Pro phân tích và đề xuất cách tối ưu SEO: keyword placement, meta description, heading structure và internal linking.',
        },
      },
      {
        id: 'quote-1',
        type: 'quote',
        data: {
          text: 'Creative Agent không thay thế sự sáng tạo của bạn - nó khuếch đại và tăng tốc quá trình sáng tạo.',
        },
      },
    ],
  },
]

async function seedPosts() {
  try {
    await AppDataSource.initialize()
    console.log('✅ Database connected')

    const userRepo = AppDataSource.getRepository(User)
    const postRepo = AppDataSource.getRepository(Post)

    // Find admin user
    const admin = await userRepo.findOne({ where: { role: 'admin' } })
    if (!admin) {
      console.error('❌ No admin user found. Please run seed:admin first.')
      process.exit(1)
    }

    console.log(`📝 Using admin: ${admin.email}`)

    // Create posts
    for (const postData of samplePosts) {
      // Check if slug exists
      const existing = await postRepo.findOne({ where: { slug: postData.slug } })
      if (existing) {
        console.log(`⏩ Post "${postData.title}" already exists, skipping...`)
        continue
      }

      const post = postRepo.create({
        ...postData,
        authorId: admin.id,
        publishedAt: postData.status === 'published' ? new Date() : null,
      })

      await postRepo.save(post)
      console.log(`✅ Created: ${postData.title}`)
    }

    console.log('\n🎉 Seed completed!')
    console.log(`📊 Total posts: ${await postRepo.count()}`)

    await AppDataSource.destroy()
    process.exit(0)
  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  }
}

seedPosts()
