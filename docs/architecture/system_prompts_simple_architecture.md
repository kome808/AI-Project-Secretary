# System Prompts 架構說明

> **最後更新：** 2024-12-24  
> **設計原則：** 簡單、單一來源、系統管理員維護

---

## 🎯 核心理念

**系統管理員在 UI 維護提示詞 → 所有 AI 功能從資料庫讀取**

---

## 🔑 系統層級 ID

由於資料庫的 `project_id` 欄位類型是 `uuid`，我們使用固定的 UUID 代表系統層級設定：

```
系統層級 ID = '00000000-0000-0000-0000-000000000000'
```

---

## 🔑 權限設計

### **只有系統管理員可以維護提示詞**

- ❌ 不區分專案層級
- ❌ PM 角色無法修改提示詞
- ✅ 僅系統管理員在「設定 → 提示詞管理」維護

---

## 📝 使用流程

### **步驟 1: 前往提示詞管理**

1. 點擊「**設定**」入口
2. 點擊「**提示詞管理**」Tab
3. 系統會自動載入 `project_id = '00000000-0000-0000-0000-000000000000'` 的設定

### **步驟 2: 編輯提示詞**

提供三個 Tab 供編輯：

1. **WBS 解析 Prompt**  
   用於解析 WBS 圖檔、Excel、Word、PDF 等文件

2. **意圖分類 Prompt**  
   用於分類使用者輸入意圖（chat / create_task / record_decision 等）

3. **Few-Shot 範例 Prompt**  
   用於提供 AI 範例學習

### **步驟 3: 儲存變更**

1. 編輯完成後，點擊「**儲存變更**」
2. 系統會將設定儲存到資料庫（`project_id = '00000000-0000-0000-0000-000000000000'`）
3. **立即生效！** 所有 AI 功能都會使用新的 Prompt

---

## 🔄 資料流程

### **載入流程（UI → 資料庫）**

```
系統管理員開啟「提示詞管理」
    ↓
SystemPromptsEditor.tsx
    ↓
storage.getSystemPrompts('00000000-0000-0000-0000-000000000000')
    ↓
SupabaseAdapter.ts 查詢資料庫
    ├─ 有記錄 → 回傳資料庫的 Prompt
    └─ 無記錄 → 回傳 prompts.ts 的預設值（僅用於初始化）
    ↓
顯示在 UI 供編輯
```

### **儲存流程（UI → 資料庫）**

```
系統管理員編輯 Prompt
    ↓
點擊「儲存變更」
    ↓
storage.updateSystemPrompts('00000000-0000-0000-0000-000000000000', prompts)
    ↓
SupabaseAdapter.ts 寫入資料庫
    ├─ 有記錄 → UPDATE
    └─ 無記錄 → INSERT
    ↓
✅ 儲存成功，所有 AI 功能立即使用新設定
```

### **AI 使用流程（AI 功能 → 資料庫）**

```
Vision API / Chat API 需要 Prompt
    ↓
storage.getSystemPrompts('00000000-0000-0000-0000-000000000000')
    ↓
SupabaseAdapter.ts 查詢資料庫
    ↓
回傳 Prompt
    ↓
傳遞給 OpenAI API
```

---

## 🛠️ 重置為預設值

### **功能說明**

每個 Tab 右上角有「**重置為預設值**」按鈕，點擊後會：

1. 從 `/src/lib/ai/prompts.ts` 讀取出廠預設值
2. 覆蓋目前的 Prompt
3. 儲存到資料庫

### **預設值來源**

| Prompt | 函數 |
|--------|------|
| WBS 解析 | `WBS_PARSER_PROMPT` |
| 意圖分類 | `generateSystemPrompt()` |
| Few-Shot 範例 | `generateFewShotPrompt()` |

---

## 📋 Console Log 追蹤

### **載入時**

```typescript
🔍 [SystemPromptsEditor] 開始載入系統層級提示詞
🔍 [getSystemPrompts] 開始查詢 system_prompts，projectId: 00000000-0000-0000-0000-000000000000
```

**情境 A：資料庫有記錄**
```typescript
✅ [getSystemPrompts] 查詢成功，資料長度: {
  wbs_parser: 1234,
  intent_classification: 2345,
  few_shot_examples: 1456
}
✅ [SystemPromptsEditor] 載入成功，資料長度: { ... }
```

**情境 B：資料庫無記錄（第一次使用）**
```typescript
⚠️ [getSystemPrompts] 查無資料，回傳 prompts.ts 預設值
📋 [getSystemPrompts] 預設值長度: {
  wbs_parser: 1234,
  intent_classification: 2345,
  few_shot_examples: 1456
}
✅ [SystemPromptsEditor] 載入成功，資料長度: { ... }
```

### **儲存時**

```typescript
💾 [updateSystemPrompts] 開始儲存 system_prompts，projectId: 00000000-0000-0000-0000-000000000000
📝 [updateSystemPrompts] 儲存內容長度: { ... }
```

**情境 A：更新現有記錄**
```typescript
🔄 [updateSystemPrompts] 更新現有記錄，id: abc-123
✅ [updateSystemPrompts] 更新成功！
```

**情境 B：新增記錄（第一次儲存）**
```typescript
➕ [updateSystemPrompts] 新增記錄
✅ [updateSystemPrompts] 新增成功！
```

---

## 🗄️ 資料庫結構

### **system_prompts 表**

| 欄位 | 類型 | 說明 |
|------|------|------|
| `id` | `uuid` | Primary Key |
| `project_id` | `uuid` | 固定為 `'00000000-0000-0000-0000-000000000000'`（系統層級） |
| `wbs_parser` | `text` | WBS 解析 Prompt |
| `intent_classification` | `text` | 意圖分類 Prompt |
| `few_shot_examples` | `text` | Few-Shot 範例 Prompt |
| `last_updated_at` | `timestamp` | 最後更新時間（業務層） |
| `updated_by` | `text` | 更新者 |
| `created_at` | `timestamp` | 建立時間 |
| `updated_at` | `timestamp` | 更新時間（資料庫層） |

### **資料範例**

```sql
SELECT * FROM aiproject.system_prompts 
WHERE project_id = '00000000-0000-0000-0000-000000000000';

-- 預期結果：
-- project_id = '00000000-0000-0000-0000-000000000000'
-- wbs_parser = '你是一位資深專案經理...'（約 1000+ 字元）
-- intent_classification = '你是一位專業的「AI 專案秘書」...'（約 2000+ 字元）
-- few_shot_examples = '**參考範例（Few-shot Learning）**...'（約 1500+ 字元）
```

---

## ✅ 優勢

1. **簡單明瞭**：只有一個地方管理提示詞，不會混淆
2. **即時生效**：修改後立即影響所有 AI 功能
3. **權限清楚**：只有系統管理員可以維護
4. **可追蹤性**：記錄 `last_updated_at` 和 `updated_by`
5. **Fallback 機制**：資料庫為空時自動使用 `prompts.ts` 預設值

---

## 🚀 快速開始

### **第一次使用**

1. 前往「**設定 → 提示詞管理**」
2. 系統會自動顯示 `prompts.ts` 的預設值
3. 如果滿意預設值，點擊「**儲存變更**」即可將預設值寫入資料庫
4. 如果要自訂，直接編輯後再儲存

### **日常維護**

1. 前往「**設定 → 提示詞管理**」
2. 編輯需要調整的 Prompt
3. 點擊「**儲存變更**」
4. **完成！** AI 行為立即改變

### **恢復預設值**

1. 前往「**設定 → 提示詞管理**」
2. 選擇要重置的 Tab（WBS 解析 / 意圖分類 / Few-Shot 範例）
3. 點擊右上角「**重置為預設值**」
4. 確認後自動儲存

---

## 🔧 開發者注意事項

### **prompts.ts 的角色**

`/src/lib/ai/prompts.ts` 僅用於：
1. 系統第一次使用時的初始值
2. 使用者點擊「重置為預設值」時的來源

**不應該直接在程式碼中使用 `prompts.ts`！**  
所有 AI 功能都應該從 `storage.getSystemPrompts('00000000-0000-0000-0000-000000000000')` 讀取。

### **修改預設值流程**

1. 編輯 `/src/lib/ai/prompts.ts`
2. 通知系統管理員「可以重置為新的預設值」
3. 系統管理員在 UI 點擊「重置為預設值」
4. **不要** 直接在程式碼中使用 `prompts.ts`

---

## 📚 相關文件

- `/docs/sql/init_system_prompts.sql` - 初始化系統預設值的 SQL
- `/src/lib/ai/prompts.ts` - 出廠預設值定義
- `/src/app/components/settings/SystemPromptsEditor.tsx` - UI 組件
- `/src/lib/storage/SupabaseAdapter.ts` - 資料存取層

---

**最後更新：** 2024-12-24  
**維護者：** AI 專案秘書開發團隊