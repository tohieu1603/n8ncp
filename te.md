 # HƯỚNG DẪN ĐỌC DỮ LIỆU AI KNOWLEDGE CHO AGENT

> **Cập nhật**: 2026-01-21
> **Tổng dung lượng**: ~122 MB
> **Courses**: 24 khóa học (~22,000 concepts)
> **Official Docs**: 20 nguồn (~600 concepts)

---

## 1. TỔNG QUAN CẤU TRÚC

```
ai_knowledge_export/
├── AGENT_READING_GUIDE.md          # File này - Hướng dẫn cho Agent
├── DATA_STRUCTURE.md               # Mô tả cấu trúc dữ liệu
├── knowledge_index.json            # Index tổng toàn bộ knowledge
│
├── _global/                        # Registry toàn cục
│   ├── concept_registry.json       # Tất cả concepts (deduplicated)
│   └── stats.json                  # Thống kê
│
├── _docs/                          # OFFICIAL DOCUMENTATION
│   ├── langchain/
│   ├── langgraph/
│   ├── anthropic/
│   ├── openai/
│   └── ... (20 sources)
│
└── {course_folders}/               # COURSES (24 khóa học)
    ├── langchain/
    ├── langgraph/
    └── ...
```

---

## 2. HAI LOẠI NGUỒN DỮ LIỆU

| Loại | Thư mục | Đặc điểm | Khi nào dùng |
|------|---------|----------|--------------|
| **Courses** | `{course_name}/` | Chi tiết, step-by-step, có ví dụ thực hành, song ngữ | Học concepts, giải thích chi tiết, hướng dẫn |
| **Docs** | `_docs/{source}/` | Chính xác, cập nhật, official API | API reference, syntax chính xác |

---

## 3. HỆ THỐNG 3 TẦNG (3-TIER SYSTEM)

### 3.1 Tổng quan các tầng

```
┌─────────────────────────────────────────────────────────────────┐
│  TIER 0: INDEX & METADATA (~1-5 KB/file)                        │
│  Dùng để: Tìm kiếm nhanh, navigation, chọn source               │
│  Files: metadata.json, index.json, sections_index.json          │
├─────────────────────────────────────────────────────────────────┤
│  TIER 1: AGGREGATED DATA (~50-700 KB/file)                      │
│  Dùng để: Trả lời câu hỏi, tìm concepts, code examples          │
│  Files: aggregated/*.json, concepts.json                        │
├─────────────────────────────────────────────────────────────────┤
│  TIER 2: FULL DETAIL (~5-30 KB/file)                            │
│  Dùng để: Chi tiết đầy đủ một lesson/section/page cụ thể        │
│  Files: lessons/*.json, sections/*.json, pages/*.json           │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Chi tiết từng Tier

#### TIER 0: Index & Metadata (Luôn đọc đầu tiên)

| File | Nội dung | Khi nào dùng |
|------|----------|--------------|
| `metadata.json` | Thông tin course/source (name, description, total_lessons, tags) | Chọn source phù hợp |
| `index.json` | Danh sách sections + lesson_ids | Navigation, tìm lesson |
| `sections_index.json` | Overview các sections (title_vi, key_takeaways) | Hiểu cấu trúc course |

**Ví dụ đọc Tier 0:**
```python
# Bước 1: Đọc metadata để hiểu source
metadata = read_json("langchain/metadata.json")
# -> name_vi, description_vi, total_lessons, tags

# Bước 2: Đọc index để tìm lesson
index = read_json("langchain/index.json")
# -> sections[].lesson_ids -> tìm lesson_id cần đọc
```

#### TIER 1: Aggregated Data (Trả lời câu hỏi)

| File | Nội dung | Khi nào dùng |
|------|----------|--------------|
| `aggregated/concepts.json` | Tất cả concepts (term, definition, importance) | "X là gì?", định nghĩa |
| `aggregated/code_examples.json` | Tất cả code examples | "Code mẫu về X" |
| `aggregated/best_practices.json` | Best practices | "Nên làm gì khi X?" |
| `aggregated/tips.json` | Practical tips | "Tips về X" |
| `aggregated/mistakes.json` | Common mistakes | "Lỗi hay gặp khi X" |
| `aggregated/questions.json` | Review questions | Kiểm tra kiến thức |
| `concepts.json` (root) | Concepts với lesson_id reference | Tìm + drill-down |

**Ví dụ đọc Tier 1:**
```python
# Tìm concept "ReAct Agent"
concepts = read_json("langchain/aggregated/concepts.json")
result = [c for c in concepts["items"] if "react" in c["term"].lower()]
# -> term, term_vi, definition, definition_vi, importance, lesson_id

# Tìm code example về "agent"
examples = read_json("langchain/aggregated/code_examples.json")
result = [e for e in examples["items"] if "agent" in e["description"].lower()]
# -> description, code, explanation, lesson_id
```

#### TIER 2: Full Detail (Chi tiết đầy đủ)

| File | Nội dung | Khi nào dùng |
|------|----------|--------------|
| `lessons/lesson_XXX.json` | Chi tiết 1 lesson | Cần full context của 1 bài |
| `sections/section_id.json` | Chi tiết 1 section (nhiều lessons) | Cần overview + progression |
| `pages/page_XXX.json` (docs) | Chi tiết 1 page docs | Cần full API reference |

**Ví dụ đọc Tier 2:**
```python
# Đọc chi tiết lesson_015 (sau khi tìm được từ Tier 1)
lesson = read_json("langchain/lessons/lesson_015.json")
# -> title_vi, summary_vi, detailed_summary, concepts[], code_examples[],
#    best_practices[], practical_tips[], common_mistakes[]

# Đọc chi tiết section
section = read_json("langchain/sections/03_ice_breaker.json")
# -> overview_vi, key_takeaways[], progression, lessons[]
```

---

## 4. CẤU TRÚC JSON CHI TIẾT

### 4.1 Course Structure

```
{course_folder}/
├── metadata.json               # TIER 0: Thông tin course
├── index.json                  # TIER 0: Index sections + lessons
├── sections_index.json         # TIER 0: Overview sections
├── concepts.json               # TIER 1: Concepts với references
│
├── aggregated/                 # TIER 1: Dữ liệu tổng hợp
│   ├── concepts.json           # Tất cả concepts
│   ├── code_examples.json      # Tất cả code
│   ├── best_practices.json     # Best practices
│   ├── tips.json               # Practical tips
│   ├── mistakes.json           # Common mistakes
│   └── questions.json          # Review questions
│
├── sections/                   # TIER 2: Chi tiết sections
│   ├── 01_introduction.json
│   └── ...
│
└── lessons/                    # TIER 2: Chi tiết lessons
    ├── lesson_001.json
    └── ...
```

### 4.2 Docs Structure

```
_docs/{source}/
├── metadata.json               # TIER 0: Thông tin source
├── index.json                  # TIER 0: Index pages
│
├── aggregated/                 # TIER 1: Dữ liệu tổng hợp
│   ├── concepts.json
│   ├── code_examples.json
│   ├── best_practices.json
│   └── tips.json
│
└── pages/                      # TIER 2: Chi tiết pages
    ├── page_001.json
    └── ...
```

### 4.3 JSON Schemas

#### metadata.json (Course)
```json
{
  "id": "langchain",
  "name": "langchain",
  "name_vi": "LangChain Masterclass: Xây dựng AI Agents & RAG",
  "level": "intermediate",
  "description_vi": "Mô tả chi tiết khóa học...",
  "description_en": "Course description...",
  "target_audience": "Software developers with 1-2 years...",
  "prerequisites": ["Python", "REST APIs"],
  "learning_path": ["Bước 1: ...", "Bước 2: ..."],
  "total_sections": 15,
  "total_lessons": 94,
  "total_concepts": 564,
  "tags": ["langchain", "agents", "rag"]
}
```

#### concepts.json (Aggregated)
```json
{
  "total": 747,
  "updated_at": "2026-01-20T16:53:18",
  "items": [
    {
      "term": "ReAct Agent",
      "term_vi": "Tác nhân ReAct",
      "definition": "An agent that combines reasoning and acting...",
      "definition_vi": "Tác nhân kết hợp suy luận và hành động...",
      "importance": "high",
      "related_terms": ["LangGraph", "Tool Calling"],
      "lesson_id": "lesson_015",
      "section_id": "03_ice_breaker",
      "has_example": true
    }
  ]
}
```

#### lesson_XXX.json (Full Detail)
```json
{
  "id": "lesson_015",
  "original_id": "building_linkedin_lookup_agent",
  "section_id": "03_ice_breaker",
  "section_title": "Ice Breaker Real World AI Agent",
  "title": "Building LinkedIn Lookup Agent",
  "title_vi": "Xây dựng Agent tìm kiếm LinkedIn",
  "summary_vi": "Tóm tắt ngắn tiếng Việt...",
  "summary_en": "Short English summary...",
  "detailed_summary": "Chi tiết đầy đủ nội dung bài học...",
  "difficulty": "intermediate",
  "estimated_time": "25-30 min",
  "tags": ["agent", "linkedin", "api"],

  "concepts": [
    {
      "term": "LinkedIn Lookup Agent",
      "term_vi": "Agent tìm kiếm LinkedIn",
      "definition": "...",
      "definition_vi": "...",
      "example": "Ví dụ cụ thể...",
      "importance": "high",
      "related_terms": ["Tool", "API"]
    }
  ],

  "code_examples": [
    {
      "description": "Creating LinkedIn lookup tool",
      "code": "def lookup_linkedin(name: str):\n    ...",
      "explanation": "Giải thích từng bước..."
    }
  ],

  "best_practices": ["Practice 1...", "Practice 2..."],
  "practical_tips": ["Tip 1...", "Tip 2..."],
  "common_mistakes": ["Mistake 1...", "Mistake 2..."],
  "review_questions": [
    {
      "question": "What is the purpose of...?",
      "question_vi": "Mục đích của ... là gì?",
      "answer": "The purpose is...",
      "answer_vi": "Mục đích là..."
    }
  ]
}
```

#### section_XXX.json (Section Overview)
```json
{
  "id": "03_ice_breaker",
  "title": "Ice Breaker Real World AI Agent",
  "title_vi": "Ice Breaker - Ứng dụng AI Agent thực tế",
  "overview_vi": "Tổng quan chi tiết section...",
  "overview_en": "Section overview...",
  "key_takeaways": [
    "Takeaway 1: ...",
    "Takeaway 2: ...",
    "Takeaway 3: ..."
  ],
  "progression": "Mô tả tiến trình học tập...",
  "lessons": [
    {
      "id": "lesson_015",
      "title": "Building LinkedIn Lookup Agent",
      "title_vi": "Xây dựng Agent tìm kiếm LinkedIn",
      "summary_vi": "...",
      "summary_en": "...",
      "concepts": []
    }
  ]
}
```

---

## 5. WORKFLOW TÌM KIẾM THÔNG TIN

### 5.1 Phân loại câu hỏi theo Tier

```
Câu hỏi                              Tier      File cần đọc
─────────────────────────────────────────────────────────────────
"Có những course nào về X?"         TIER 0    */metadata.json
"Course Y dạy về gì?"               TIER 0    {course}/metadata.json
"X là gì?" (định nghĩa)             TIER 1    aggregated/concepts.json
"Code syntax của X"                 TIER 1    aggregated/code_examples.json
"Best practice khi làm X"           TIER 1    aggregated/best_practices.json
"Lỗi hay gặp khi làm X"             TIER 1    aggregated/mistakes.json
"Tips thực hành về X"               TIER 1    aggregated/tips.json
"Giải thích chi tiết về X"          TIER 2    lessons/lesson_XXX.json
"Tổng quan section Y"               TIER 2    sections/section_id.json
"Full context của bài Z"            TIER 2    lessons/lesson_XXX.json
```

### 5.2 Thuật toán tìm kiếm 3 bước

```python
def search_knowledge(query: str, query_type: str):
    """
    Workflow tìm kiếm tối ưu token
    """

    # ═══════════════════════════════════════════════════════
    # BƯỚC 1: Chọn nguồn (TIER 0)
    # ═══════════════════════════════════════════════════════
    if query_type == "api_reference":
        sources = list_doc_sources()      # _docs/*
    elif query_type == "tutorial":
        sources = list_course_sources()   # courses
    else:
        sources = list_all_sources()

    # ═══════════════════════════════════════════════════════
    # BƯỚC 2: Tìm trong TIER 1 (aggregated)
    # ═══════════════════════════════════════════════════════
    results = []
    for source in sources:
        # Chọn file aggregated phù hợp
        if query_type == "definition":
            data = read_json(f"{source}/aggregated/concepts.json")
        elif query_type == "code":
            data = read_json(f"{source}/aggregated/code_examples.json")
        elif query_type == "best_practice":
            data = read_json(f"{source}/aggregated/best_practices.json")

        # Tìm kiếm
        matches = search_in_items(data["items"], query)
        results.extend(matches)

    # ═══════════════════════════════════════════════════════
    # BƯỚC 3: Drill-down TIER 2 nếu cần chi tiết
    # ═══════════════════════════════════════════════════════
    if need_more_detail(results, query_type):
        for result in results[:3]:  # Top 3 results
            if result.get("lesson_id"):
                # Đọc full lesson
                lesson = read_json(f"{source}/lessons/{result['lesson_id']}.json")
                result["full_content"] = lesson
            elif result.get("page_id"):
                # Đọc full page (docs)
                page = read_json(f"_docs/{source}/pages/{result['page_id']}.json")
                result["full_content"] = page

    return results
```

### 5.3 Ví dụ cụ thể

#### Ví dụ 1: "ReAct Agent là gì?"

```python
# Step 1: TIER 0 - Không cần (đã biết tìm concept)

# Step 2: TIER 1 - Tìm trong concepts
concepts = read_json("langchain/aggregated/concepts.json")
result = next(c for c in concepts["items"] if "react" in c["term"].lower())
# -> {term: "ReAct Agent", definition_vi: "...", lesson_id: "lesson_027"}

# Step 3: TIER 2 - Drill-down nếu cần ví dụ chi tiết
lesson = read_json("langchain/lessons/lesson_027.json")
# -> concepts[0].example, code_examples[], detailed_summary
```

#### Ví dụ 2: "Code tạo agent với LangChain"

```python
# Step 1: TIER 0 - Chọn source (langchain docs hoặc course)

# Step 2: TIER 1 - Tìm code examples
examples = read_json("_docs/langchain/aggregated/code_examples.json")
result = [e for e in examples["items"] if "agent" in e["description"].lower()]
# -> [{description: "Creating a basic agent", code: "...", explanation: "..."}]

# Step 3: TIER 2 - Không cần (đã có code đầy đủ)
```

#### Ví dụ 3: "Học LangChain từ đầu nên bắt đầu từ đâu?"

```python
# Step 1: TIER 0 - Đọc metadata + learning_path
metadata = read_json("langchain/metadata.json")
# -> learning_path: ["Bước 1: Section 01-02...", "Bước 2: ..."]

# Step 2: TIER 0 - Đọc sections_index để hiểu cấu trúc
sections = read_json("langchain/sections_index.json")
# -> [{id: "01_intro", title_vi: "...", key_takeaways: [...]}]

# Step 3: TIER 2 - Đọc section đầu tiên nếu cần chi tiết
section = read_json("langchain/sections/01_introduction.json")
# -> overview_vi, progression, lessons[]
```

---

## 6. CODE MẪU CHO AGENT

### 6.1 Class AIKnowledgeReader

```python
import json
from pathlib import Path
from typing import List, Dict, Optional

class AIKnowledgeReader:
    """
    Reader class cho AI Knowledge Export
    Hỗ trợ 3-tier reading system
    """

    def __init__(self, knowledge_path: str):
        self.base_path = Path(knowledge_path)

    # ═══════════════════════════════════════════════════════
    # TIER 0: INDEX & NAVIGATION
    # ═══════════════════════════════════════════════════════

    def list_course_sources(self) -> List[str]:
        """Liệt kê các khóa học"""
        return [d.name for d in self.base_path.iterdir()
                if d.is_dir() and not d.name.startswith("_")]

    def list_doc_sources(self) -> List[str]:
        """Liệt kê các nguồn docs"""
        docs_path = self.base_path / "_docs"
        if docs_path.exists():
            return [d.name for d in docs_path.iterdir() if d.is_dir()]
        return []

    def get_metadata(self, source: str) -> Dict:
        """Đọc metadata của source (TIER 0)"""
        path = self._get_source_path(source) / "metadata.json"
        return self._load(path)

    def get_index(self, source: str) -> Dict:
        """Đọc index của source (TIER 0)"""
        path = self._get_source_path(source) / "index.json"
        return self._load(path)

    def get_sections_index(self, source: str) -> List[Dict]:
        """Đọc sections index (TIER 0) - chỉ courses"""
        path = self._get_source_path(source) / "sections_index.json"
        return self._load(path) or []

    # ═══════════════════════════════════════════════════════
    # TIER 1: AGGREGATED SEARCH
    # ═══════════════════════════════════════════════════════

    def search_concepts(self, source: str, query: str,
                       importance: str = None) -> List[Dict]:
        """Tìm concepts trong aggregated (TIER 1)"""
        path = self._get_source_path(source) / "aggregated" / "concepts.json"
        data = self._load(path)
        if not data:
            return []

        results = []
        query_lower = query.lower()
        for c in data.get("items", []):
            if (query_lower in c.get("term", "").lower() or
                query_lower in c.get("term_vi", "").lower() or
                query_lower in c.get("definition", "").lower() or
                query_lower in c.get("definition_vi", "").lower()):
                if importance is None or c.get("importance") == importance:
                    results.append(c)

        return results

    def get_code_examples(self, source: str, keyword: str = None) -> List[Dict]:
        """Lấy code examples (TIER 1)"""
        path = self._get_source_path(source) / "aggregated" / "code_examples.json"
        data = self._load(path)
        if not data:
            return []

        items = data.get("items", [])
        if keyword:
            keyword_lower = keyword.lower()
            items = [e for e in items
                    if keyword_lower in e.get("description", "").lower() or
                       keyword_lower in e.get("code", "").lower()]
        return items

    def get_best_practices(self, source: str, keyword: str = None) -> List[str]:
        """Lấy best practices (TIER 1)"""
        path = self._get_source_path(source) / "aggregated" / "best_practices.json"
        data = self._load(path)
        if not data:
            return []

        items = data.get("items", [])
        if keyword:
            keyword_lower = keyword.lower()
            items = [p for p in items if keyword_lower in p.lower()]
        return items

    def get_tips(self, source: str, keyword: str = None) -> List[str]:
        """Lấy practical tips (TIER 1)"""
        path = self._get_source_path(source) / "aggregated" / "tips.json"
        data = self._load(path)
        if not data:
            return []

        items = data.get("items", [])
        if keyword:
            keyword_lower = keyword.lower()
            items = [t for t in items if keyword_lower in t.lower()]
        return items

    def get_mistakes(self, source: str, keyword: str = None) -> List[str]:
        """Lấy common mistakes (TIER 1)"""
        path = self._get_source_path(source) / "aggregated" / "mistakes.json"
        data = self._load(path)
        if not data:
            return []

        items = data.get("items", [])
        if keyword:
            keyword_lower = keyword.lower()
            items = [m for m in items if keyword_lower in m.lower()]
        return items

    # ═══════════════════════════════════════════════════════
    # TIER 2: FULL DETAIL
    # ═══════════════════════════════════════════════════════

    def get_lesson(self, source: str, lesson_id: str) -> Optional[Dict]:
        """Đọc chi tiết 1 lesson (TIER 2)"""
        path = self._get_source_path(source) / "lessons" / f"{lesson_id}.json"
        return self._load(path)

    def get_section(self, source: str, section_id: str) -> Optional[Dict]:
        """Đọc chi tiết 1 section (TIER 2)"""
        path = self._get_source_path(source) / "sections" / f"{section_id}.json"
        return self._load(path)

    def get_page(self, source: str, page_id: str) -> Optional[Dict]:
        """Đọc chi tiết 1 page - dùng cho docs (TIER 2)"""
        path = self.base_path / "_docs" / source / "pages" / f"{page_id}.json"
        return self._load(path)

    # ═══════════════════════════════════════════════════════
    # HELPER METHODS
    # ═══════════════════════════════════════════════════════

    def _get_source_path(self, source: str) -> Path:
        """Lấy path của source"""
        if source.startswith("_docs/"):
            return self.base_path / source
        elif source in self.list_doc_sources():
            return self.base_path / "_docs" / source
        else:
            return self.base_path / source

    def _load(self, path: Path) -> Optional[Dict]:
        """Load JSON file"""
        if path.exists():
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return None
```

### 6.2 Ví dụ sử dụng

```python
# Khởi tạo
reader = AIKnowledgeReader("path/to/ai_knowledge_export")

# ═══════════════════════════════════════════════════════
# VÍ DỤ 1: Trả lời "ReAct Agent là gì?"
# ═══════════════════════════════════════════════════════

def answer_definition(reader, term: str) -> str:
    # TIER 1: Tìm trong docs trước (chính xác hơn)
    for source in reader.list_doc_sources():
        results = reader.search_concepts(source, term)
        if results:
            c = results[0]
            answer = f"**{c['term']}** ({c.get('term_vi', '')})\n\n"
            answer += c.get('definition_vi', c.get('definition', ''))

            # TIER 2: Drill-down nếu cần example
            if c.get('has_example') and c.get('page_id'):
                page = reader.get_page(source, c['page_id'])
                if page:
                    for concept in page.get('concepts', []):
                        if concept['term'] == c['term'] and concept.get('example'):
                            answer += f"\n\n**Ví dụ**: {concept['example']}"
                            break
            return answer

    # Fallback: tìm trong courses
    for source in reader.list_course_sources():
        results = reader.search_concepts(source, term)
        if results:
            c = results[0]
            return f"**{c['term']}**: {c.get('definition_vi', c.get('definition', ''))}"

    return f"Không tìm thấy thông tin về '{term}'"


# ═══════════════════════════════════════════════════════
# VÍ DỤ 2: Tìm code example
# ═══════════════════════════════════════════════════════

def find_code_examples(reader, keyword: str) -> List[Dict]:
    results = []

    # Ưu tiên docs (official)
    for source in reader.list_doc_sources():
        examples = reader.get_code_examples(source, keyword)
        for ex in examples[:2]:
            results.append({
                "source": f"_docs/{source}",
                "description": ex["description"],
                "code": ex["code"],
                "explanation": ex.get("explanation", "")
            })

    # Thêm từ courses
    for source in reader.list_course_sources():
        examples = reader.get_code_examples(source, keyword)
        for ex in examples[:1]:
            results.append({
                "source": source,
                "description": ex["description"],
                "code": ex["code"],
                "explanation": ex.get("explanation", "")
            })

    return results[:5]


# ═══════════════════════════════════════════════════════
# VÍ DỤ 3: Lấy learning path
# ═══════════════════════════════════════════════════════

def get_learning_path(reader, source: str) -> Dict:
    # TIER 0
    metadata = reader.get_metadata(source)
    sections_idx = reader.get_sections_index(source)

    return {
        "course_name": metadata.get("name_vi"),
        "description": metadata.get("description_vi"),
        "learning_path": metadata.get("learning_path", []),
        "sections": [
            {
                "id": s["id"],
                "title": s.get("title_vi", s.get("title")),
                "key_takeaways": s.get("key_takeaways", [])
            }
            for s in sections_idx
        ]
    }
```

---

## 7. TỐI ƯU TOKEN

### 7.1 Nguyên tắc vàng

```
┌─────────────────────────────────────────────────────────────────┐
│  1. LUÔN bắt đầu từ TIER 0/1, KHÔNG đọc TIER 2 ngay             │
│  2. CHỈ drill-down TIER 2 khi thực sự cần chi tiết              │
│  3. ĐỌC TỐI ĐA 1-2 sources/lần, không load toàn bộ              │
│  4. ƯU TIÊN docs cho API, courses cho tutorial                   │
│  5. CACHE kết quả, tránh đọc lại cùng file                      │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Token budget ước tính

| Tier | File | Tokens ước tính |
|------|------|-----------------|
| TIER 0 | metadata.json | ~200-500 |
| TIER 0 | index.json | ~500-2000 |
| TIER 0 | sections_index.json | ~1000-3000 |
| TIER 1 | aggregated/concepts.json | ~3000-15000 |
| TIER 1 | aggregated/code_examples.json | ~1000-5000 |
| TIER 2 | lessons/lesson_XXX.json | ~2000-8000 |
| TIER 2 | sections/section_XXX.json | ~5000-15000 |

### 7.3 Khi nào drill-down TIER 2

| Cần TIER 2 khi | Không cần TIER 2 khi |
|----------------|----------------------|
| User hỏi "giải thích chi tiết" | Chỉ cần định nghĩa ngắn |
| Cần full code context | Đã có code snippet đủ |
| Cần progression/learning path | Chỉ cần overview |
| Cần example cụ thể | Đã tìm thấy trong TIER 1 |

---

## 8. DANH SÁCH SOURCES

### 8.1 Official Docs (_docs/)

| Source | Pages | Concepts | Nội dung chính |
|--------|-------|----------|----------------|
| langchain | 10 | 68 | LangChain framework |
| langgraph | 6 | 38 | LangGraph orchestration |
| anthropic | 7 | 47 | Claude API, Tool Use |
| openai | 7 | 31 | OpenAI API, Assistants |
| crewai | 8 | 54 | Multi-agent framework |
| autogen | 6 | 39 | Microsoft AutoGen |
| mcp | 6 | 44 | Model Context Protocol |
| google_ai | 6 | 43 | Gemini API |
| llamaindex | 5 | 29 | LlamaIndex framework |
| dspy | 4 | 25 | DSPy framework |
| haystack | 4 | 27 | Haystack framework |
| semantic_kernel | 4 | 27 | Microsoft Semantic Kernel |
| qdrant | 3 | 20 | Qdrant vector DB |
| chroma | 2 | 13 | ChromaDB |
| pinecone | 1 | 8 | Pinecone vector DB |
| weaviate | 1 | 7 | Weaviate vector DB |
| n8n | 3 | 18 | n8n automation |
| prompting_guide | 5 | 32 | Prompting techniques |
| guardrails | 2 | 10 | Guardrails AI |
| huggingface | 3 | 21 | HuggingFace ecosystem |

### 8.2 Courses (24 khóa học)

| Course ID | Lessons | Concepts | Chủ đề chính |
|-----------|---------|----------|--------------|
| langchain | 94 | 747 | LangChain từ cơ bản đến production |
| langgraph | 74 | 600+ | LangGraph workflows |
| ai_engineer_agentic_track... | 150+ | 1000+ | Complete Agent & MCP |
| complete_agentic_ai_bootcamp... | 120+ | 800+ | LangGraph/LangChain |
| 2026_deep_agent_multi_agent_rag... | 180+ | 1200+ | Multi-Agent RAG |

---

## 9. QUICK REFERENCE

### Đọc nhanh - Copy & Paste

```python
# Liệt kê sources
courses = [d.name for d in Path("ai_knowledge_export").iterdir()
           if d.is_dir() and not d.name.startswith("_")]
docs = [d.name for d in Path("ai_knowledge_export/_docs").iterdir() if d.is_dir()]

# Tìm concept
concepts = json.load(open("ai_knowledge_export/langchain/aggregated/concepts.json"))
result = [c for c in concepts["items"] if "agent" in c["term"].lower()]

# Tìm code
examples = json.load(open("ai_knowledge_export/langchain/aggregated/code_examples.json"))
result = [e for e in examples["items"] if "tool" in e["description"].lower()]

# Đọc lesson chi tiết
lesson = json.load(open("ai_knowledge_export/langchain/lessons/lesson_015.json"))

# Đọc section overview
section = json.load(open("ai_knowledge_export/langchain/sections/03_ice_breaker.json"))
```

---

**Tạo bởi**: AI Knowledge System
**Ngày cập nhật**: 2026-01-21