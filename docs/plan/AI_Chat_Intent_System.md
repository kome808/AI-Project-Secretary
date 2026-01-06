# AI 對話意圖識別系統 - 規劃文件

> 版本：V1.0  
> 日期：2024-12-23  
> 狀態：規劃中

## 1. 核心問題定義

### 1.1 使用者輸入的多種意圖類型

當使用者在主輸入框輸入內容時，可能有以下意圖：

1. **一般對話（Chat）**：單純詢問、討論、腦力激盪
   - 例：「這個專案的進度如何？」
   - 例：「幫我分析一下這個需求的可行性」
   
2. **建立任務（Create Task）**：需要產生待辦事項並分派
   - 例：「提醒我明天完成首頁設計稿」
   - 例：「新增任務：整合第三方 API」
   
3. **記錄決議（Record Decision）**：需要記錄重要決策
   - 例：「我們決定使用 PostgreSQL 作為資料庫」
   - 例：「客戶確認採用方案 A」
   
4. **標記待回覆（Mark Pending）**：等待他人回應的事項
   - 例：「等待客戶確認 Logo 規範」
   - 例：「詢問後端工程師 API 格式」
   
5. **需求變更（Change Request）**：變更現有規格或設計
   - 例：「首頁的輪播改成 5 秒切換」
   - 例：「取消會員系統的 LINE 登入功能」

### 1.2 挑戰

- **語意模糊**：「明天記得處理這個」→ 是任務還是提醒？
- **多重意圖**：「我們決定用 Next.js（決議），麻煩你明天開始建立專案（任務）」
- **誤判風險**：使用者只想討論，系統卻自動建立任務

---

## 2. 解決方案：混合式意圖識別

### 2.1 架構設計

```
┌─────────────────────────────────────────────────────────┐
│  使用者輸入                                               │
│  "提醒我明天完成首頁設計稿"                               │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  Phase 1: AI 意圖分析（Intent Classification）           │
│  - 使用 LLM 判斷使用者意圖                                │
│  - 輸出：{ intent: "create_task", confidence: 0.92 }     │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  Phase 2: 信心度檢查（Confidence Threshold）              │
│  - confidence ≥ 0.85 → 自動執行                          │
│  - confidence < 0.85 → 詢問使用者確認                    │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  Phase 3: 動作分派（Action Dispatcher）                  │
│  - chat → 對話回應                                       │
│  - create_task → 呼叫 createItem() 建立任務              │
│  - record_decision → 建立決議紀錄                        │
│  - mark_pending → 建立待回覆事項                         │
└─────────────────────────────────────────────────────────┘
```

### 2.2 使用者體驗流程

#### 情境 A：高信心度（自動執行）

```
使用者：「明天前完成首頁設計稿」
AI：「✅ 已為你建立任務：【完成首頁設計稿】
      - 截止日期：2024-12-24
      - 負責人：（未指定）
      需要指派給特定成員嗎？」
```

#### 情境 B：低信心度（確認意圖）

```
使用者：「記得處理這個」
AI：「我理解你想要：
      □ 建立任務並設定提醒
      □ 只是提醒我稍後討論
      請問你希望我怎麼做？」
```

#### 情境 C：一般對話

```
使用者：「這個專案的進度如何？」
AI：「根據目前資料：
      ✅ 首頁開發：60% 完成
      🔄 展覽系統：35% 完成
      ⏸️ 多語系系統：尚未開始
      整體進度約 40%，預計 Phase 1 將在 2 週內完成。」
```

---

## 3. AI Prompt 設計策略

### 3.1 System Prompt（角色定義）

```markdown
你是一位專業的「AI 專案秘書」，負責協助團隊管理專案進度。

**你的核心能力：**
1. 理解使用者的真實意圖（任務建立、決議記錄、一般對話等）
2. 自動整理專案資訊並提供洞察
3. 追蹤所有任務、決議、待辦事項的證據來源

**重要原則：**
- 當意圖不明確時，主動詢問使用者
- 建立任務前必須確認：標題、負責人、截止日期
- 所有決議必須記錄來源（會議記錄、對話時間等）
- 保持專業、簡潔、有溫度的對話風格
```

### 3.2 Few-shot Examples（範例學習）

```json
{
  "examples": [
    {
      "input": "明天前完成首頁設計稿",
      "intent": "create_task",
      "confidence": 0.95,
      "extracted_info": {
        "title": "完成首頁設計稿",
        "due_date": "tomorrow",
        "priority": "medium"
      }
    },
    {
      "input": "我們決定使用 PostgreSQL 作為資料庫",
      "intent": "record_decision",
      "confidence": 0.98,
      "extracted_info": {
        "title": "採用 PostgreSQL 作為資料庫",
        "category": "technical",
        "scope": "global"
      }
    },
    {
      "input": "等待客戶確認 Logo 規範",
      "intent": "mark_pending",
      "confidence": 0.92,
      "extracted_info": {
        "title": "等待客戶確認 Logo 規範",
        "waiting_on_type": "client"
      }
    },
    {
      "input": "這個專案的進度如何？",
      "intent": "chat",
      "confidence": 0.99,
      "action": "query_project_status"
    },
    {
      "input": "記得這個",
      "intent": "ambiguous",
      "confidence": 0.35,
      "action": "ask_clarification"
    }
  ]
}
```

### 3.3 Structured Output（強制 JSON 格式）

使用 OpenAI 的 `response_format: { type: "json_object" }` 或 Anthropic 的 `<thinking>` 標籤強制 AI 輸出結構化資料：

```typescript
interface IntentClassificationResult {
  intent: 'chat' | 'create_task' | 'record_decision' | 'mark_pending' | 'change_request' | 'ambiguous';
  confidence: number; // 0.0 ~ 1.0
  reasoning: string; // AI 的判斷理由
  extracted_info?: {
    title?: string;
    description?: string;
    due_date?: string;
    assignee?: string;
    priority?: 'low' | 'medium' | 'high';
    // ... 其他欄位
  };
  suggested_action?: string; // 建議的下一步
}
```

---

## 4. 提升 AI 分辨能力的方法

### 4.1 短期優化（Prompt Engineering）

✅ **已可立即實作：**

1. **精準的 System Prompt**
   - 定義清晰的角色與職責
   - 提供明確的判斷規則與邊界條件

2. **Few-shot Learning**
   - 在 Prompt 中提供 5-10 個典型範例
   - 涵蓋各種邊界情境（模糊、多重意圖）

3. **Chain of Thought（思考鏈）**
   - 要求 AI 先解釋推理過程，再給出答案
   - 例：「先分析這句話的動詞、時間詞、對象，再判斷意圖」

4. **Multi-step Verification（多步驟驗證）**
   - Step 1: 初步分類
   - Step 2: 提取關鍵資訊
   - Step 3: 信心度評估
   - Step 4: 產生建議動作

### 4.2 中期優化（Fine-tuning）

⏳ **需要累積資料後實作：**

1. **收集真實對話資料**
   - 記錄使用者輸入 + 實際意圖（人工標註）
   - 累積 500+ 筆資料後可進行 Fine-tuning

2. **Fine-tune 專屬模型**
   - 使用 OpenAI Fine-tuning API
   - 訓練「專案管理領域」的專屬模型

### 4.3 長期優化（多模型協作）

🚀 **進階架構：**

1. **意圖分類器（Classifier Model）**
   - 使用輕量級模型（如 GPT-3.5）快速判斷意圖
   - 成本低、速度快

2. **內容生成器（Generator Model）**
   - 使用進階模型（如 GPT-4）產生詳細回應
   - 品質高、適合複雜任務

3. **向量搜尋（RAG, Retrieval-Augmented Generation）**
   - 將專案歷史資料（Artifacts）向量化
   - AI 回答前先搜尋相關脣
   - 提供更精準的上下文

---

## 5. UI/UX 設計

### 5.1 主輸入框設計

```
┌─────────────────────────────────────────────────────────┐
│  💬 跟 AI 秘書對話...                        [🎤][📎]    │
│                                                          │
│  提示：你可以...                                          │
│  • 詢問專案進度：「目前有哪些待辦事項？」                 │
│  • 建立任務：「明天前完成首頁設計」                       │
│  • 記錄決議：「我們決定使用 Next.js」                    │
└─────────────────────────────────────────────────────────┘
                                                     [傳送]
```

### 5.2 意圖確認對話框（低信心度時顯示）

```
┌─────────────────────────────────────────────────────────┐
│  🤔 我理解你想要...                                       │
│                                                          │
│  ○ 建立任務：「記得處理這個」                             │
│     → 新增待辦事項並設定提醒                              │
│                                                          │
│  ○ 記錄待回覆：標記為等待他人回應                         │
│     → 不需要你執行，只是追蹤進度                          │
│                                                          │
│  ○ 一般對話：只是提醒我稍後討論                           │
│     → 不建立任何紀錄                                     │
│                                                          │
│                                    [取消]  [確認並執行]  │
└─────────────────────────────────────────────────────────┘
```

### 5.3 快速動作選單（選配）

```
┌──────────────────────┐
│  📝 建立任務         │
│  ✅ 記錄決議         │
│  ⏳ 標記待回覆       │
│  💬 一般對話         │
└──────────────────────┘
```

---

## 6. 實作優先順序

### Phase 1: MVP（1-2 天）
- [ ] 建立 AI Service 層（`/src/lib/ai/AIService.ts`）
- [ ] 實作意圖分類 API（`classifyIntent()`）
- [ ] 設計基礎 System Prompt + Few-shot Examples
- [ ] 實作「一般對話」與「建立任務」兩種意圖

### Phase 2: 完整意圖支援（2-3 天）
- [ ] 新增「記錄決議」、「標記待回覆」、「需求變更」意圖
- [ ] 實作信心度檢查與確認對話框
- [ ] 優化 Prompt（加入更多範例與規則）

### Phase 3: 進階功能（1 週）
- [ ] 多輪對話上下文管理（Context Memory）
- [ ] 向量搜尋（RAG）整合
- [ ] 對話歷史記錄與分析
- [ ] Fine-tuning 準備（資料收集）

---

## 7. 技術規格

### 7.1 API 設計

```typescript
// 意圖分類 API
POST /api/ai/classify-intent
Request: {
  message: string;
  context?: {
    projectId: string;
    recentMessages?: Message[];
  };
}
Response: {
  intent: IntentType;
  confidence: number;
  reasoning: string;
  extracted_info?: ExtractedInfo;
  suggested_action?: string;
}

// 對話 API
POST /api/ai/chat
Request: {
  message: string;
  projectId: string;
  conversationId?: string;
}
Response: {
  reply: string;
  intent_result?: IntentClassificationResult;
  actions_taken?: Action[];
}
```

### 7.2 資料結構

```typescript
// 對話歷史
interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  intent?: IntentType;
  actions?: Action[];
  created_at: string;
}

// 動作記錄
interface Action {
  type: 'create_task' | 'record_decision' | 'mark_pending';
  entity_id: string; // 建立的 Item ID
  entity_type: 'item' | 'artifact';
  metadata: Record<string, any>;
}
```

---

## 8. 安全性與隱私

### 8.1 Local Phase 限制

- ❌ **不能儲存 API Key**：遵循 Guidelines.md 禁止 1
- ✅ **可以呼叫 AI API**：透過前端直接呼叫（使用者自行提供 Key）
- ⚠️ **警告訊息**：「Local Phase 無法持久化 API Key，每次重新載入需重新輸入」

### 8.2 Supabase Phase

- ✅ **儲存 API Key**：存入 `system_ai_config` 表（已實作）
- ✅ **Edge Function 代理**：前端 → Edge Function → OpenAI/Anthropic
- ✅ **安全性**：API Key 不外洩至前端

---

## 9. 測試案例

### 9.1 意圖分類測試

| 輸入 | 預期意圖 | 預期信心度 |
|------|---------|-----------|
| 「明天前完成首頁設計」 | create_task | > 0.9 |
| 「我們決定用 Next.js」 | record_decision | > 0.9 |
| 「等待客戶回覆」 | mark_pending | > 0.85 |
| 「專案進度如何？」 | chat | > 0.95 |
| 「記得這個」 | ambiguous | < 0.5 |
| 「首頁改成 5 秒輪播」 | change_request | > 0.8 |

### 9.2 邊界情境測試

| 輸入 | 挑戰點 | 期望行為 |
|------|-------|---------|
| 「我們決定用 Next.js，麻煩你明天建專案」 | 多重意圖 | 分別建立「決議」+「任務」 |
| 「可能需要改首頁」 | 不確定性 | 標記為 ambiguous，詢問使用者 |
| 「123」 | 無意義輸入 | 回應「我不太理解，能否具體說明？」 |

---

## 10. 參考資料

- OpenAI Function Calling: https://platform.openai.com/docs/guides/function-calling
- Anthropic Claude Prompt Engineering: https://docs.anthropic.com/claude/docs/prompt-engineering
- LangChain Intent Classification: https://python.langchain.com/docs/use_cases/chatbots/
