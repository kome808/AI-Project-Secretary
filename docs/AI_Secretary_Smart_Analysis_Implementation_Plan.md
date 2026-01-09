# AI 秘書智慧文件分析功能實作計畫

## 目標
實現「向量預過濾 + LLM 精確映射」架構，讓 **任何上傳的文件** 都能自動分析並映射到對應任務，降低 Token 成本並提升準確度。

---

## 支援文件類型與分析策略

| 文件類型 | 分析重點 | 產出項目 |
|----------|----------|----------|
| **會議紀錄** | 決議、待辦、需求變更 | 功能模組、待辦事項、決議記錄 |
| **需求規格書 (SOW)** | 功能範圍、驗收標準 | 功能模組、驗收項目 |
| **合約/報價單** | 範圍、時程、金額 | 專案里程碑、風險項目 |
| **技術文件** | API 規格、資料結構 | 技術待辦、開發任務 |
| **Email/訊息** | 問題回報、請求 | 待辦事項、問題追蹤 |
| **設計稿說明** | UI/UX 變更 | 設計待辦、變更請求 |

---

## 現有架構分析與對齊

> **重要**：以下分析確保新功能與現有程式碼無縫整合，避免重複造輪或衝突。

### 資料庫 Schema 分析

#### 核心資料表（Schema: `aiproject`）

| 資料表 | 關鍵欄位 | 與新功能關聯 |
|--------|----------|--------------|
| **items** | `id`, `project_id`, `type`, `status`, `title`, `description`, `parent_id`, `meta JSONB` | ⚠️ **需新增 `embedding` 欄位** |
| **artifacts** | `id`, `project_id`, `content_type`, `original_content`, `meta` | 文件來源，已有 RAG 支援 |
| **projects** | `id`, `name`, `status` | 專案隔離範圍 |
| **members** | `id`, `project_id`, `name`, `role` | 負責人指派 |

#### 向量搜尋相關（Schema: `public`）

| 資料表/函數 | 結構 | 狀態 |
|-------------|------|------|
| **embeddings** | `project_id`, `source_id`, `source_type` ('item'\|'artifact'), `content`, `metadata JSONB`, `embedding vector(1536)` | ✅ 已存在 |
| **match_documents()** | 對 `embeddings` 表進行 cosine 相似度搜尋 | ✅ 已存在 |

> **警告**：目前 `embeddings.source_type` 已支援 `'item'`，但 **前端從未對 items 呼叫 embedContent()**。新功能需在 item 建立/更新時自動嵌入。

#### Item 狀態流轉與 meta 結構

```typescript
// types.ts 現有定義
ItemStatus: 'suggestion' | 'rejected' | 'not_started' | 'in_progress' | 'blocked' | 'awaiting_response' | 'completed'
ItemType: 'general' | 'pending' | 'cr' | 'decision' | 'action' | 'rule' | 'todo'

// meta 常用欄位
item.meta.isFeatureModule: boolean   // 標記為功能模組
item.meta.isWorkPackage: boolean     // 標記為專案工作
item.meta.order: number              // 排序權重
item.meta.confidence?: number        // AI 信心分數
```

### 已存在的關鍵元件

| 元件 | 位置 | 可複用性 |
|------|------|----------|
| `SupabaseAdapter.embedContent()` | storage/SupabaseAdapter.ts:248 | ✅ 可擴展支援任務嵌入 |
| `SupabaseAdapter.queryKnowledgeBase()` | storage/SupabaseAdapter.ts:303 | ⚠️ 需新增 `matchTasks()` |
| `useDashboardAI.processSmartAnalysis()` | dashboard/hooks/useDashboardAI.ts:285 | ✅ 已有專案結構注入 |
| `useInbox.confirmItem()` | inbox/hooks/useInbox.ts:104 | ✅ 可複用確認流程 |
| `useInbox.batchConfirm()` | inbox/hooks/useInbox.ts:216 | ✅ 可複用批次確認 |
| Edge Function `/embed` | rag-platform/index.ts:54 | ✅ 使用 `text-embedding-3-small` |
| Edge Function `/query` | rag-platform/index.ts:99 | ✅ 呼叫 `match_documents` RPC |

### 需要修改的現有檔案

| 檔案 | 修改類型 | 說明 |
|------|----------|------|
| `src/lib/storage/SupabaseAdapter.ts` | 新增方法 | `embedTask()`, `matchTasks()` |
| `src/features/dashboard/hooks/useDashboardAI.ts` | 重構 | 擴展 `processSmartAnalysis` 使用向量預過濾 |
| `src/lib/storage/types.ts` | 新增型別 | `DocumentAnalysisResult`, `AnalysisChunk` |
| `supabase/functions/rag-platform/index.ts` | 新增路由 | `/embed-task` 端點 |

### 需要新建的檔案

| 檔案 | 用途 |
|------|------|
| `src/features/dashboard/hooks/useDocumentAnalysis.ts` | 文件分析核心 Hook |
| `src/features/dashboard/components/DocumentAnalysisReport.tsx` | 審核介面 |
| `docs/sql/add_item_embedding.sql` | 資料庫遷移腳本 |

### ⚠️ 潛在衝突與解決方案

| 衝突點 | 說明 | 解決方案 |
|--------|------|----------|
| **Schema 不一致** | `embeddings` 在 `public`，`items` 在 `aiproject` | 使用跨 Schema RPC 或保持現有 `embedContent` 邏輯 |
| **source_type 重複** | `embedContent` 已用 `'item'`，但從未呼叫 | 複用現有欄位，無需新增 |
| **向量維度** | Edge Function 用 `text-embedding-3-small` (1536維) | SQL 保持 `vector(1536)` 一致 |
| **Status 衝突** | 新分析結果需進入收件匣 | 使用現有 `'suggestion'` 狀態 |

---

## 架構流程圖

```
            ┌─────────────────┐
            │  上傳任意文件    │
            └────────┬────────┘
                     ▼
            ┌─────────────────┐
            │  文件類型識別    │
            └────────┬────────┘
                     ▼
            ┌─────────────────┐
            │  選擇分析策略    │
            └────────┬────────┘
                     ▼
            ┌─────────────────┐
            │    語義切片      │
            └────────┬────────┘
                     ▼
        ┌────────────────────────┐
        │     對每個 Chunk       │
        └────────────┬───────────┘
                     ▼
            ┌─────────────────┐
            │ 向量搜尋 (Top 3) │  ← Token = 0
            └────────┬────────┘
                     ▼
            ┌─────────────────┐
            │  LLM 精確映射    │  ← Token 極低
            └────────┬────────┘
                     ▼
            ┌─────────────────┐
            │   智慧分類       │
            └────────┬────────┘
                     ▼
            ┌─────────────────┐
            │  分析報告預覽    │
            └────────┬────────┘
                     ▼
            ┌─────────────────┐
            │    PM 審核      │
            └───┬─────────┬───┘
                │         │
         確認   ▼         ▼  修改
    ┌───────────────┐     │
    │批次建立/更新   │     │
    │    任務       │◄────┘
    └───────────────┘
```

---

## Phase 1: 資料庫擴展

### SQL 遷移腳本

```sql
-- 1. 新增 items.embedding 欄位
ALTER TABLE aiproject.items 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- 2. 建立向量索引
CREATE INDEX IF NOT EXISTS items_embedding_idx 
ON aiproject.items 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 3. 建立 match_tasks RPC
CREATE OR REPLACE FUNCTION aiproject.match_tasks(
  query_embedding vector(1536),
  project_id uuid DEFAULT NULL,
  match_count int DEFAULT 5,
  match_threshold float DEFAULT 0.3
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  type text,
  is_feature_module boolean,
  similarity float
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.title,
    i.description,
    i.type,
    COALESCE((i.meta->>'isFeatureModule')::boolean, false) as is_feature_module,
    1 - (i.embedding <=> query_embedding) as similarity
  FROM aiproject.items i
  WHERE i.embedding IS NOT NULL
    AND (project_id IS NULL OR i.project_id = project_id)
    AND 1 - (i.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- 4. 授權
GRANT EXECUTE ON FUNCTION aiproject.match_tasks TO authenticated, anon, service_role;
```

---

## Phase 2: 任務向量化

### Edge Function 擴展

在 `rag-platform/index.ts` 新增 `/embed-task` 端點，在任務建立/更新時自動向量化。

---

## Phase 3: 智慧文件分析流程

### 文件類型自動識別

```typescript
type DocumentType = 
  | 'meeting_notes'      // 會議紀錄
  | 'requirements'       // 需求規格
  | 'contract'           // 合約文件
  | 'technical'          // 技術文件
  | 'communication'      // Email/訊息
  | 'design'             // 設計文件
  | 'general';           // 一般文件

// 由 LLM 根據內容前 500 字判斷文件類型
async function detectDocumentType(content: string): Promise<DocumentType> {
  const prompt = `
    分析以下文件的前 500 字，判斷其類型：
    ${content.substring(0, 500)}
    
    回傳以下其中一種類型：
    meeting_notes, requirements, contract, technical, communication, design, general
  `;
  // ...
}
```

### 分類策略表

```typescript
const ANALYSIS_STRATEGIES: Record<DocumentType, AnalysisStrategy> = {
  meeting_notes: {
    extractCategories: ['feature_module', 'action_item', 'decision', 'change_request'],
    promptTemplate: MEETING_PROMPT,
  },
  requirements: {
    extractCategories: ['feature_module', 'acceptance_criteria', 'constraint'],
    promptTemplate: REQUIREMENTS_PROMPT,
  },
  contract: {
    extractCategories: ['milestone', 'deliverable', 'risk'],
    promptTemplate: CONTRACT_PROMPT,
  },
  technical: {
    extractCategories: ['dev_task', 'api_spec', 'data_schema'],
    promptTemplate: TECHNICAL_PROMPT,
  },
  // ...
};
```

### 核心 Hook

新建 `src/features/dashboard/hooks/useDocumentAnalysis.ts`：

```typescript
interface AnalysisChunk {
  id: string;
  originalText: string;
  sourceLocation: string;  // 例如："第 3 頁" 或 "段落 2.2"
  candidateTasks: MatchedTask[];
  mappingResult?: {
    action: 'map_existing' | 'create_new' | 'append_spec';
    targetTaskId: string | null;
    extractedContent: string;
    category: string;
    confidence: number;
  };
}

export function useDocumentAnalysis() {
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<DocumentAnalysisResult | null>(null);
  
  const analyzeDocument = async (
    content: string, 
    projectId: string,
    documentType?: DocumentType
  ) => {
    setAnalyzing(true);
    
    // Step 1: 偵測文件類型
    const detectedType = documentType || await detectDocumentType(content);
    const strategy = ANALYSIS_STRATEGIES[detectedType];
    
    // Step 2: 語義切片
    const chunks = await semanticChunking(content);
    setProgress(10);
    
    // Step 3: 批次處理每個 Chunk
    const analysisChunks: AnalysisChunk[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // 3a. 向量搜尋候選任務
      const candidates = await storage.matchTasks(chunk.text, projectId);
      
      // 3b. LLM 精確映射
      const mappingResult = await performLLMMapping(
        chunk.text, 
        candidates, 
        strategy.promptTemplate
      );
      
      analysisChunks.push({
        id: crypto.randomUUID(),
        originalText: chunk.text,
        sourceLocation: chunk.location,
        candidateTasks: candidates,
        mappingResult,
      });
      
      setProgress(10 + (i / chunks.length) * 80);
    }
    
    setResult({ 
      documentType: detectedType,
      chunks: analysisChunks, 
      summary: calculateSummary(analysisChunks) 
    });
    setProgress(100);
    setAnalyzing(false);
  };
  
  return { analyzing, progress, result, analyzeDocument };
}
```

---

## Phase 4: 審核介面

### UI 設計

新建 `src/features/dashboard/components/DocumentAnalysisReport.tsx`：

**佈局結構：**
```
┌─────────────────────────────────────────────────────────┐
│  📄 文件分析報告                                         │
│  類型: 會議紀錄 | 來源: 20260107會議.pdf                  │
├─────────────────────────────────────────────────────────┤
│  📊 分析摘要                                             │
│  ┌────────┬────────┬────────┬────────┐                  │
│  │  🧩 5  │  ✅ 3  │  📌 2  │  ⚠️ 1  │                  │
│  │功能模組│待辦事項│決議事項│變更請求│                  │
│  └────────┴────────┴────────┴────────┘                  │
├─────────────────────────────────────────────────────────┤
│  建議動作:                                               │
│  ┌─────────────────────────────────────────────────┐    │
│  │ 🔗 映射到現有任務 (3)                            │    │
│  │ ➕ 建議新建任務 (5)                              │    │
│  │ 📝 附加規格到現有任務 (2)                        │    │
│  └─────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────┤
│  詳細項目列表 (可展開/收合)                              │
│  ...                                                    │
├─────────────────────────────────────────────────────────┤
│  [全選] [取消全選]              [確認執行 (10 項)]      │
└─────────────────────────────────────────────────────────┘
```

### 整合到現有流程

在 `CreateSourceDialog` 上傳文件後，觸發智慧分析：

```typescript
// CreateSourceDialog.tsx
const handleUploadComplete = async (artifact: Artifact) => {
  // 原有的 RAG 嵌入流程...
  
  // 新增：詢問是否進行智慧分析
  if (await confirmAnalysis()) {
    setShowAnalysisDialog(true);
    await analyzeDocument(parsedContent, currentProject.id);
  }
};
```

---

## Phase 5: 測試與優化

### 測試案例

| 測試場景 | 文件類型 | 預期結果 |
|----------|----------|----------|
| 單一功能會議 | 會議紀錄 | 識別 1 個功能模組 |
| 完整專案會議 | 會議紀錄 | 混合多種類別 |
| SOW 文件 | 需求規格 | 識別功能範圍與驗收標準 |
| API 文件 | 技術文件 | 識別開發任務 |
| 無關文件 | 一般文件 | 提示「無可映射內容」 |

---

## 時程估算

| 階段 | 預估工時 | 依賴 |
|------|----------|------|
| Phase 1: 資料庫擴展 | 2 小時 | 無 |
| Phase 2: 任務向量化 | 4 小時 | Phase 1 |
| Phase 3: 智慧文件分析 | 8 小時 | Phase 2 |
| Phase 4: 審核介面 | 8 小時 | Phase 3 |
| Phase 5: 測試優化 | 4 小時 | Phase 4 |

**總計：約 26 小時**

---

## 風險與緩解

| 風險 | 緩解措施 |
|------|----------|
| 文件類型判斷錯誤 | 允許 PM 手動修正文件類型 |
| 向量索引效能 | 使用 IVFFlat 索引，分專案建索引 |
| LLM 判斷不準確 | 提供修改介面，收集反饋優化 Prompt |
| 大文件處理超時 | 異步處理 + 進度條 + 通知 |

---

## 技術細節深挖（回應 UX 審查）

### 1. 語義切片品質 - 結構感知切片

> **問題**：如果文件很大，AI 是怎麼切段的？是硬生生每 500 字切一段，還是「依標題」切？

**解決方案：採用混合切片策略**

```typescript
// 結構感知切片 (Structure-aware Chunking)
async function semanticChunking(content: string, docType: DocumentType): Promise<Chunk[]> {
  // 1. 會議紀錄/規格書：優先依標題切割
  if (docType === 'meeting_notes' || docType === 'requirements') {
    // 偵測標題模式：1.1, 2.2, 一、, (一), ■, ● 等
    const titlePatterns = [
      /^(\d+\.)+\s+/gm,           // 1.1, 2.3.1
      /^[一二三四五六七八九十]+、/gm,  // 一、二、
      /^[\(（][一二三四五六七八九十\d]+[\)）]/gm, // (一), （1）
      /^[■●◆▪]\s*/gm,            // ■, ●
    ];
    
    // 依標題分割，保留標題作為 chunk 開頭
    return splitByTitles(content, titlePatterns);
  }
  
  // 2. 其他文件：使用 RecursiveCharacterTextSplitter
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1500,
    chunkOverlap: 200,
    separators: ['\n\n', '\n', '。', '；', ' '], // 優先在段落處切割
  });
  
  return splitter.splitText(content);
}
```

### 2. 多重映射支援

> **問題**：如果某段話同時影響「前端 UI」和「後端 API」，系統支援同時映射到兩個任務嗎？

**解決方案：擴展 mappingResult 支援多目標**

```typescript
interface MappingResult {
  // 改為陣列，支援多重映射
  targets: {
    taskId: string;
    action: 'map_existing' | 'create_new' | 'append_spec';
    relevance: number; // 0-1，與該任務的相關程度
  }[];
  extractedContent: string;
  category: string;
  confidence: number;
}

// LLM Prompt 調整
const MULTI_MAPPING_PROMPT = `
如果這段內容同時與多個任務相關，請列出所有相關任務：
{
  "targets": [
    { "taskId": "uuid-1", "action": "append_spec", "relevance": 0.9 },
    { "taskId": "uuid-2", "action": "append_spec", "relevance": 0.7 }
  ]
}
`;
```

### 3. 向量同步即時性

> **問題**：當 PM 剛手動改完一個任務標題，AI 秘書立刻能感知到嗎？

**解決方案：三層同步機制**

```typescript
// 方案 A：前端即時同步（推薦）
// 在 SupabaseAdapter.updateItem() 中加入 embedTask 呼叫
async updateItem(id: string, updates: Partial<Item>): Promise<StorageResponse<Item>> {
  const result = await this.supabase
    .schema(schemaName)
    .from('items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  // 標題或描述變更時，重新向量化（非阻塞）
  if (updates.title || updates.description) {
    this.embedTask(id).catch(console.error); // Fire-and-forget
  }
  
  return result;
}

// 方案 B：Supabase Database Trigger（保底）
// CREATE OR REPLACE FUNCTION aiproject.embed_item_on_update()
// RETURNS TRIGGER AS $$
// BEGIN
//   PERFORM http_post('edge-function-url/embed-task', ...);
//   RETURN NEW;
// END;
// $$ LANGUAGE plpgsql;
```

### 4. 低信心度視覺警示

> **問題**：如果 AI 映射信心度很低，介面會不會用紅字提醒？

**解決方案：信心度分級顯示**

```tsx
// DocumentAnalysisReport.tsx
function ConfidenceBadge({ score }: { score: number }) {
  if (score >= 0.8) {
    return <Badge variant="success">高信心度 ✓</Badge>;
  } else if (score >= 0.5) {
    return <Badge variant="warning">中等信心度 ⚠</Badge>;
  } else {
    return (
      <Badge variant="destructive">
        低信心度 ⚠ 請人工檢查
      </Badge>
    );
  }
}
```

### 5. 來源連結與頁碼定位

> **問題**：能不能自動插入超連結，讓 PM 點擊後直接跳轉到 PDF 的那一段？

**解決方案：在 meta 中記錄來源位置**

```typescript
interface SourceCitation {
  artifactId: string;
  fileName: string;
  pageNumber?: number;     // PDF 頁碼
  sectionTitle?: string;   // 章節標題
  snippetText: string;     // 原文摘錄（前 100 字）
}

// 寫入任務時附加來源
await storage.updateItem(taskId, {
  meta: {
    ...existingMeta,
    sourceCitations: [
      ...existingCitations,
      {
        artifactId: 'uuid',
        fileName: '20260107會議.pdf',
        pageNumber: 3,
        sectionTitle: '2.2 入藏審議',
        snippetText: '審議會議需上傳 PDF 並包含外部委員...',
      }
    ]
  }
});
```

### 6. 重複上傳去重機制

> **問題**：同一份會議紀錄上傳兩次，會不會重複產出待辦事項？

**解決方案：基於 file_hash 檔案去重**

```typescript
// 上傳前檢查
async function checkDuplicateArtifact(fileHash: string, projectId: string): Promise<boolean> {
  const { data } = await supabase
    .from('artifacts')
    .select('id')
    .eq('project_id', projectId)
    .eq('file_hash', fileHash)
    .single();
  
  return !!data;
}

// 若重複，提示使用者
if (await checkDuplicateArtifact(hash, projectId)) {
  toast.warning('此檔案已上傳過，是否仍要重新分析？', {
    action: { label: '重新分析', onClick: () => proceedAnalysis() },
  });
  return;
}
```

### 7. AI 學習反饋機制

> **建議**：如果 PM 糾正了 AI 映射，記錄下來優化 Prompt。

**解決方案：新增 feedback 表**

```sql
-- 新增反饋記錄表
CREATE TABLE IF NOT EXISTS aiproject.ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES aiproject.projects(id),
  artifact_id UUID REFERENCES aiproject.artifacts(id),
  chunk_text TEXT,
  original_mapping JSONB,   -- AI 原本建議
  corrected_mapping JSONB,  -- PM 糾正後
  feedback_type TEXT CHECK (feedback_type IN ('incorrect_target', 'missing_target', 'wrong_category')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 未來可用於：
-- 1. 分析常見錯誤模式
-- 2. 微調 Prompt 或 Few-shot Examples
-- 3. 專案特定詞彙學習
```

---

## 更新後的時程估算

| 階段 | 預估工時 | 依賴 | 新增項目 |
|------|----------|------|----------|
| Phase 1: 資料庫擴展 | 3 小時 | 無 | +1h: feedback 表 |
| Phase 2: 任務向量化 | 5 小時 | Phase 1 | +1h: 即時同步機制 |
| Phase 3: 智慧文件分析 | 10 小時 | Phase 2 | +2h: 結構感知切片、多重映射 |
| Phase 4: 審核介面 | 10 小時 | Phase 3 | +2h: 信心度顯示、來源連結、去重提示 |
| Phase 5: 測試優化 | 4 小時 | Phase 4 | - |

**更新後總計：約 32 小時**
