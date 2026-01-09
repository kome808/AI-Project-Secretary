# AI 專案秘書開發經驗分享

> **建立日期**：2026-01-10  
> **適用對象**：前端開發者、全端開發者

---

## 引言

本文分享在開發「AI 專案秘書」過程中遇到的主要技術挑戰與解決方案。這些經驗涵蓋了 React + TypeScript + Supabase 技術棧中常見的陷阱，希望能幫助其他開發者避免類似問題。

---

## 一、Supabase Client 單例問題

### 問題現象

瀏覽器 Console 出現警告：

```
Multiple GoTrueClient instances detected in the same browser context.
It is not an error, but this should be avoided as it may produce
undefined behavior when used concurrently under the same storage key.
```

### 根本原因

多個 React 組件直接呼叫 `StorageFactory.getAdapter()`，導致建立多個 Supabase Client 實例：

```typescript
// ❌ 錯誤：每個組件都直接建立實例
function CRDetail() {
  const loadData = async () => {
    const adapter = StorageFactory.getAdapter(); // 建立實例 #1
  };
  const handleSave = async () => {
    const adapter = StorageFactory.getAdapter(); // 建立實例 #2
  };
}
```

### 解決方案

**使用 React Context 統一管理實例**：

```typescript
// ✅ 正確：從 Context 獲取唯一實例
function CRDetail() {
  const { adapter } = useProject(); // 重用 Context 中的實例
  
  const loadData = async () => {
    const { data } = await adapter.getData();
  };
}
```

### 學到的教訓

> 📌 **外部服務的 Client 必須使用單例模式**，透過 React Context 統一管理，子組件不應直接建立實例。

---

## 二、JSON 解析錯誤處理

### 問題現象

呼叫 AI API 時出現錯誤：

```
SyntaxError: Unexpected end of JSON input
```

### 根本原因

直接對 API 回應呼叫 `.json()` 而沒有檢查：

```typescript
// ❌ 錯誤：沒有檢查回應是否為空
const response = await fetch(url);
const data = await response.json(); // 空回應時會報錯
```

### 解決方案

**分層驗證 + Try-Catch**：

```typescript
// ✅ 正確：完整的錯誤處理
// 1. 先讀取文字
const responseText = await response.text();

// 2. 檢查是否為空
if (!responseText || responseText.trim() === '') {
  throw new Error('API 回傳空的回應');
}

// 3. 安全解析 JSON
let data;
try {
  data = JSON.parse(responseText);
} catch (parseError) {
  console.error('Failed to parse:', responseText);
  throw new Error(`解析失敗: ${parseError.message}`);
}

// 4. 驗證結構
if (!data.choices || !data.choices[0]) {
  throw new Error(`回應格式錯誤: ${JSON.stringify(data)}`);
}
```

### 學到的教訓

> 📌 **永遠不要假設外部 API 會回傳正確格式**。必須檢查空值、驗證結構、處理解析錯誤，並記錄原始回應以利除錯。

---

## 三、UUID 格式相容性問題

### 問題現象

從 Local Storage 切換到 Supabase 後出現錯誤：

```
PostgreSQL Error 22P02: invalid input syntax for type uuid: "proj_nmth_001"
```

### 根本原因

開發階段使用自訂 ID（如 `proj_nmth_001`），但 Supabase 資料庫的 `project_id` 欄位是 UUID 類型，無法接受非 UUID 格式的查詢。

### 解決方案

**動態偵測 ID 格式**：

```typescript
// UUID 正則表達式
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async getItems(projectId: string) {
  const isUUID = UUID_REGEX.test(projectId);
  
  let query = supabase.from('items').select('*');
  
  // 只有 UUID 才加入 where 條件
  if (isUUID) {
    query = query.eq('project_id', projectId);
  }
  
  return await query;
}
```

### 學到的教訓

> 📌 **開發階段的資料格式選擇會影響後續遷移**。建議從一開始就使用標準格式（如 UUID），避免遷移時的相容性問題。

---

## 四、狀態系統遷移

### 問題現象

資料庫有 `status` 欄位的 CHECK 約束，當新增不在約束內的狀態值時會失敗。

### 根本原因

舊版使用多種狀態值（`open`、`done`、`pending` 等），新版統一為標準狀態（`not_started`、`in_progress`、`completed` 等），資料庫約束與程式碼不同步。

### 解決方案

**1. 建立狀態對應表**：

```typescript
const legacyStatusMap: Record<string, string> = {
  'open': 'not_started',
  'active': 'in_progress',
  'done': 'completed',
  'pending': 'awaiting_response',
};

function getStatusLabel(status: string): string {
  if (status in legacyStatusMap) {
    return STATUS_LABELS[legacyStatusMap[status]];
  }
  return STATUS_LABELS[status] || status;
}
```

**2. 更新資料庫約束**：

```sql
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_status_check;
ALTER TABLE items ADD CONSTRAINT items_status_check 
  CHECK (status IN ('not_started', 'in_progress', 'blocked', 
                    'awaiting_response', 'completed', 'suggestion', 'rejected'));
```

### 學到的教訓

> 📌 **狀態系統的變更需要同時更新程式碼和資料庫**。建議使用遷移腳本確保兩端同步，並提供向後相容的對應機制。

---

## 五、環境變數優先順序

### 問題現象

部署到 Vercel 後，使用者仍需手動設定 Supabase 連線資訊。

### 根本原因

程式碼優先讀取 localStorage，環境變數作為後備：

```typescript
// ❌ 錯誤的優先順序
const url = localStorage.getItem('supabase_url') || import.meta.env.VITE_SUPABASE_URL;
```

### 解決方案

**環境變數優先**：

```typescript
// ✅ 正確：環境變數優先（適合部署環境）
const url = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('supabase_url');
```

### 學到的教訓

> 📌 **部署環境的配置應優先於本地設定**。這樣 Vercel 設定的環境變數會自動生效，使用者無需額外配置。

---

## 六、React 組件中的依賴關係刪除

### 問題現象

刪除有子任務的任務時，資料庫報錯外鍵約束違規。

### 解決方案

**刪除前檢查並解除依賴**：

```typescript
async handleDelete(itemId: string) {
  // 1. 檢查是否有子任務
  const { data: children } = await adapter.getItemsByParent(itemId);
  
  // 2. 解除子任務的父子關係
  for (const child of children || []) {
    await adapter.updateItem(child.id, { parent_id: null });
  }
  
  // 3. 執行刪除
  await adapter.deleteItem(itemId);
}
```

### 學到的教訓

> 📌 **處理有關聯的資料刪除時，必須先解除依賴關係**。可以選擇連帶刪除（CASCADE）或解除關聯後刪除。

---

## 七、TypeScript 類型定義

### 問題現象

IDE 顯示大量 `找不到模組 'react'` 等錯誤。

### 根本原因

缺少 Vite 環境變數的類型定義。

### 解決方案

**建立 vite-env.d.ts**：

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

### 學到的教訓

> 📌 **使用環境變數時，務必建立對應的 TypeScript 類型定義**。這能讓 IDE 正確識別並提供自動完成。

---

## 八、AI 對話整合與意圖判斷

### 問題現象

AI 秘書需要判斷使用者意圖（建立任務、查詢資訊等），但初期經常誤判或回覆格式不一致。

### 解決方案

**1. 結構化的意圖分類提示詞**：

```typescript
const INTENT_PROMPT = `
你是專案管理助理，分析使用者輸入並判斷意圖。

## 意圖類型
- CREATE_TASK: 建立新任務
- QUERY_INFO: 查詢專案資訊
- UPDATE_STATUS: 更新任務狀態
- GENERAL_CHAT: 一般閒聊

## 輸出格式（必須是 JSON）
{"intent": "類型", "confidence": 0.0-1.0, "extracted_info": {...}}
`;
```

**2. Few-Shot Examples 強化判斷**：

```typescript
const FEW_SHOT = `
使用者: 明天要交週報
回應: {"intent": "CREATE_TASK", "confidence": 0.9, "extracted_info": {"title": "交週報"}}

使用者: 專案進度如何？
回應: {"intent": "QUERY_INFO", "confidence": 0.95}
`;
```

**3. 回覆格式驗證**：

```typescript
const jsonMatch = content.match(/\{[\s\S]*\}/);
if (!jsonMatch) {
  return { intent: 'GENERAL_CHAT', confidence: 0.5, raw_response: content };
}
```

### 學到的教訓

> 📌 **提示詞設計是迭代過程**。要明確定義輸出格式、提供具體範例、並在程式端做格式驗證。

---

## 九、提示詞管理與動態調整

### 問題現象

頻繁調整提示詞需要改程式碼並重新部署，效率極低。

### 解決方案

**1. 提示詞存儲在資料庫**：

```typescript
interface SystemPrompts {
  wbs_parser: string;           // WBS 解析提示詞
  intent_classification: string; // 意圖分類提示詞
  few_shot_examples: string;     // 範例對話
}
```

**2. 預設值 Fallback 機制**：

```typescript
async getSystemPrompts(projectId: string) {
  const { data } = await supabase.from('system_prompts').select('*').single();
  
  return {
    wbs_parser: data?.wbs_parser?.trim() || WBS_PARSER_PROMPT,  // 資料庫為空時用預設值
    intent_classification: data?.intent_classification?.trim() || INTENT_PROMPT,
  };
}
```

**3. Console Log 追蹤來源**：

```typescript
console.log('📋 使用的 Prompt:', {
  source: data?.wbs_parser ? '資料庫' : '預設值',
  length: finalPrompt.length
});
```

### 學到的教訓

> 📌 **提示詞應該是可配置的**，儲存在資料庫並提供管理介面，同時保留程式碼中的預設值作為 Fallback。

---

## 十、上傳內容分析（Vision API）

### 問題現象

使用者上傳 WBS 圖片後，AI 需要識別並提取任務結構。

### 解決方案

**1. Vision API 整合**：

```typescript
const response = await fetch(edgeFunctionUrl, {
  method: 'POST',
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: WBS_PARSER_PROMPT },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}` }}
      ]
    }]
  })
});
```

**2. 結構化輸出要求**：

```typescript
const WBS_PARSER_PROMPT = `
分析文件並提取任務結構。輸出格式：
{
  "tasks": [
    {"wbs_code": "1.1", "title": "任務標題", "level": 2, "parent_code": "1"}
  ]
}
`;
```

### 學到的教訓

> 📌 **不同格式需要不同處理策略**。Vision API 適合圖片，但要注意 Token 用量。輸出格式必須嚴格定義。

---

## 十一、Embedding 與語意搜尋（RAG）

### 問題現象

使用者想用自然語言搜尋：「之前討論的 API 問題」，但關鍵字搜尋無法處理語意相似性。

### 解決方案

**1. 文字向量化**：

```typescript
async generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(url, {
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text })
  });
  return response.data[0].embedding;  // 1536 維向量
}
```

**2. Supabase + pgvector 語意搜尋**：

```sql
-- 資料庫設定
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE items ADD COLUMN embedding vector(1536);

-- 搜尋函數
CREATE FUNCTION match_items(query_embedding vector(1536), match_count int)
RETURNS TABLE (id uuid, title text, similarity float) AS $$
  SELECT id, title, 1 - (embedding <=> query_embedding) AS similarity
  FROM items
  ORDER BY similarity DESC
  LIMIT match_count;
$$ LANGUAGE sql;
```

### 學到的教訓

> 📌 **RAG 的核心是 Embedding + 向量搜尋**。記得在建立/更新資料時同步更新 Embedding。

---

## 十二、AI API 參數變更

### 問題現象

OpenAI API 突然報錯，原本正常的程式碼失效。

### 根本原因

OpenAI 更新參數：`max_tokens` → `max_completion_tokens`（GPT-4+）。

### 解決方案

```typescript
const requestBody: any = { model, messages, temperature };

if (provider === 'openai' && model.includes('gpt-4')) {
  requestBody.max_completion_tokens = maxTokens;  // 新參數
} else {
  requestBody.max_tokens = maxTokens;  // 舊參數 / Anthropic
}
```

### 學到的教訓

> 📌 **外部 API 會變**。要關注供應商的更新日誌，並封裝 API 呼叫層方便統一調整。

---

## 總結：防禦性程式設計原則

| 原則 | 說明 |
|------|------|
| **永遠檢查外部輸入** | API 回應、使用者輸入都可能是空值或錯誤格式 |
| **分層驗證** | 逐層檢查資料結構，不要一次存取多層屬性 |
| **Try-Catch 包裹解析** | JSON.parse、正則匹配等可能失敗的操作都需包裹 |
| **詳細的錯誤訊息** | 記錄原始資料，方便事後除錯 |
| **單例模式** | 外部服務 Client 只建立一次，透過 Context 共享 |
| **向後相容** | 系統演進時保留舊格式的對應機制 |

---

## 相關文件

- [docs/dev-logs/fixes/](../dev-logs/fixes/) - 所有修復記錄
- [docs/spec/rule_20260109.md](../spec/rule_20260109.md) - 系統規範文件
- [docs/guides/](../guides/) - 使用指南

---

**END OF DOCUMENT**
