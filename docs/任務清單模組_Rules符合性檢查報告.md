# 任務清單模組 - Rules.md 符合性檢查報告

> **檢查日期**：2024-12-21  
> **檢查範圍**：任務清單模組（Tasks）  
> **參照文件**：`/docs/spac/rules.md`

---

## ✅ 已修正的問題

### 1. ItemType 定義 (types.ts)
- **原問題**：`'action' | 'pending' | 'decision' | 'rule' | 'issue' | 'cr'`
- **已修正為**：`'general' | 'pending' | 'cr' | 'decision'`
- **符合規則**：rules.md 2.1

### 2. ItemStatus 定義 (types.ts)
- **原問題**：`'open' | 'in_progress' | 'pending' | 'blocked' | 'done' | ...`
- **已修正為**：`'not_started' | 'in_progress' | 'blocked' | 'awaiting_response' | 'completed'`
- **符合規則**：rules.md 2.2

### 3. CR 專屬狀態 (types.ts)
- **原問題**：`CRMeta` 包含 `cr_status: CRStatus`，違反統一狀態規則
- **已修正**：移除 `cr_status` 欄位，CR 與其他任務使用相同的 `ItemStatus`
- **符合規則**：rules.md 2.2 - "全系統所有任務類型都使用同一套狀態命名"

### 4. TasksPage 篩選邏輯
- **原問題**：使用 `type === 'action'` 篩選
- **已修正為**：使用 `type === 'general'` 篩選
- **符合規則**：rules.md 2.1

### 5. 狀態輔助函數 (statusHelpers.ts)
- **新增**：`STATUS_LABELS`, `getStatusLabel()`, `getStatusColor()` 等輔助函數
- **用途**：統一狀態的顯示與樣式處理

---

## ⚠️ 需要進一步修正的問題

### A. 資料結構層面

#### A1. LocalAdapter 中的舊資料格式
**位置**：`/src/lib/storage/LocalAdapter.ts`  
**問題**：Mock 資料可能仍使用舊的 type/status 值  
**需要**：更新所有 mock 資料為新的 type/status

#### A2. Inbox 中的建議卡處理
**位置**：`/src/app/inbox/`  
**問題**：入庫時的 type 選擇可能仍有舊值  
**需要**：更新 type 選項為 `general | pending | cr | decision`

---

### B. UI 組件層面

#### B1. ActionsView 篩選邏輯
**位置**：`/src/app/tasks/views/ActionsView.tsx`  
**問題**：
- 仍使用 `type === 'action'` 篩選
- Status 判斷使用舊值（如 `'done'`, `'blocked'`）

**需要修正**：
```typescript
// 修正前
const myActions = items.filter(i => 
  i.type === 'action' && 
  i.assignee === currentUser?.email &&
  !['done', 'canceled'].includes(i.status)
);

// 修正後
const myActions = items.filter(i => 
  i.type === 'general' && 
  i.assignee_id === currentUser?.id &&
  i.status !== 'completed'
);
```

#### B2. PendingView 篩選邏輯
**位置**：`/src/app/tasks/views/PendingView.tsx`  
**問題**：Status 判斷可能使用舊值

#### B3. CRView 狀態顯示
**位置**：`/src/app/tasks/views/CRView.tsx`  
**問題**：
- 可能仍顯示 CR 專屬狀態（requested/reviewing/approved/rejected/implemented）
- 應改用統一的 5 個狀態

**需要修正**：
- 移除 CR 專屬狀態的 UI 顯示
- 使用 `STATUS_LABELS` 顯示統一狀態
- 若需保留 CR 特定資訊，應移至 `meta` 中的其他欄位（如 `approval_stage`）

#### B4. DecisionsView 狀態判斷
**位置**：`/src/app/tasks/views/DecisionsView.tsx`  
**問題**：使用 `meta.status === 'active'` 判斷決議是否有效

**說明**：
- `DecisionMeta.status` 是決議的「生命週期狀態」（active/deprecated）
- 不同於 `Item.status` 的「進度狀態」
- 這個設計是合理的，不違反 rules.md

#### B5. ProjectWorkView 架構問題
**位置**：`/src/app/tasks/views/ProjectWorkView.tsx`  
**問題**：
- 根據 rules.md，ProjectWork 應該是獨立的 `WorkPackage` 實體
- View 應該顯示 WorkPackage 列表，並展開其底下的 Items
- 目前可能錯誤地把 Item 當作 WorkPackage 顯示

**需要修正**：
```typescript
// 應該載入兩種資料：
// 1. WorkPackages (專案工作)
const { data: workPackages } = await storage.getWorkPackages(projectId);

// 2. Items (任務項目，可歸屬到 WorkPackage)
const { data: items } = await storage.getItems(projectId);

// 顯示邏輯：
// - 顯示每個 WorkPackage
// - 展開後顯示該 WorkPackage 底下的 Items (item.work_package_id === wp.id)
// - 顯示未歸屬的 Items (item.work_package_id === null)
```

---

### C. 通用組件層面

#### C1. ItemTree 組件
**位置**：`/src/app/tasks/components/ItemTree.tsx`  
**問題**：Status 顯示/選擇可能使用舊值

**需要修正**：
- 引入 `STATUS_LABELS` 和 `STATUS_OPTIONS`
- 更新所有狀態相關的顯示和邏輯

#### C2. GeneralItemDialog 組件
**位置**：`/src/app/tasks/components/GeneralItemDialog.tsx`  
**問題**：Type 和 Status 選項可能使用舊值

**需要修正**：
```typescript
// Type 選項
const TYPE_OPTIONS = [
  { value: 'general', label: '一般任務' },
  { value: 'pending', label: '待確認' },
  { value: 'cr', label: '變更' },
  { value: 'decision', label: '決議' },
];

// Status 選項
import { STATUS_OPTIONS } from '../../../lib/storage/statusHelpers';
```

---

## 📋 修正優先順序

### P0 (高優先級 - 阻斷性)
1. **修正所有 View 的 type 篩選**：`'action'` → `'general'`
2. **修正所有 View 的 status 判斷**：使用新的 5 個狀態值
3. **修正 ProjectWorkView 的架構**：正確區分 WorkPackage 和 Item

### P1 (中優先級 - 功能性)
4. **更新通用組件**：ItemTree, GeneralItemDialog 等
5. **更新 LocalAdapter 的 mock 資料**
6. **更新 Inbox 的 type 選項**

### P2 (低優先級 - 優化)
7. **統一使用 statusHelpers**：所有狀態顯示都使用輔助函數
8. **添加 TypeScript 類型檢查**：確保沒有遺漏的舊值

---

## 🔍 驗收檢核 (依據 rules.md 11)

修正完成後，必須確認以下項目：

- [ ] **Type 一致性**：所有地方使用 `general | pending | cr | decision`
- [ ] **Status 一致性**：所有地方使用 `not_started | in_progress | blocked | awaiting_response | completed`
- [ ] **TAB 篩選正確**：
  - 待確認 TAB 顯示 `type === 'pending'` 的 Items
  - 變更 TAB 顯示 `type === 'cr'` 的 Items
  - 決議 TAB 顯示 `type === 'decision'` 的 Items
- [ ] **專案工作視圖正確**：
  - 顯示 WorkPackage 列表
  - 展開後顯示該 WP 底下的 Items
  - Items 顯示 Type badge（一般/待確認/變更/決議）
- [ ] **跨視角同步**：在任一視角改 Item 狀態/負責人/期限，其他視角立即同步
- [ ] **未歸屬處理**：未歸屬 Item 一律落在「未分類/未歸屬」群組

---

## 📝 建議的修正順序

1. ✅ **已完成**：修正 types.ts 的定義
2. ✅ **已完成**：修正 TasksPage.tsx 的篩選邏輯
3. ✅ **已完成**：建立 statusHelpers.ts
4. ⏳ **進行中**：修正各個 View 組件
5. 🔜 **待辦**：修正通用組件
6. 🔜 **待辦**：更新 LocalAdapter mock 資料
7. 🔜 **待辦**：執行完整的驗收檢核

---

**END OF REPORT**
