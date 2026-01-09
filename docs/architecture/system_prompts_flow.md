# System Prompts 資料流程說明

## 📋 完整資料流程

### **1. 儲存流程（UI → 資料庫）**

```
使用者在 UI 輸入/重置 Prompt
    ↓
SystemPromptsEditor.tsx
    ↓
storage.updateSystemPrompts() / storage.resetSystemPrompt()
    ↓
SupabaseAdapter.ts
    ↓
Supabase Database (aiproject.system_prompts)
```

#### **重置預設值時的來源**
- `wbs_parser` → `WBS_PARSER_PROMPT`（prompts.ts）
- `intent_classification` → `generateSystemPrompt()`（prompts.ts）
- `few_shot_examples` → `generateFewShotPrompt()`（prompts.ts）

---

### **2. 讀取流程（資料庫 → AI API 或 UI 顯示）**

#### **🔥 重要修正（2024-12-24）**
當資料庫沒有記錄時，`getSystemPrompts()` 會自動回傳 `prompts.ts` 中定義的預設值，而非空字串。

```
DashboardPage.tsx / SystemPromptsEditor.tsx
    ↓
storage.getSystemPrompts(projectId)
    ↓
SupabaseAdapter.ts 查詢資料庫
    ├─ 有記錄 → 回傳資料庫的 Prompt
    └─ 無記錄 → 自動回傳 prompts.ts 的預設值
    ↓
UI 顯示或傳遞給 AI API
```

---

## 🔍 Console Log 追蹤點

### **Vision API**
```typescript
console.log('📋 [Vision API] 使用的 WBS Prompt:', {
  source: '資料庫' | '預設值（prompts.ts）',
  dbPromptLength: 資料庫中的 Prompt 長度,
  finalPromptLength: 最終使用的 Prompt 長度,
  preview: '前 100 字元預覽'
});
```

### **Chat API**
```typescript
console.log('📋 使用的 WBS Prompt:', {
  source: '資料庫' | '預設值',
  length: Prompt 長度,
  preview: '前 100 字元預覽'
});
```

### **重置 Prompt**
```typescript
console.log('🔄 重置 wbs_parser 為預設值，長度: 1234');
```

---

## ✅ 驗證方法

### **測試 1: 確認預設值已載入**
1. 前往「設定 → 提示詞管理」
2. 點擊「重置為預設值」
3. 檢查 Console：
   ```
   🔄 重置 wbs_parser 為預設值，長度: 1234
   ✅ Prompt 已重置為預設值
   ```
4. 檢查文字框是否填入完整 Prompt（應該很長，約 100+ 行）

### **測試 2: 確認 AI 使用了正確的 Prompt**
1. 回到「儀表板」
2. 上傳一個 PDF 檔案
3. 檢查 Console：
   ```
   📋 使用的 WBS Prompt: {
     source: '資料庫',
     length: 1234,
     preview: '你是一位資深專案經理（PM），負責解析文件並提取任務項目。...'
   }
   ```
4. 確認 `source` 是「資料庫」而非「預設值」

### **測試 3: 確認空值處理**
1. 在「提示詞管理」中清空 WBS Parser Prompt
2. 點擊「儲存變更」
3. 回到「儀表板」上傳 PDF
4. 檢查 Console：
   ```
   📋 使用的 WBS Prompt: {
     source: '預設值（prompts.ts）',
     dbPromptLength: 0,
     finalPromptLength: 1234,
     preview: '你是一位資深專案經理（PM）...'
   }
   ```
5. 確認系統自動使用了預設值

---

## 🐛 常見問題排查

### **問題 1: AI 回應「未按 JSON 格式」**
**原因：** 資料庫的 Prompt 是空字串，且預設值也未正確載入

**解決：**
1. 檢查 Console 的「source」欄位
2. 如果是「預設值」但 AI 仍回傳錯誤 → 檢查 `/src/lib/ai/prompts.ts` 是否正確
3. 如果是「資料庫」但內容為空 → 重新點擊「重置為預設值」

### **問題 2: 重置後仍然是空的**
**原因：** `resetSystemPrompt()` 函數未正確實作

**解決：**
1. 檢查 Console：`🔄 重置 wbs_parser 為預設值，長度: 0`
2. 如果長度是 0 → 代表 `WBS_PARSER_PROMPT` 未正確匯入
3. 檢查 `SystemPromptsEditor.tsx` 第 4 行的 import 是否正確

### **問題 3: UI 儲存後 AI 仍用舊 Prompt**
**原因：** 可能有快取或讀取時機問題

**解決：**
1. 重新整理頁面（F5）
2. 重新上傳檔案測試
3. 檢查 Supabase Database 中的 `system_prompts` 表是否真的有更新

---

## 📊 資料庫結構

### **aiproject.system_prompts 表**
| 欄位 | 類型 | 說明 |
|------|------|------|
| `id` | `uuid` | Primary Key |
| `project_id` | `uuid` | 外鍵（關聯到 projects） |
| `wbs_parser` | `text` | WBS 解析 Prompt |
| `intent_classification` | `text` | 意圖分類 Prompt |
| `few_shot_examples` | `text` | Few-Shot 範例 Prompt |
| `last_updated_at` | `timestamp` | 最後更新時間（業務層） |
| `updated_by` | `text` | 更新者 |
| `created_at` | `timestamp` | 建立時間 |
| `updated_at` | `timestamp` | 更新時間（資料庫層） |

---

## 🎯 修正總結

### **修正前的問題**
1. ❌ Vision API 使用簡單的 `||` 判斷，空字串會被視為有效值
2. ❌ 缺少 Console Log 無法追蹤 Prompt 來源
3. ❌ `SystemPromptsEditor` 只支援 `wbs_parser` 的重置

### **修正後的改進**
1. ✅ 統一使用 `trim().length > 0` 判斷是否為空
2. ✅ 加入詳細的 Console Log 追蹤
3. ✅ 支援所有三個 Prompt 的重置（從 prompts.ts）
4. ✅ Vision API 和 Chat API 使用相同的邏輯

---

## 📝 使用建議

### **最佳實務**
1. **永遠使用 UI 重置功能**，而非手動執行 SQL
2. **每次修改後測試一次**，確認 AI 行為符合預期
3. **善用 Console Log**，追蹤 Prompt 來源與長度

### **調整 Prompt 的時機**
- 🔧 **需要特定格式輸出** → 修改 WBS Parser Prompt
- 🎯 **需要調整意圖判斷** → 修改 Intent Classification Prompt
- 📚 **需要提供更多範例** → 修改 Few-Shot Examples Prompt

---

**最後更新：** 2024-12-24
**維護者：** AI 專案秘書開發團隊