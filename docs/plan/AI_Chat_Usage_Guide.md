# AI 對話意圖識別系統 - 使用說明

> 版本：V1.0  
> 日期：2024-12-23  
> 狀態：已實作（MVP）

## 📋 目錄

1. [系統架構](#系統架構)
2. [快速開始](#快速開始)
3. [使用範例](#使用範例)
4. [API 參考](#api-參考)
5. [提升 AI 分辨能力](#提升-ai-分辨能力)
6. [常見問題](#常見問題)

---

## 系統架構

### 核心模組

```
/src/lib/ai/
├── types.ts          # 型別定義
├── prompts.ts        # System Prompt 與 Few-shot Examples
├── AIService.ts      # AI 服務核心邏輯
└── index.ts          # 模組匯出

/src/hooks/
└── useAIChat.ts      # React Hook

/src/app/components/
└── AIChatInput.tsx   # UI 組件
```

### 資料流

```
使用者輸入
    ↓
AIChatInput 組件
    ↓
useAIChat Hook
    ↓
AIService.chat()
    ↓
AIService.classifyIntent() → OpenAI/Anthropic API
    ↓
根據信心度分流：
├─ 高信心度 (≥0.85) → 自動執行
├─ 中信心度 (0.60~0.84) → 詢問確認
└─ 低信心度 (<0.60) → 請求澄清
    ↓
回傳 ChatResponse
    ↓
AIChatInput 顯示結果 + 執行動作
```

---

## 快速開始

### 1. 確保 AI 設定已配置

在「設定」頁面完成以下配置：

- AI Provider（OpenAI 或 Anthropic）
- API Key
- Model（如 gpt-4 或 claude-3-sonnet）
- 測試連線成功

### 2. 在你的頁面中使用 AI 對話組件

```tsx
import { AIChatInput } from './components/AIChatInput';
import { getStorageClient } from '../lib/storage';

function MyPage() {
  const storage = getStorageClient();

  // 當 AI 判斷使用者想建立任務時觸發
  const handleTaskCreate = async (extractedInfo: any) => {
    console.log('建立任務:', extractedInfo);
    
    // 呼叫你的 createItem() 邏輯
    const { data, error } = await storage.createItem({
      project_id: 'proj-xxx',
      type: 'action',
      status: 'open',
      title: extractedInfo.title,
      description: extractedInfo.description,
      due_date: extractedInfo.due_date,
      priority: extractedInfo.priority || 'medium'
    });

    if (error) {
      alert('建立任務失敗');
    } else {
      alert('任務已建立！');
    }
  };

  return (
    <div>
      <AIChatInput
        projectId="proj-xxx"
        projectName="國美館官網改版"
        currentPhase="Phase 1"
        teamMembers={['王經理', '李設計師', '張工程師']}
        onTaskCreate={handleTaskCreate}
        onDecisionRecord={(info) => console.log('記錄決議:', info)}
        onPendingMark={(info) => console.log('標記待回覆:', info)}
        onChangeRequest={(info) => console.log('需求變更:', info)}
      />
    </div>
  );
}
```

---

## 使用範例

### 範例 1：建立任務（高信心度）

**使用者輸入：**
```
明天前完成首頁設計稿
```

**AI 回應：**
```
✅ 已為你建立任務：【完成首頁設計稿】
- 截止日期：明天
- 優先級：中
- 負責人：（未指定）

需要調整任何資訊嗎？
```

**系統行為：**
- 自動觸發 `onTaskCreate()`
- 傳入的 `extractedInfo`：
  ```json
  {
    "title": "完成首頁設計稿",
    "due_date": "tomorrow",
    "priority": "medium"
  }
  ```

---

### 範例 2：記錄決議（高信心度）

**使用者輸入：**
```
我們決定使用 PostgreSQL 作為資料庫
```

**AI 回應：**
```
✅ 已記錄決議：【採用 PostgreSQL 作為資料庫】
- 類別：技術決策
- 範圍：全專案

這項決議將被追蹤並可供團隊查閱。
```

**系統行為：**
- 自動觸發 `onDecisionRecord()`
- 傳入的 `extractedInfo`：
  ```json
  {
    "title": "採用 PostgreSQL 作為資料庫",
    "category": "technical",
    "scope": "global"
  }
  ```

---

### 範例 3：意圖不明確（低信心度）

**使用者輸入：**
```
記得這個
```

**AI 回應：**
```
🤔 我不太確定你想要做什麼：「記得這個」

請選擇你的意圖：

[ ] 建立任務
    新增待辦事項並設定提醒

[ ] 標記待回覆
    追蹤等待他人回應的事項

[ ] 一般對話
    只是討論，不建立任何紀錄
```

**系統行為：**
- 顯示澄清對話框
- 使用者選擇後才執行對應動作

---

### 範例 4：一般對話

**使用者輸入：**
```
這個專案的進度如何？
```

**AI 回應：**
```
我會協助你處理這個問題。需要我提供更多資訊或建議嗎？
```

**系統行為：**
- 不建立任何資料
- 僅回應對話

---

## API 參考

### AIService.classifyIntent()

```typescript
async classifyIntent(
  userInput: string,
  projectContext?: {
    projectName: string;
    currentPhase?: string;
    teamMembers?: string[];
  }
): Promise<IntentClassificationResult>
```

**功能：** 分析使用者輸入的意圖

**回傳格式：**
```typescript
{
  intent: 'chat' | 'create_task' | 'record_decision' | 'mark_pending' | 'change_request' | 'ambiguous',
  confidence: 0.0 ~ 1.0,
  reasoning: string,
  extracted_info?: {
    title?: string,
    due_date?: string,
    priority?: 'low' | 'medium' | 'high',
    // ... 其他欄位
  }
}
```

---

### AIService.chat()

```typescript
async chat(
  userInput: string,
  projectContext?: {
    projectId: string;
    projectName: string;
    currentPhase?: string;
    teamMembers?: string[];
  }
): Promise<ChatResponse>
```

**功能：** 完整的對話流程（意圖分類 + 信心度檢查 + 回應生成）

**回傳格式：**
```typescript
{
  reply: string,                  // AI 的文字回應
  intent_result?: {               // 意圖分析結果
    intent: IntentType,
    confidence: number,
    reasoning: string,
    extracted_info?: ExtractedInfo
  },
  actions_taken?: Action[],       // 已執行的動作
  clarification_needed?: boolean, // 是否需要使用者確認
  clarification_options?: ClarificationOption[] // 確認選項
}
```

---

### useAIChat Hook

```typescript
const { chat, isLoading, error, clearError } = useAIChat({
  projectId: string,
  projectName: string,
  currentPhase?: string,
  teamMembers?: string[]
});
```

**參數：**
- `projectId`: 目前專案 ID
- `projectName`: 專案名稱（提供給 AI 作為上下文）
- `currentPhase`: 目前階段（如 "Phase 1"）
- `teamMembers`: 團隊成員名單（協助 AI 識別負責人）

**回傳：**
- `chat(message)`: 發送訊息給 AI
- `isLoading`: 是否處理中
- `error`: 錯誤訊息
- `clearError()`: 清除錯誤

---

## 提升 AI 分辨能力

### 方法 1：調整 System Prompt（立即可用）

**位置：** `/src/lib/ai/prompts.ts`

**優化方向：**

1. **更明確的角色定義**
   ```typescript
   role: '你是一位專業的「AI 專案秘書」，專精於軟體開發專案管理。你熟悉敏捷開發、Scrum、Kanban 等方法論。'
   ```

2. **新增判斷規則**
   ```typescript
   principles: [
     // 現有規則...
     '當使用者提到「明天」、「下週」等時間詞，通常是想建立任務',
     '當使用者說「決定」、「確認」時，通常是記錄決議',
     '當使用者說「等待」、「詢問」時，通常是標記待回覆',
     '當使用者說「改成」、「調整」、「取消」時，通常是需求變更'
   ]
   ```

3. **加入專案特定語境**
   ```typescript
   // 在 generateSystemPrompt() 中加入
   **專案特定術語：**
   - 「首頁」指的是官網首頁（/）
   - 「展覽系統」包含展覽列表、詳情、預約功能
   - 「典藏」指的是典藏資料庫模組
   ```

---

### 方法 2：新增 Few-shot Examples（立即可用）

**位置：** `/src/lib/ai/prompts.ts`

**新增更多範例：**

```typescript
export const INTENT_CLASSIFICATION_EXAMPLES: IntentExample[] = [
  // 現有範例...
  
  // 新增：多重意圖
  {
    input: '我們決定用 Next.js（決議），麻煩你明天建立專案（任務）',
    intent: 'create_task', // 主要意圖
    confidence: 0.88,
    extracted_info: {
      title: '建立 Next.js 專案',
      due_date: 'tomorrow',
      tags: ['技術決策相關']
    }
  },
  
  // 新增：模糊語句
  {
    input: '可能需要改一下首頁',
    intent: 'ambiguous',
    confidence: 0.45,
    extracted_info: {}
  },
  
  // 新增：專案特定術語
  {
    input: '展覽系統的預約功能要加上驗證碼',
    intent: 'change_request',
    confidence: 0.89,
    extracted_info: {
      title: '展覽預約功能新增驗證碼',
      change_target: '展覽系統 > 預約功能',
      change_type: 'add'
    }
  }
];
```

**建議：** 隨著使用過程累積真實案例，持續新增範例。目標：20-30 個涵蓋各種情境的範例。

---

### 方法 3：調整信心度門檻（立即可用）

**位置：** `/src/lib/ai/prompts.ts`

**目前設定：**
```typescript
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.85,      // >= 0.85: 自動執行
  MEDIUM: 0.60,    // 0.60 ~ 0.84: 建議但需確認
  LOW: 0.60        // < 0.60: 請求澄清
};
```

**調整建議：**

- **保守策略**（減少誤判）：
  ```typescript
  HIGH: 0.90,   // 提高自動執行門檻
  MEDIUM: 0.70,
  LOW: 0.70
  ```

- **積極策略**（提升效率）：
  ```typescript
  HIGH: 0.80,   // 降低自動執行門檻
  MEDIUM: 0.50,
  LOW: 0.50
  ```

---

### 方法 4：Chain of Thought（思考鏈）

**實作方式：** 修改 System Prompt，要求 AI 先解釋推理過程

```typescript
// 在 generateSystemPrompt() 中加入
**分析步驟：**
在給出 JSON 回應前，請先進行以下思考（不需輸出）：
1. 識別關鍵動詞（如：完成、決定、等待、改成）
2. 識別時間詞（如：明天、下週、馬上）
3. 識別對象（如：客戶、團隊成員、系統）
4. 綜合判斷使用者的主要意圖
5. 評估信心度（0.0 ~ 1.0）
```

---

### 方法 5：多步驟驗證（進階）

**實作方式：** 在 `AIService.classifyIntent()` 中進行二次驗證

```typescript
async classifyIntent(userInput: string, context?: any): Promise<IntentClassificationResult> {
  // Step 1: 初步分類
  const initialResult = await this.callOpenAI(systemPrompt, userPrompt);
  
  // Step 2: 如果信心度在中間範圍，進行二次驗證
  if (initialResult.confidence > 0.60 && initialResult.confidence < 0.85) {
    const verificationPrompt = `
      你剛才判斷「${userInput}」的意圖是「${initialResult.intent}」，信心度 ${initialResult.confidence}。
      請再次檢查：這個判斷正確嗎？如果有疑慮，請降低信心度並說明原因。
    `;
    
    const verifiedResult = await this.callOpenAI(systemPrompt, verificationPrompt);
    return verifiedResult;
  }
  
  return initialResult;
}
```

---

### 方法 6：累積資料進行 Fine-tuning（長期）

**準備階段（目前）：**

1. 記錄每次對話的以下資訊：
   - 使用者輸入
   - AI 判斷的意圖
   - 使用者的實際選擇（如果觸發澄清對話）
   - 最終執行的動作

2. 儲存格式（建議加入 `conversation_logs` 表）：
   ```sql
   CREATE TABLE conversation_logs (
     id UUID PRIMARY KEY,
     project_id UUID REFERENCES projects(id),
     user_input TEXT NOT NULL,
     ai_predicted_intent TEXT,
     ai_confidence FLOAT,
     actual_intent TEXT, -- 使用者實際選擇的意圖
     extracted_info JSONB,
     created_at TIMESTAMPTZ DEFAULT now()
   );
   ```

3. 累積 500+ 筆資料後：
   - 匯出資料為 JSONL 格式
   - 使用 OpenAI Fine-tuning API 訓練專屬模型
   - 參考：https://platform.openai.com/docs/guides/fine-tuning

**Fine-tuning 成本：**
- OpenAI GPT-3.5: ~$0.008/1K tokens (training) + $0.012/1K tokens (usage)
- OpenAI GPT-4: 目前不支援 Fine-tuning

---

## 常見問題

### Q1: 為什麼 AI 會誤判我的意圖？

**可能原因：**
1. 輸入語句過於簡短或模糊
2. 缺乏足夠的上下文（專案資訊、團隊成員）
3. System Prompt 未涵蓋此類情境

**解決方法：**
1. 使用更具體的描述（如：「明天前完成首頁設計」而非「處理首頁」）
2. 在 Few-shot Examples 中新增類似案例
3. 調整信心度門檻，讓系統更容易觸發「澄清對話」

---

### Q2: 如何處理多重意圖的輸入？

**範例：** 「我們決定用 Next.js，麻煩你明天建立專案」

**目前方案：** AI 會選擇「主要意圖」（通常是後半段的動作）

**改進方向：**
1. 修改 `extracted_info` 結構，支援多個子意圖：
   ```typescript
   {
     primary_intent: 'create_task',
     secondary_intents: ['record_decision'],
     // ...
   }
   ```

2. UI 層處理：依序執行多個動作

---

### Q3: Local Phase 可以使用 AI 功能嗎？

**答案：** 可以，但有限制

**限制：**
- 無法持久化 API Key（每次重新載入需重新輸入）
- 建議使用 `sessionStorage` 暫存 API Key

**實作方式：**
```typescript
// 暫存 API Key（僅限當前 Session）
sessionStorage.setItem('temp_ai_key', apiKey);

// 讀取
const tempKey = sessionStorage.getItem('temp_ai_key');
```

---

### Q4: 如何降低 API 成本？

**策略 1：** 使用輕量級模型進行意圖分類
- OpenAI: `gpt-3.5-turbo` ($0.0015/1K tokens)
- Anthropic: `claude-3-haiku` ($0.00025/1K tokens)

**策略 2：** 快取常見問題的回應
```typescript
const intentCache = new Map<string, IntentClassificationResult>();

// 檢查快取
if (intentCache.has(userInput)) {
  return intentCache.get(userInput)!;
}

// 呼叫 API 後儲存快取
intentCache.set(userInput, result);
```

**策略 3：** 批次處理（如果有多筆輸入）

---

### Q5: 如何整合對話歷史（多輪對話）？

**目前狀態：** 每次對話是獨立的

**改進方向：** 建立 `ConversationContext`

```typescript
interface ConversationContext {
  conversationId: string;
  messages: ConversationMessage[];
  lastIntent?: IntentType;
  pendingActions?: Action[];
}

// 在 AIService 中加入
async chatWithContext(
  userInput: string,
  context: ConversationContext
): Promise<ChatResponse> {
  // 將對話歷史加入 Prompt
  const historyPrompt = context.messages.map(msg => 
    `${msg.role}: ${msg.content}`
  ).join('\n');
  
  // ... 呼叫 AI
}
```

---

## 下一步

### Phase 2 功能（建議開發優先順序）

1. **多輪對話支援** ⭐⭐⭐
   - 記憶對話歷史
   - 支援「剛才那個任務」、「上一個決議」等指代

2. **向量搜尋整合（RAG）** ⭐⭐⭐
   - 將 Artifacts 向量化
   - AI 回答前先搜尋相關文件
   - 提供更精準的上下文

3. **語音輸入** ⭐⭐
   - 整合 Web Speech API
   - 支援語音轉文字

4. **批次處理** ⭐
   - 一次處理多條指令
   - 如：「明天完成設計，下週三測試，並記錄決議」

5. **智慧提醒** ⭐
   - 根據對話內容自動設定提醒
   - 如：「提醒我 3 天後追蹤客戶回覆」

---

## 參考資源

- [OpenAI Chat Completions API](https://platform.openai.com/docs/guides/text-generation)
- [Anthropic Claude API](https://docs.anthropic.com/claude/reference/messages_post)
- [Prompt Engineering Guide](https://www.promptingguide.ai/)
- [LangChain Intent Classification](https://python.langchain.com/docs/use_cases/chatbots/)
- [Few-shot Learning](https://en.wikipedia.org/wiki/Few-shot_learning)
