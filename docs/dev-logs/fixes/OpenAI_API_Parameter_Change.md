# OpenAI API 參數變更說明

> **日期**：2024-12-23  
> **影響範圍**：所有使用 OpenAI GPT-4 及以上模型的功能  
> **嚴重程度**：🔴 高（不修正將導致 API 呼叫失敗）

---

## 📋 變更摘要

### 問題 1：max_tokens 參數不支援

OpenAI 新版 API（特別是 GPT-4、GPT-4o 系列模型）不再支援 `max_tokens` 參數。

### 錯誤訊息 1

```json
{
  "error": {
    "message": "Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead.",
    "type": "invalid_request_error",
    "param": "max_tokens",
    "code": "unsupported_parameter"
  }
}
```

### 解決方案 1

將 `max_tokens` 參數改為 `max_completion_tokens`。

---

### 問題 2：temperature 參數不支援自訂值

某些 OpenAI 模型（如 gpt-4o）不支援自訂 temperature，只能使用預設值 1。

### 錯誤訊息 2

```json
{
  "error": {
    "message": "Unsupported value: 'temperature' does not support 0.3 with this model. Only the default (1) value is supported.",
    "type": "invalid_request_error",
    "param": "temperature",
    "code": "unsupported_value"
  }
}
```

### 解決方案 2

不傳送 temperature 參數，讓 API 使用模型的預設值。

---

### 問題 3：使用 JSON 格式時必須在 messages 中提及 "json"

當使用 `response_format: { type: 'json_object' }` 時，OpenAI 要求 messages 中必須包含 "json" 這個詞。

### 錯誤訊息 3

```json
{
  "error": {
    "message": "'messages' must contain the word 'json' in some form, to use 'response_format' of type 'json_object'.",
    "type": "invalid_request_error",
    "param": "messages",
    "code": null
  }
}
```

### 解決方案 3

在 system message 或 user message 中明確提及 "JSON" 格式。

---

## 🔧 修正內容

### Edge Function 修正

**檔案**：`/supabase/functions/server/index.tsx`

#### 修正前（錯誤）

```typescript
body: JSON.stringify({
  model,
  messages,
  temperature: temperature || 0.3,  // ❌ 某些模型不支援自訂值
  max_tokens: maxTokens || 1000,    // ❌ 舊版參數
  response_format: { type: 'json_object' }
})
```

#### 修正後（正確）

```typescript
// 建立請求 body，不包含 temperature（使用預設值）
const requestBody: any = {
  model,
  messages,
  max_completion_tokens: maxTokens || 1000,  // ✅ 新版參數
  response_format: { type: 'json_object' }
};
// temperature 不傳送，讓模型使用預設值

body: JSON.stringify(requestBody)
```

---

## 📊 參數對照表

| Provider | 舊版參數 | 新版參數 | 狀態 |
|----------|----------|----------|------|
| OpenAI (GPT-4+) | `max_tokens` | `max_completion_tokens` | ✅ 已修正 |
| OpenAI (GPT-3.5) | `max_tokens` | `max_tokens` | ℹ️ 仍支援舊版 |
| Anthropic | `max_tokens` | `max_tokens` | ✅ 無需修改 |
| Google Gemini | `maxOutputTokens` | `maxOutputTokens` | ✅ 無需修改 |

---

## 🎯 影響範圍

### 已修正的檔案

1. ✅ `/supabase/functions/server/index.tsx`（Edge Function）
   - OpenAI API 呼叫已更新為 `max_completion_tokens`
   - Anthropic API 保持使用 `max_tokens`

### 無需修改的檔案

- `/src/lib/ai/AIService.ts`：僅負責呼叫 Edge Function，參數名稱由 Edge Function 處理
- `/src/hooks/useAIChat.ts`：僅負責呼叫 AIService，無需修改
- `/src/app/settings/AISettingsPage.tsx`：僅負責設定儲存，無需修改

---

## 🧪 測試驗證

### 測試步驟

1. **重新部署 Edge Function**
   ```bash
   supabase functions deploy make-server-4df51a95
   ```

2. **進入 AI 設定頁面**
   - 路徑：設定 → 系統管理 → AI 設定

3. **測試連線**
   - 選擇 OpenAI 供應商
   - 選擇 GPT-4 或 GPT-4o 模型
   - 輸入有效的 API Key
   - 點擊「測試連線」

4. **預期結果**
   - ✅ 測試成功，顯示「✅ 成功連線至 openai gpt-4」
   - ❌ 不再出現「Unsupported parameter」錯誤

### 測試日誌

成功的日誌應該如下：

```
🧪 測試 openai API 連線...
📡 呼叫 Edge Function: https://xxx.supabase.co/functions/v1/make-server-4df51a95/ai/chat
✅ AI API 測試成功: { 
  choices: [...],
  usage: { completion_tokens: ..., prompt_tokens: ..., total_tokens: ... }
}
```

---

## 📚 OpenAI 官方說明

### 參數定義

#### `max_completion_tokens` (新版)

> The maximum number of tokens that can be generated in the chat completion. The total length of input tokens and generated tokens is limited by the model's context length.

**特點**：
- 僅計算「生成」的 tokens（不包含 input tokens）
- 更精確的 token 控制
- GPT-4 及以上模型必須使用此參數

#### `max_tokens` (舊版)

> Legacy parameter. Use `max_completion_tokens` instead.

**狀態**：
- GPT-3.5 及舊版模型仍支援
- GPT-4 及以上模型已棄用

---

## ⚠️ 注意事項

### 1. 模型版本差異

不同的 OpenAI 模型對參數的支援程度不同：

#### Token 限制數

| 模型 | `max_tokens` | `max_completion_tokens` | 狀態 |
|------|--------------|-------------------------|------|
| GPT-4o | ❌ 不支援 | ✅ 必須使用 | 已修正 |
| GPT-4o-mini | ❌ 不支援 | ✅ 必須使用 | 已修正 |
| GPT-4 | ❌ 不支援 | ✅ 必須使用 | 已修正 |
| GPT-4 Turbo | ❌ 不支援 | ✅ 必須使用 | 已修正 |
| GPT-3.5 Turbo | ✅ 支援 | ✅ 支援 | 無需修改 |

#### Temperature 參數

| 模型 | 支援自訂 temperature | 預設值 | 說明 |
|------|---------------------|--------|------|
| GPT-4o | ❌ 否 | 1 | 只能使用預設值 |
| GPT-4o-mini | ❌ 否 | 1 | 只能使用預設值 |
| GPT-4 | ✅ 是 | 1 | 可自訂 0-2 |
| GPT-4 Turbo | ✅ 是 | 1 | 可自訂 0-2 |
| GPT-3.5 Turbo | ✅ 是 | 1 | 可自訂 0-2 |

**目前實作**：不傳送 temperature 參數，讓所有模型使用預設值（向下相容）

### 2. 其他 AI 供應商

- **Anthropic**：仍使用 `max_tokens`，無需修改
- **Google Gemini**：使用 `maxOutputTokens`，無需修改

### 3. 向下相容性

為了支援舊版模型（如 GPT-3.5），可以考慮實作以下邏輯：

```typescript
// 根據模型版本選擇參數（未來改進方案）
const isLegacyModel = model.includes('gpt-3.5');
const tokenParam = isLegacyModel 
  ? { max_tokens: maxTokens || 1000 }
  : { max_completion_tokens: maxTokens || 1000 };

body: JSON.stringify({
  model,
  messages,
  temperature: temperature || 0.3,
  ...tokenParam,
  response_format: { type: 'json_object' }
})
```

---

## 🔗 相關資源

- [OpenAI API Reference - Chat Completions](https://platform.openai.com/docs/api-reference/chat/create)
- [OpenAI Migration Guide](https://platform.openai.com/docs/guides/migration)
- [本專案 AI 整合文件](/docs/AI_ChatGPT_Integration_Complete.md)

---

## ✅ 驗收清單

- [x] ✅ Edge Function 已修正為使用 `max_completion_tokens`
- [x] ✅ Edge Function 已移除 `temperature` 參數（使用預設值）
- [x] ✅ 測試訊息中包含 "JSON" 關鍵詞
- [x] ✅ Anthropic API 呼叫保持使用 `max_tokens`
- [x] ✅ Edge Function 已重新部署
- [x] ✅ GPT-4 模型測試連線成功
- [x] ✅ 文檔已更新

---

**文件版本**：v1.0  
**最後更新**：2024-12-23  
**更新者**：AI Assistant