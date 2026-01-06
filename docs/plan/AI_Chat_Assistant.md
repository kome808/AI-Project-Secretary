# AI 秘書對話功能規劃

## 1. 模組概述

### 1.1 功能定位
實作「虛擬專案秘書」的對話互動能力，讓使用者透過自然語言與 AI 互動：
- **處理輸入**：整理會議記錄、LINE/Email 內容為建議卡
- **專案查詢**：透過 RAG 搜尋專案記憶（決議、任務、變更）
- **智慧提問**：當資訊不足時主動追問（負責人、期限、關聯專案工作）

### 1.2 目標使用者
- **一般成員**：快速貼上訊息，讓 AI 整理成待辦
- **PM**：詢問專案狀態、查詢歷史決議、追蹤變更進度
- **所有角色**：避免手動輸入表單，用對話驅動工作流

### 1.3 核心價值
- 降低認知負擔：不需學習複雜表單，直接貼上即可
- 保持專案記憶：所有建議必須附 Citation，可溯源
- 主動提示：AI 主動追問缺失資訊（指派人、期限、風險評估）

---

## 2. 功能清單

### 2.1 對話輸入（已部分實作）
- [x] 浮動對話按鈕（ChatFloatingPanel）
- [x] 文字輸入 + 檔案上傳
- [x] 產生建議卡（suggestion status）
- [ ] **新增：對話歷史記錄**（Session Management）
- [ ] **新增：上下文理解**（Context Window）

### 2.2 意圖路由（Intent Routing）
AI 需判斷使用者輸入屬於以下哪種意圖：

| 意圖類型 | 說明 | 範例輸入 | AI 行為 |
|---------|------|---------|---------|
| **CREATE** | 建立新項目 | 「客戶要求週五前開通權限」 | 產生建議卡 → Inbox |
| **QUERY** | 查詢專案資訊 | 「上次決議登入方式是什麼？」 | RAG 搜尋 → 回覆 + Citation |
| **UPDATE** | 更新現有項目 | 「把『開發登入頁』改成高優先度」 | 產生更新提案 → Inbox 確認 |
| **RELATE** | 建立關聯 | 「這個 bug 跟 CR-123 有關」 | 產生關聯提案 → Inbox 確認 |
| **CLARIFY** | 需要追問 | 「整理成待辦」（缺少負責人） | 回傳追問清單 + 暫存草稿 |

### 2.3 RAG 搜尋（Project Memory）
- [ ] 搜尋所有 Artifacts（來源文件）
- [ ] 搜尋已入庫的 Items（任務、決議、變更）
- [ ] 回傳結果附 Citation（可點擊回到原始內容）
- [ ] 支援兩種模式：
  - **Search**：列出相關片段（優先）
  - **Answer**：摘要回答（必附 Citation）

### 2.4 對話持久化
- [ ] 儲存對話歷史（新增 `conversations` 表）
- [ ] 每個 Conversation 包含多個 Messages
- [ ] Message 類型：user / assistant / system
- [ ] 每個 Message 可關聯多個 Citations

---

## 3. 重要規則與限制 🔥

### 3.1 資料驗證

#### AI 輸出格式驗證
- **必要欄位**：
  - `intent` (string)：CREATE / QUERY / UPDATE / RELATE / CLARIFY
  - `confidence` (number)：0-1 之間，建議 > 0.5 才執行
  - `suggestions` (array)：建議項目列表
  - `clarifications` (array)：追問清單（若 intent = CLARIFY）

#### 建議卡驗證
- 每張建議卡必須包含：
  - `type` (ItemType)：action / pending / decision / cr
  - `title` (string)：不可為空，最多 200 字
  - `description` (string)：可選，最多 2000 字
  - `source_artifact_id` (uuid)：必須存在且有效
  - `confidence` (number)：0-1 之間

#### Citation 驗證
- Citation 必須包含：
  - `artifact_id` (uuid)：來源 Artifact ID
  - `text` (string)：引用片段（最多 500 字）
  - `start_pos` / `end_pos` (number)：原文位置（可選）

### 3.2 操作限制

#### 自動入庫限制
- ❌ **禁止**：AI 直接寫入最終資料（違反 SSOT 原則）
- ✅ **允許**：AI 產生建議卡（status = 'suggestion'）→ 人工 Confirm

#### 對話次數限制
- 單次對話最多 10 輪（避免無限追問）
- 超過限制後提示：「請先確認前述建議，再開啟新對話」

#### 上下文視窗限制
- 僅提供「當前專案」資料（不跨專案）
- 提供「最近 30 天」活動（避免上下文過長）
- 提供「當前專案成員」列表（用於指派建議）

#### RAG 搜尋限制
- 一次最多回傳 10 筆結果
- 每筆結果附 3 行上下文
- 超過 10 筆顯示：「顯示前 10 筆，縮小搜尋範圍以獲得更精確結果」

### 3.3 顯示規則

#### 對話氣泡樣式
- **使用者訊息**：右側對齊，背景色 `bg-primary/10`
- **AI 回覆**：左側對齊，背景色 `bg-muted`
- **系統訊息**：中央對齊，背景色 `bg-amber-50/50`，文字 `text-amber-900`

#### Citation 顯示
- 每個 Citation 以「卡片樣式」顯示
- 滑鼠 hover 顯示完整來源文字
- 點擊可跳轉到 Artifact 詳情頁

#### 載入狀態
- 顯示「AI 正在思考...」+ 動畫 Loader
- 預估時間：「約需 3-5 秒」

### 3.4 權限控制

#### 對話存取權限
- **一般成員**：僅能查看自己的對話歷史
- **PM**：可查看專案內所有成員的對話（稽核用途）
- **Admin**：可查看全系統對話（用量分析）

#### 功能解鎖
- **Local Phase**：AI 功能完全禁用（顯示提示：「請連線 Supabase 並設定 AI Key」）
- **Supabase Phase 未設定 Key**：顯示「前往設定 AI Key」按鈕
- **Supabase Phase 已設定 Key**：完整功能啟用

---

## 4. 介面互動與流程

### 4.1 主要對話流程

#### 流程 A：整理輸入（CREATE）

```
使用者：貼上「客戶要求週五前開通測試環境權限」
  ↓
AI 判斷：intent = CREATE, type = action
  ↓
AI 輸出：
  - 建議標題：「開通客戶測試環境存取權限」
  - 建議負責人：@工程師（根據歷史記錄推測）
  - 建議期限：本週五 17:00
  - 追問：「是否需要關聯到『客戶驗收』專案工作？」
  ↓
使用者：確認
  ↓
系統：建立 suggestion → 進入 Inbox
```

#### 流程 B：查詢記憶（QUERY）

```
使用者：「上次決議登入方式是什麼？」
  ↓
AI 判斷：intent = QUERY
  ↓
RAG 搜尋：
  - 搜尋範圍：decisions + artifacts
  - 關鍵字：「登入方式」、「決議」
  ↓
AI 回覆：
  「根據 2024-12-15 的決議記錄 [D-123]，
   登入方式改為『OAuth 2.0 + Google SSO』，
   放棄原本的帳密登入方式。」
  
  附 Citation：
  - [D-123] 決議：登入方式改採 OAuth
  - [ART-456] 會議記錄：「PM 確認使用 Google SSO」
  ↓
使用者：點擊 Citation → 跳轉到決議詳情頁
```

#### 流程 C：資訊不足追問（CLARIFY）

```
使用者：「整理成待辦」（僅輸入這句話）
  ↓
AI 判斷：intent = CLARIFY（缺少具體內容）
  ↓
AI 回覆：
  「請提供更多資訊，我會幫你整理成待辦：
   1. 要做什麼事？（例如：開發登入頁、修復 Bug）
   2. 指派給誰？（可選，預設為你自己）
   3. 什麼時候要完成？（可選，我會建議合理期限）」
  ↓
使用者：「開發登入頁，給小明，下週三前」
  ↓
AI 重新判斷：intent = CREATE → 產生建議卡
```

### 4.2 對話視窗 UI（ChatPanel Component）

#### 視窗結構

```
┌─────────────────────────────────────────┐
│ [X] AI 專案秘書                     [最小化] │ ← Header
├─────────────────────────────────────────┤
│                                         │
│  ┌────────────────────────────────┐    │ ← 系統提示
│  │ 💡 提示：你可以貼上會議記錄、    │    │
│  │    LINE 訊息，或直接問問題      │    │
│  └────────────────────────────────┘    │
│                                         │
│  [AI 回覆氣泡]                           │ ← 對話歷史
│  「我已經幫你整理成 3 張建議卡...」        │   (可捲動區域)
│                                         │
│        [使用者輸入氣泡]                   │
│        「客戶要求週五前開通權限」          │
│                                         │
│  [AI 回覆氣泡 + Citation 卡片]           │
│  「已產生建議卡：開通測試環境權限          │
│   📎 引用來源：[客戶訊息 12/20 14:30]」   │
│                                         │
├─────────────────────────────────────────┤
│ [整理待辦] [找決議] [抓變更] [查資料]     │ ← Prompt Chips
├─────────────────────────────────────────┤
│ [📎] [輸入文字或貼上內容...]      [送出]  │ ← 輸入區
└─────────────────────────────────────────┘
```

#### 互動細節

1. **開啟對話**：點擊右下角浮動按鈕
2. **輸入方式**：
   - 直接輸入文字
   - 貼上長文（會議記錄、Email）
   - 上傳檔案（圖片、PDF、Excel）
   - 點擊 Prompt Chip 快速輸入
3. **傳送訊息**：點擊「送出」或按 `Cmd/Ctrl + Enter`
4. **查看回覆**：
   - AI 回覆顯示「正在思考...」動畫
   - 回覆完成後顯示內容 + Citation（若有）
   - 若有建議卡，顯示「前往 Inbox 確認 →」連結
5. **關閉對話**：點擊 [X] 或最小化按鈕

### 4.3 Prompt Chips（快速操作）

| Chip 文字 | 預設輸入內容 | 說明 |
|----------|------------|------|
| 整理待辦 | 「請幫我把以下內容整理成待辦項目，並建議負責人與期限」 | 適合貼上會議記錄 |
| 找決議 | 「查詢關於 [關鍵字] 的決議記錄」 | RAG 搜尋決議 |
| 抓變更 | 「判斷以下內容是否為需求變更，並評估風險等級」 | 識別 CR |
| 查資料 | 「搜尋專案中關於 [關鍵字] 的所有相關資料」 | 全文搜尋 |
| 解析 WBS | 「將以下內容解析為專案工作骨架（WBS）」 | 建立 Project Work |

---

## 5. 資料欄位定義（Business View）

### 5.1 Conversation（對話會話）

| 欄位名稱 | 欄位含義 | 資料格式範例 | 備註/限制 |
|---------|---------|------------|----------|
| id | 會話唯一識別碼 | `uuid` | 自動產生 |
| project_id | 所屬專案 | `uuid` | 必填 |
| user_id | 發起使用者 | `uuid` | 必填 |
| title | 會話標題 | 「查詢登入方式決議」 | 自動產生或使用者命名 |
| status | 會話狀態 | `active` / `archived` | 預設 active |
| created_at | 建立時間 | `2024-12-23T10:30:00Z` | 自動產生 |
| updated_at | 最後訊息時間 | `2024-12-23T10:35:00Z` | 自動更新 |

### 5.2 Message（對話訊息）

| 欄位名稱 | 欄位含義 | 資料格式範例 | 備註/限制 |
|---------|---------|------------|----------|
| id | 訊息唯一識別碼 | `uuid` | 自動產生 |
| conversation_id | 所屬會話 | `uuid` | 必填，外鍵 |
| role | 訊息角色 | `user` / `assistant` / `system` | 必填 |
| content | 訊息內容 | 「請幫我整理成待辦...」 | 必填，最多 10000 字 |
| intent | AI 判斷的意圖 | `CREATE` / `QUERY` / `UPDATE` | 僅 assistant 訊息有 |
| confidence | 意圖信心分數 | `0.85` | 0-1 之間 |
| citations | 引用來源列表 | `[{artifact_id, text}]` | JSON 格式 |
| created_at | 訊息時間 | `2024-12-23T10:30:15Z` | 自動產生 |

### 5.3 AI Response Structure（AI 回應結構）

```typescript
interface AIResponse {
  intent: 'CREATE' | 'QUERY' | 'UPDATE' | 'RELATE' | 'CLARIFY';
  confidence: number; // 0-1
  message: string; // 給使用者的回覆文字
  
  // 若 intent = CREATE/UPDATE/RELATE
  suggestions?: SuggestionDraft[];
  
  // 若 intent = QUERY
  searchResults?: {
    items: Item[];
    artifacts: Artifact[];
    summary: string;
  };
  
  // 若 intent = CLARIFY
  clarifications?: {
    question: string;
    options?: string[]; // 可選的選項（例如：成員列表）
  }[];
  
  // Citation（所有 intent 都可能有）
  citations: {
    artifact_id: string;
    item_id?: string;
    text: string;
    start_pos?: number;
    end_pos?: number;
  }[];
}
```

---

## 6. 資料流向

### 6.1 對話輸入 → AI 處理 → Inbox

```
1. 使用者輸入（Input）：
   - 文字內容（ChatPanel Input）
   - 當前專案 ID
   - 當前使用者 ID

2. 前端處理（Process）：
   - 建立 Conversation（如果是新對話）
   - 建立 Message (role: user)
   - 呼叫 AI API（透過 Edge Function）

3. AI 處理（AI API）：
   - 讀取專案上下文（最近 30 天資料）
   - 讀取對話歷史（最近 10 則訊息）
   - 意圖判斷（Intent Routing）
   - 產生回應（AIResponse）

4. 後端回傳（Output）：
   - 建立 Message (role: assistant)
   - 若有建議卡：建立 Items (status: suggestion)
   - 若有 Citation：記錄關聯
   - 回傳給前端顯示

5. 前端顯示（UI Update）：
   - 顯示 AI 回覆氣泡
   - 若有建議卡：顯示「前往 Inbox 確認」按鈕
   - 若有 Citation：顯示引用卡片（可點擊）
```

### 6.2 RAG 搜尋流程

```
1. 使用者輸入查詢（Input）：
   「上次決議登入方式是什麼？」

2. AI 判斷意圖（Process）：
   intent = QUERY

3. RAG 搜尋（Search）：
   a. 向量化查詢文字（Embedding）
   b. 搜尋 Artifacts 表（type: text/file）
   c. 搜尋 Items 表（type: decision）
   d. 計算相似度分數（Similarity Score）
   e. 排序並取前 10 筆

4. AI 摘要回答（Summarize）：
   - 根據搜尋結果產生摘要
   - 附上 Citation（點擊可跳轉）

5. 回傳結果（Output）：
   - 顯示摘要回答
   - 列出 Citation 卡片
   - 提供「查看更多結果」按鈕
```

---

## 7. 測試案例（Test Cases）

### TC-01：成功整理會議記錄為建議卡

| ID | 測試場景 | 操作步驟 | 預期結果 |
|----|---------|---------|---------|
| TC-01 | 貼上會議記錄，AI 整理成 3 張建議卡 | 1. 點擊對話按鈕<br>2. 貼上「會議記錄：1) 小明開發登入頁 2) 小華修 Bug 3) 決議用 OAuth」<br>3. 點擊送出 | AI 回覆：<br>- 已產生 3 張建議卡<br>- 2 張 action<br>- 1 張 decision<br>- 顯示「前往 Inbox 確認」按鈕 |

### TC-02：查詢決議（RAG 搜尋）

| ID | 測試場景 | 操作步驟 | 預期結果 |
|----|---------|---------|---------|
| TC-02 | 查詢歷史決議記錄 | 1. 輸入「上次決議登入方式是什麼？」<br>2. 點擊送出 | AI 回覆：<br>- 顯示決議內容摘要<br>- 附 Citation 卡片（可點擊）<br>- 點擊後跳轉到 Decision 詳情頁 |

### TC-03：資訊不足追問

| ID | 測試場景 | 操作步驟 | 預期結果 |
|----|---------|---------|---------|
| TC-03 | 使用者輸入模糊指令 | 1. 輸入「整理成待辦」<br>2. 點擊送出 | AI 回覆：<br>- 顯示追問清單<br>- 「要做什麼事？」<br>- 「指派給誰？」<br>- 「期限是？」 |

### TC-04：Local Phase 禁用 AI

| ID | 測試場景 | 操作步驟 | 預期結果 |
|----|---------|---------|---------|
| TC-04 | 在 Local Phase 嘗試使用 AI | 1. 未連接 Supabase<br>2. 點擊對話按鈕<br>3. 輸入文字 | 顯示提示：<br>- 「AI 功能需要連接 Supabase」<br>- 「前往設定」按鈕 |

### TC-05：對話歷史記錄

| ID | 測試場景 | 操作步驟 | 預期結果 |
|----|---------|---------|---------|
| TC-05 | 查看對話歷史 | 1. 關閉對話視窗<br>2. 重新開啟<br>3. 查看先前對話 | 顯示：<br>- 最近 10 則訊息<br>- 使用者訊息（右側）<br>- AI 回覆（左側）<br>- Citation 仍可點擊 |

---

## 8. 技術實作要點

### 8.1 Edge Function（AI 代理）

**檔案位置**：`/supabase/functions/server/ai-chat.tsx`

**用途**：
- 接收前端請求（使用者輸入 + 專案上下文）
- 呼叫 AI API（OpenAI / Anthropic / Google）
- 意圖判斷 + 回應產生
- 回傳結構化結果

**為何使用 Edge Function**：
- ✅ 保護 API Key（不暴露給前端）
- ✅ 統一 AI 呼叫介面（支援多供應商切換）
- ✅ 記錄用量與稽核

### 8.2 上下文組裝（Context Assembly）

**提供給 AI 的上下文**：
```typescript
interface AIContext {
  project: {
    id: string;
    name: string;
    description: string;
  };
  members: Member[]; // 用於指派建議
  recentItems: Item[]; // 最近 30 天的任務/決議/變更
  recentArtifacts: Artifact[]; // 最近 30 天的來源文件
  conversationHistory: Message[]; // 最近 10 則對話
}
```

### 8.3 RAG 搜尋（向量化）

**實作方式**：
- **短期**：使用 Supabase 內建 `pg_vector` 擴充
- **長期**：整合 Pinecone 或 Weaviate

**搜尋流程**：
1. 使用者查詢 → 向量化（Embedding）
2. 搜尋 `artifacts` 表（content_embedding 欄位）
3. 搜尋 `items` 表（title + description 向量）
4. 合併結果，計算相似度
5. 回傳前 10 筆 + 摘要

### 8.4 對話持久化（Schema）

**新增表格**：

```sql
-- conversations 表
CREATE TABLE aiproject.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES aiproject.projects(id),
  user_id UUID NOT NULL,
  title TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- messages 表
CREATE TABLE aiproject.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES aiproject.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  intent TEXT CHECK (intent IN ('CREATE', 'QUERY', 'UPDATE', 'RELATE', 'CLARIFY')),
  confidence DECIMAL(3,2),
  citations JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_conversations_project ON aiproject.conversations(project_id);
CREATE INDEX idx_messages_conversation ON aiproject.messages(conversation_id);
```

---

## 9. 開發階段規劃

### Phase 1：基礎對話（本次實作）
- [x] ChatFloatingPanel（已完成）
- [ ] 完整對話視窗（ChatPanel Component）
- [ ] 對話歷史儲存（conversations + messages 表）
- [ ] AI 意圖判斷（Edge Function）
- [ ] CREATE intent 實作（產生建議卡）

### Phase 2：進階功能（下一階段）
- [ ] QUERY intent 實作（RAG 搜尋）
- [ ] CLARIFY intent 實作（追問機制）
- [ ] Citation 可點擊跳轉
- [ ] 對話匯出（Markdown / PDF）

### Phase 3：優化（未來）
- [ ] 語音輸入（Speech-to-Text）
- [ ] 多輪對話上下文優化
- [ ] 主動提示（週報、風險預警）
- [ ] 團隊協作（共享對話）

---

## 10. 驗收標準（Acceptance Criteria）

### AC1：對話基本功能
- [ ] 使用者可開啟對話視窗
- [ ] 使用者可輸入文字並傳送
- [ ] AI 回覆顯示在左側氣泡
- [ ] 對話歷史可捲動查看

### AC2：意圖判斷與建議卡產生
- [ ] 貼上會議記錄，AI 產生 2-5 張建議卡
- [ ] 建議卡進入 Inbox（status: suggestion）
- [ ] 顯示「前往 Inbox 確認」按鈕

### AC3：Local Phase 限制
- [ ] 未連接 Supabase 時禁用 AI 功能
- [ ] 顯示「請先連接 Supabase 並設定 AI Key」提示
- [ ] 提供「前往設定」按鈕

### AC4：錯誤處理
- [ ] API 呼叫失敗顯示友善錯誤訊息
- [ ] 網路斷線顯示「請檢查網路連線」
- [ ] AI 回覆超時（>30 秒）顯示「請稍後再試」

---

## 11. 未來改進建議

### 短期（1-2 週）
- [ ] 新增「對話範本」功能（常用查詢）
- [ ] 支援 Markdown 格式化 AI 回覆
- [ ] 新增「複製回覆」按鈕

### 中期（1 個月）
- [ ] RAG 搜尋準確度優化
- [ ] 支援多模態輸入（圖片 + 文字）
- [ ] 新增「對話分析」儀表板（用量統計）

### 長期（3 個月）
- [ ] 整合 Slack / Teams（在聊天工具中使用 AI 秘書）
- [ ] 主動提示功能（每日晨報、風險預警）
- [ ] 多語言支援（英文介面）

---

**文件版本**：V1.0  
**建立日期**：2024-12-23  
**負責人**：AI 開發團隊  
**狀態**：待開發
