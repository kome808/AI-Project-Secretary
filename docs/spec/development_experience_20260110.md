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
