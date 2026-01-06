# JSON 解析錯誤修復紀錄

> **日期**：2024-12-23  
> **錯誤訊息**：`SyntaxError: Unexpected end of JSON input`  
> **影響方法**：`classifyIntent`, `chat`  
> **狀態**：✅ 已修復

---

## 🔴 問題描述

當呼叫 AI Service 時，出現以下錯誤：

```
AI Service classifyIntent error: SyntaxError: Unexpected end of JSON input
AI Service chat error: SyntaxError: Unexpected end of JSON input
```

### 錯誤原因

**`SyntaxError: Unexpected end of JSON input`** 表示嘗試解析**空字串**或**不完整的 JSON**。

可能的情境：
1. **API 回傳空的 response body**
2. **Edge Function 出錯但沒有正確回傳錯誤訊息**
3. **網路中斷導致回應不完整**
4. **串流回應處理錯誤**

---

## 🔍 問題定位

### 原始程式碼（有問題）

```typescript
// /src/lib/ai/AIService.ts - callOpenAI 方法

const response = await fetch(edgeFunctionUrl, { ... });

if (!response.ok) {
  const error = await response.json();  // ❌ 可能會拋出 JSON 解析錯誤
  throw new Error(`OpenAI API Error: ${JSON.stringify(error)}`);
}

const data = await response.json();  // ❌ 如果 body 為空，會拋出錯誤
const content = data.choices[0].message.content;  // ❌ 沒有檢查結構
const parsed = JSON.parse(content);  // ❌ 沒有 try-catch
```

**問題點**：
1. ❌ **沒有檢查回應是否為空**
2. ❌ **沒有 try-catch 處理 JSON 解析錯誤**
3. ❌ **沒有驗證回應結構**
4. ❌ **錯誤訊息不明確**，無法定位問題

---

## ✅ 解決方案

### 改善策略

1. **先讀取 `response.text()`**，檢查是否為空
2. **手動解析 JSON**，加入 try-catch
3. **驗證回應結構**，確認必要欄位存在
4. **詳細的錯誤訊息**，記錄原始回應內容

---

### 修復後的程式碼

#### OpenAI API 呼叫

```typescript
private async callOpenAI(
  systemPrompt: string,
  userPrompt: string
): Promise<IntentClassificationResult> {
  const { projectId, publicAnonKey } = await import('../../../utils/supabase/info');
  
  const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4df51a95/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`
    },
    body: JSON.stringify({
      provider: this.config.provider,
      model: this.config.model,
      apiKey: this.config.apiKey,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: this.config.temperature || 0.3,
      maxTokens: this.config.maxTokens || 1000
    })
  });

  // ✅ 錯誤處理：嘗試解析錯誤訊息
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || JSON.stringify(errorData);
    } catch {
      // 如果無法解析 JSON，使用原始錯誤訊息
      const errorText = await response.text();
      if (errorText) {
        errorMessage = errorText;
      }
    }
    throw new Error(`OpenAI API Error: ${errorMessage}`);
  }

  // ✅ 檢查回應是否為空
  const responseText = await response.text();
  if (!responseText || responseText.trim() === '') {
    throw new Error('OpenAI API 回傳空的回應');
  }

  // ✅ 解析 JSON（加入 try-catch）
  let data;
  try {
    data = JSON.parse(responseText);
  } catch (parseError) {
    console.error('Failed to parse OpenAI response:', responseText);
    throw new Error(`無法解析 OpenAI API 回應: ${parseError instanceof Error ? parseError.message : '未知錯誤'}`);
  }

  // ✅ 檢查回應結構
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error(`OpenAI API 回應格式錯誤: ${JSON.stringify(data)}`);
  }

  const content = data.choices[0].message.content;
  
  // ✅ 檢查 content 是否為空
  if (!content || content.trim() === '') {
    throw new Error('OpenAI API 回傳空的 message content');
  }

  // ✅ 解析 content JSON（加入 try-catch）
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (parseError) {
    console.error('Failed to parse OpenAI content:', content);
    throw new Error(`無法解析 OpenAI 回應內容: ${parseError instanceof Error ? parseError.message : '未知錯誤'}`);
  }

  return {
    intent: parsed.intent,
    confidence: parsed.confidence,
    reasoning: parsed.reasoning || '',
    extracted_info: parsed.extracted_info,
    suggested_action: parsed.suggested_action
  };
}
```

#### Anthropic API 呼叫

```typescript
private async callAnthropic(
  systemPrompt: string,
  userPrompt: string
): Promise<IntentClassificationResult> {
  const { projectId, publicAnonKey } = await import('../../../utils/supabase/info');
  
  const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4df51a95/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`
    },
    body: JSON.stringify({
      provider: this.config.provider,
      model: this.config.model,
      apiKey: this.config.apiKey,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: this.config.temperature || 0.3,
      maxTokens: this.config.maxTokens || 1000
    })
  });

  // ✅ 錯誤處理
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || JSON.stringify(errorData);
    } catch {
      const errorText = await response.text();
      if (errorText) {
        errorMessage = errorText;
      }
    }
    throw new Error(`Anthropic API Error: ${errorMessage}`);
  }

  // ✅ 檢查回應是否為空
  const responseText = await response.text();
  if (!responseText || responseText.trim() === '') {
    throw new Error('Anthropic API 回傳空的回應');
  }

  // ✅ 解析 JSON
  let data;
  try {
    data = JSON.parse(responseText);
  } catch (parseError) {
    console.error('Failed to parse Anthropic response:', responseText);
    throw new Error(`無法解析 Anthropic API 回應: ${parseError instanceof Error ? parseError.message : '未知錯誤'}`);
  }

  // ✅ 檢查回應結構
  if (!data.content || !data.content[0] || !data.content[0].text) {
    throw new Error(`Anthropic API 回應格式錯誤: ${JSON.stringify(data)}`);
  }

  const content = data.content[0].text;
  
  // ✅ 檢查 content 是否為空
  if (!content || content.trim() === '') {
    throw new Error('Anthropic API 回傳空的 text content');
  }
  
  // ✅ Anthropic 需要手動解析 JSON（可能包含 <thinking> 標籤）
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('Failed to extract JSON from Anthropic content:', content);
    throw new Error('無法從 Anthropic 回應中解析 JSON');
  }

  // ✅ 解析 content JSON
  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (parseError) {
    console.error('Failed to parse Anthropic JSON:', jsonMatch[0]);
    throw new Error(`無法解析 Anthropic JSON 內容: ${parseError instanceof Error ? parseError.message : '未知錯誤'}`);
  }

  return {
    intent: parsed.intent,
    confidence: parsed.confidence,
    reasoning: parsed.reasoning || '',
    extracted_info: parsed.extracted_info,
    suggested_action: parsed.suggested_action
  };
}
```

---

## 📊 改善對比

| 項目 | 修復前 | 修復後 |
|------|-------|-------|
| **空回應檢查** | ❌ 沒有 | ✅ 先讀取 text()，檢查是否為空 |
| **JSON 解析錯誤處理** | ❌ 沒有 try-catch | ✅ 完整的 try-catch 與錯誤訊息 |
| **回應結構驗證** | ❌ 直接存取 | ✅ 逐層檢查必要欄位 |
| **錯誤訊息** | ❌ 籠統 | ✅ 詳細記錄原始內容 |
| **除錯資訊** | ❌ 沒有 | ✅ console.error 輸出原始回應 |

---

## 🧪 測試案例

### 案例 1：空回應

**輸入**：
```typescript
// Edge Function 回傳空字串
response.body = "";
```

**修復前**：
```
SyntaxError: Unexpected end of JSON input
```

**修復後**：
```
Error: OpenAI API 回傳空的回應
```

---

### 案例 2：錯誤回應（非 JSON）

**輸入**：
```typescript
// Edge Function 回傳純文字錯誤
response.body = "Internal Server Error";
```

**修復前**：
```
SyntaxError: Unexpected token I in JSON at position 0
```

**修復後**：
```
Error: 無法解析 OpenAI API 回應: Unexpected token I in JSON at position 0
Console: Failed to parse OpenAI response: Internal Server Error
```

---

### 案例 3：結構不完整

**輸入**：
```typescript
// 缺少 choices 欄位
response.body = JSON.stringify({ error: "Model not found" });
```

**修復前**：
```
TypeError: Cannot read properties of undefined (reading '0')
```

**修復後**：
```
Error: OpenAI API 回應格式錯誤: {"error":"Model not found"}
```

---

### 案例 4：content 為空

**輸入**：
```typescript
response.body = JSON.stringify({
  choices: [{ message: { content: "" } }]
});
```

**修復前**：
```
SyntaxError: Unexpected end of JSON input
```

**修復後**：
```
Error: OpenAI API 回傳空的 message content
```

---

## 🛡️ 防禦性程式設計原則

這次修復遵循了以下防禦性程式設計原則：

### 1. **永遠檢查外部輸入**

```typescript
// ❌ 錯誤：假設 API 一定會回傳正確格式
const data = await response.json();

// ✅ 正確：檢查是否為空
const responseText = await response.text();
if (!responseText || responseText.trim() === '') {
  throw new Error('API 回傳空的回應');
}
```

---

### 2. **分層驗證**

```typescript
// ❌ 錯誤：直接存取多層結構
const content = data.choices[0].message.content;

// ✅ 正確：逐層檢查
if (!data.choices || !data.choices[0] || !data.choices[0].message) {
  throw new Error('回應格式錯誤');
}
const content = data.choices[0].message.content;
```

---

### 3. **Try-Catch 包裹所有解析操作**

```typescript
// ❌ 錯誤：假設 JSON 解析一定成功
const data = JSON.parse(responseText);

// ✅ 正確：捕捉解析錯誤
let data;
try {
  data = JSON.parse(responseText);
} catch (parseError) {
  console.error('Failed to parse:', responseText);
  throw new Error(`解析失敗: ${parseError.message}`);
}
```

---

### 4. **詳細的錯誤訊息**

```typescript
// ❌ 錯誤：籠統的錯誤訊息
throw new Error('API Error');

// ✅ 正確：包含上下文與除錯資訊
console.error('Failed to parse response:', responseText);
throw new Error(`無法解析 API 回應: ${parseError.message}`);
```

---

## 🔗 相關文件

- [AI ChatGPT Integration Complete](/docs/AI_ChatGPT_Integration_Complete.md)
- [OpenAI API Parameter Change](/docs/OpenAI_API_Parameter_Change.md)
- [Edge Function Index](/supabase/functions/server/index.tsx)

---

## ✅ 檢查清單

- [x] ✅ 修復 `callOpenAI` 方法的 JSON 解析錯誤處理
- [x] ✅ 修復 `callAnthropic` 方法的 JSON 解析錯誤處理
- [x] ✅ 加入空回應檢查
- [x] ✅ 加入回應結構驗證
- [x] ✅ 加入詳細的錯誤訊息
- [x] ✅ 加入 console.error 除錯輸出
- [x] ✅ 建立修復紀錄文件

---

**文件版本**：v1.0  
**最後更新**：2024-12-23  
**更新者**：AI Assistant
