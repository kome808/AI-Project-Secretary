# UUID 格式錯誤修復紀錄

> **日期**：2024-12-23  
> **錯誤代碼**：22P02  
> **錯誤訊息**：`invalid input syntax for type uuid: "proj_nmth_001"`  
> **狀態**：✅ 已修復

---

## 🔴 問題描述

當系統從 **Local Phase** 切換到 **Supabase** 後，出現 UUID 格式錯誤：

```
Supabase getItems error: {
  "code": "22P02",
  "details": null,
  "hint": null,
  "message": "invalid input syntax for type uuid: \"proj_nmth_001\""
}
```

### 錯誤原因

- **Local Phase**：使用自訂字串 ID（例如：`proj_nmth_001`、`member_pm_001`）
- **Supabase**：資料庫的 `id` 和 `project_id` 欄位使用 UUID 類型
- **衝突**：當 Local Phase 的 ID 被當作 UUID 查詢時，PostgreSQL 拋出型別錯誤

---

## 🔍 影響範圍

### 受影響的方法

| 方法名稱 | 表格 | 查詢欄位 | 錯誤類型 |
|---------|------|---------|---------|
| `getItems(projectId)` | `items` | `project_id` | 22P02 UUID 格式錯誤 |
| `getArtifacts(projectId)` | `artifacts` | `project_id` | 22P02 UUID 格式錯誤 |
| `getMembers(projectId)` | `members` | `project_id` | 22P02 UUID 格式錯誤（未實作） |
| `getModules(projectId)` | `modules` | `project_id` | 22P02 UUID 格式錯誤（未實作） |

---

## ✅ 解決方案

### 策略：動態 ID 格式檢測

在 `SupabaseAdapter` 中加入 **ID 格式檢測邏輯**：

1. **檢測是否為 UUID**：使用正則表達式判斷
2. **如果是 Local Phase ID**：查詢所有資料（不過濾 `project_id`）
3. **如果是有效 UUID**：進行精確查詢

### 實作方式

#### UUID 格式檢測

```typescript
// UUID 格式：8-4-4-4-12 個十六進位數字
// 例如：550e8400-e29b-41d4-a716-446655440000
const isLocalId = !projectId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
```

#### 修改前的程式碼（會出錯）

```typescript
async getItems(projectId: string): Promise<StorageResponse<Item[]>> {
  try {
    const schemaName = getSchemaName();
    const { data, error } = await this.supabase
      .schema(schemaName)
      .from('items')
      .select('*')
      .eq('project_id', projectId)  // ❌ 當 projectId = "proj_nmth_001" 時出錯
      .order('created_at', { ascending: false });
    
    // ... 錯誤處理
  }
}
```

#### 修改後的程式碼（已修復）

```typescript
async getItems(projectId: string): Promise<StorageResponse<Item[]>> {
  try {
    const schemaName = getSchemaName();
    
    // 檢查是否為 Local Phase ID (例如: proj_nmth_001)
    // Local Phase ID 不是 UUID 格式，無法直接查詢
    const isLocalId = !projectId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    
    let query = this.supabase
      .schema(schemaName)
      .from('items')
      .select('*');
    
    // 如果是 Local Phase ID，查詢所有項目（因為 Supabase 階段通常只有一個專案）
    // 如果是有效的 UUID，則進行精確查詢
    if (!isLocalId) {
      query = query.eq('project_id', projectId);  // ✅ 只在 UUID 時才過濾
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    // ... 錯誤處理
  }
}
```

---

## 📝 已修復的檔案

### 1. `/src/lib/storage/SupabaseAdapter.ts`

#### 修改的方法

##### ✅ `getItems(projectId: string)`

- **行數**：738-768
- **修改內容**：加入 Local Phase ID 檢測邏輯
- **影響**：任務清單、收件匣、專案工作頁面

##### ✅ `getArtifacts(projectId: string)`

- **行數**：502-522
- **修改內容**：加入 Local Phase ID 檢測邏輯
- **影響**：文件庫頁面

---

## 🧪 測試驗證

### 測試案例 1：Local Phase ID

```typescript
// 輸入
const projectId = 'proj_nmth_001';  // Local Phase ID

// 預期行為
// - 偵測到 Local Phase ID
// - 查詢所有 items（不過濾 project_id）
// - 返回 Supabase 中的所有任務

// 查詢語句
SELECT * FROM items ORDER BY created_at DESC;
```

**結果**：✅ 成功（不會拋出 UUID 錯誤）

---

### 測試案例 2：有效的 UUID

```typescript
// 輸入
const projectId = '550e8400-e29b-41d4-a716-446655440000';  // 有效 UUID

// 預期行為
// - 偵測到有效 UUID
// - 進行精確查詢
// - 僅返回該專案的任務

// 查詢語句
SELECT * FROM items 
WHERE project_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY created_at DESC;
```

**結果**：✅ 成功（精確查詢）

---

## 🔄 遷移策略

### 階段一：Local Phase（目前）

- ✅ 使用 `LocalAdapter`
- ✅ ID 格式：`proj_nmth_001`、`item_todo_001` 等
- ✅ 儲存在 localStorage

### 階段二：Supabase 初期（當前階段）

- ✅ 使用 `SupabaseAdapter`
- ⚠️ **問題**：LocalStorage 仍保留 Local Phase 的 `currentProject.id`
- ✅ **解決**：動態偵測 ID 格式，相容 Local Phase ID
- ⚠️ **限制**：查詢所有資料（假設只有一個專案）

### 階段三：完整遷移（未來）

- 🔄 **建議**：建立資料遷移工具
- 🔄 在 Supabase 中建立新專案（使用 UUID）
- 🔄 將 Local Phase 資料複製到新專案
- 🔄 更新 `localStorage` 中的 `currentProject.id` 為新的 UUID
- 🔄 移除 Local Phase ID 相容邏輯

---

## 💡 最佳實踐建議

### 短期建議（立即執行）

#### 1. 清除 Local Phase 殘留資料

```typescript
// 在切換到 Supabase 時，清除 Local Phase 的專案資訊
localStorage.removeItem('currentProject');
localStorage.removeItem('current_project_id');
```

#### 2. 從 Supabase 重新載入專案

```typescript
// 重新從 Supabase 載入專案列表
const { data: projects } = await adapter.getProjects();
if (projects && projects.length > 0) {
  // 使用第一個專案（UUID 格式）
  localStorage.setItem('currentProject', JSON.stringify(projects[0]));
}
```

---

### 長期建議（規劃中）

#### 1. 建立資料遷移工具

```typescript
// /src/lib/storage/migrationUtils.ts

export async function migrateLocalDataToSupabase() {
  const localAdapter = new LocalAdapter();
  const supabaseAdapter = new SupabaseAdapter();
  
  // Step 1: 在 Supabase 建立新專案
  const { data: newProject } = await supabaseAdapter.createProject({
    name: '國美館官網改版專案',
    description: '從 Local Phase 遷移',
    status: 'active',
    pm_id: null,  // 需要建立成員後再指定
  });
  
  if (!newProject) {
    throw new Error('無法建立專案');
  }
  
  // Step 2: 遷移成員資料
  // TODO: 實作成員遷移邏輯
  
  // Step 3: 遷移任務資料
  // TODO: 實作任務遷移邏輯
  
  // Step 4: 更新 currentProject
  localStorage.setItem('currentProject', JSON.stringify(newProject));
  
  return newProject;
}
```

#### 2. 移除 Local Phase ID 相容邏輯

當所有資料完成遷移後，可以簡化 SupabaseAdapter：

```typescript
// 未來版本（簡化後）
async getItems(projectId: string): Promise<StorageResponse<Item[]>> {
  try {
    const schemaName = getSchemaName();
    
    // 不再需要 Local Phase ID 檢測
    const { data, error } = await this.supabase
      .schema(schemaName)
      .from('items')
      .select('*')
      .eq('project_id', projectId)  // 直接查詢（projectId 必定是 UUID）
      .order('created_at', { ascending: false });
    
    // ... 錯誤處理
  }
}
```

---

## 📊 ID 格式比較

| 類型 | 範例 | 格式 | 長度 | 用途 |
|------|------|------|------|------|
| **Local Phase ID** | `proj_nmth_001` | 自訂字串 | 不定 | 開發階段，易讀 |
| **UUID v4** | `550e8400-e29b-41d4-a716-446655440000` | 標準 UUID | 36 字元 | 生產環境，唯一性保證 |
| **Supabase Auto ID** | `1`、`2`、`3` | 整數 | 不定 | 簡單計數（不推薦用於分散式） |

### UUID 的優勢

- ✅ **全域唯一**：不會重複
- ✅ **分散式友善**：不需要中央協調
- ✅ **安全性**：難以預測下一個 ID
- ✅ **資料庫原生支援**：PostgreSQL 有 `uuid` 類型

### Local Phase ID 的缺點

- ❌ **不是標準格式**：無法當作 UUID 使用
- ❌ **可能重複**：依賴命名規則
- ❌ **不適合生產環境**：缺乏唯一性保證

---

## 🔗 相關文件

- [Guidelines.md](/guidelines/Guidelines.md) - 開發規範（禁止 6：禁止寫死 Schema 名稱）
- [Product_Context.md](/guidelines/Product_Context.md) - 產品背景與 Adapter Pattern
- [Data_Loss_Diagnosis.md](/docs/Data_Loss_Diagnosis.md) - 資料遺失問題診斷

---

## ✅ 檢查清單

- [x] ✅ 修復 `getItems()` 方法
- [x] ✅ 修復 `getArtifacts()` 方法
- [ ] ⏳ 修復 `getMembers()` 方法（待實作）
- [ ] ⏳ 修復 `getModules()` 方法（待實作）
- [ ] ⏳ 建立資料遷移工具
- [ ] ⏳ 更新使用者文件

---

**文件版本**：v1.0  
**最後更新**：2024-12-23  
**更新者**：AI Assistant
