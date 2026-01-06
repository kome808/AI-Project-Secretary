# 任務清單模組 - Rules.md 符合性修正總結

> **修正日期**：2024-12-21  
> **修正範圍**：任務清單模組核心邏輯  
> **基準文件**：`/docs/spac/rules.md`

---

## ✅ 已完成的修正

### 1. 資料類型層（types.ts）

#### 修正 1.1：ItemType 定義
```typescript
// 修正前
export type ItemType = 'action' | 'pending' | 'decision' | 'rule' | 'issue' | 'cr';

// 修正後
export type ItemType = 'general' | 'pending' | 'cr' | 'decision';
```
**符合規則**：rules.md 2.1

#### 修正 1.2：ItemStatus 定義
```typescript
// 修正前
export type ItemStatus = 'suggestion' | 'open' | 'in_progress' | 'pending' | 
  'blocked' | 'done' | 'requested' | 'reviewing' | 'approved' | 'rejected' | 
  'implemented' | 'canceled';

// 修正後
export type ItemStatus = 'not_started' | 'in_progress' | 'blocked' | 
  'awaiting_response' | 'completed';
```
**符合規則**：rules.md 2.2 - 統一全系統狀態命名

#### 修正 1.3：移除 CR 專屬狀態
```typescript
// 修正前
export interface CRMeta {
  cr_status: CRStatus;  // ❌ 違反統一狀態規則
  risk_level: CRRiskLevel;
  ...
}

// 修正後
export interface CRMeta {
  // ✅ 移除 cr_status，CR 使用統一的 Item.status
  risk_level: CRRiskLevel;
  ...
}
```
**符合規則**：rules.md 2.2 - "禁止為 CR、Decision 另外創造一套專屬狀態名稱"

#### 修正 1.4：Type Guard 清理
```typescript
// 修正前
export function isDecisionItem(item: Item): item is Item & { meta: DecisionMeta } {
  return item.type === 'decision' || item.type === 'rule';  // ❌ 'rule' 不存在
}

// 修正後
export function isDecisionItem(item: Item): item is Item & { meta: DecisionMeta } {
  return item.type === 'decision';  // ✅ 僅檢查 decision
}
```

---

### 2. 輔助工具層（statusHelpers.ts）

#### 新增：狀態輔助函數
**檔案位置**：`/src/lib/storage/statusHelpers.ts`

**功能**：
- `STATUS_LABELS`: 狀態顯示名稱對應表（中英文）
- `STATUS_OPTIONS`: 狀態選項列表（供表單使用）
- `getStatusLabel()`: 取得狀態顯示名稱
- `getStatusColor()`: 取得狀態顏色樣式
- `isCompletedStatus()`: 判斷是否已完成
- `isActiveStatus()`: 判斷是否進行中

**用途**：統一全系統的狀態顯示與邏輯判斷

---

### 3. UI層 - 主頁面（TasksPage.tsx）

#### 修正 3.1：Tab 篩選邏輯
```typescript
// 修正前
if (tab.id === 'actions') {
  count = items.filter(i => 
    i.type === 'action' &&  // ❌ 'action' 不存在
    i.assignee === currentUser?.email &&
    !['done', 'canceled'].includes(i.status)  // ❌ 舊狀態值
  ).length;
}

// 修正後
if (tab.id === 'actions') {
  count = items.filter(i => 
    i.type === 'general' &&  // ✅ 使用 'general'
    i.assignee_id === currentUser?.id &&
    i.status !== 'completed'  // ✅ 使用新狀態值
  ).length;
}
```

#### 修正 3.2：待確認/變更/決議 TAB
```typescript
// ✅ 待確認：Type = pending
if (tab.id === 'pending') {
  count = items.filter(i => 
    i.type === 'pending' && 
    i.status !== 'completed'
  ).length;
}

// ✅ 變更：Type = cr
if (tab.id === 'cr') {
  count = items.filter(i => 
    i.type === 'cr' && 
    i.status !== 'completed'
  ).length;
}

// ✅ 決議：Type = decision 且 meta.status = active
if (tab.id === 'decisions') {
  count = items.filter(i => 
    i.type === 'decision' && 
    i.meta?.status === 'active'
  ).length;
}
```
**符合規則**：rules.md 3.1 - "TAB 的篩選依據 = Type（不是 Status）"

---

### 4. UI層 - 視圖組件

#### 修正 4.1：ActionsView（我的任務）
```typescript
// ✅ 修正 type 篩選
return items.filter(item => 
  item.type === 'general' &&  // 修正前：'action'
  item.assignee_id === currentUser?.id &&
  item.status !== 'completed'  // 修正前：!['done', 'canceled'].includes(i.status)
)
```

#### 修正 4.2：PendingView（待確認）
```typescript
// ✅ 修正 type 和 status 篩選
return items.filter(item => 
  item.type === 'pending' && 
  item.status !== 'completed'  // 修正前：!['done', 'canceled'].includes(item.status)
)
```

#### 修正 4.3：CRView（變更）
```typescript
// ✅ 修正篩選邏輯和 filter type
type FilterType = 'all' | 'high_risk' | 'not_started' | 'in_progress' | 
  'blocked' | 'awaiting_response';
// 修正前：'requested' | 'reviewing' | 'approved'（CR 專屬狀態）

// ✅ 修正 status 篩選
return items.filter(item => 
  item.type === 'cr' && 
  item.status !== 'completed'
  // 修正前：!['implemented', 'rejected', 'canceled'].includes(item.status)
)

// ✅ 修正篩選器標籤
<Badge>尚未開始 ({counts.not_started})</Badge>
<Badge>進行中 ({counts.in_progress})</Badge>
<Badge>已封鎖 ({counts.blocked})</Badge>
<Badge>等待回應 ({counts.awaiting_response})</Badge>
// 修正前：requested/reviewing/approved
```

**重要說明**：
- CR 不再有專屬狀態（requested/reviewing/approved/rejected/implemented）
- 統一使用 5 個標準狀態（not_started/in_progress/blocked/awaiting_response/completed）
- 若需追蹤 CR 特定資訊（如審批階段），應放在 `meta` 中的其他欄位

---

## 📊 修正對照表

### Type 對應
| 修正前 | 修正後 | 用途 |
|-------|-------|-----|
| `action` | `general` | 一般任務 |
| `pending` | `pending` | 待確認（保持不變） |
| `cr` | `cr` | 變更需求（保持不變） |
| `decision` | `decision` | 決議（保持不變） |
| ~~`rule`~~ | ❌ 移除 | 不再使用 |
| ~~`issue`~~ | ❌ 移除 | 不再使用 |

### Status 對應
| 修正前 | 修正後 | 顯示名稱 |
|-------|-------|---------|
| ~~`open`~~ | `not_started` | 未開始 |
| `in_progress` | `in_progress` | 進行中 |
| `blocked` | `blocked` | 卡關 |
| ~~`pending`~~ | `awaiting_response` | 待回覆 |
| ~~`done`~~ | `completed` | 已完成 |
| ~~`suggestion`~~ | ❌ 移除 | （用於 Inbox，非正式 Item） |
| ~~`requested`~~ | ❌ 移除 | （CR 專屬，違反規則） |
| ~~`reviewing`~~ | ❌ 移除 | （CR 專屬，違反規則） |
| ~~`approved`~~ | ❌ 移除 | （CR 專屬，違反規則） |
| ~~`rejected`~~ | ❌ 移除 | （CR 專屬，違反規則） |
| ~~`implemented`~~ | ❌ 移除 | （CR 專屬，違反規則） |
| ~~`canceled`~~ | ❌ 移除 | （非標準狀態） |

---

## ⏳ 待修正項目（建議後續處理）

### P1 優先級
1. **ItemTree 組件**：更新狀態顯示邏輯（引入 `statusHelpers`）
2. **GeneralItemDialog 組件**：更新 Type 和 Status 選項
3. **ProjectWorkView**：架構調整（WorkPackage vs Item 區分）
4. **LocalAdapter**：更新 mock 資料的 type/status 值

### P2 優先級
5. **Inbox**：確認入庫時的 type 選項正確
6. **Dashboard**：統計邏輯使用新的 type/status
7. **全域搜尋**：確保所有 hardcoded type/status 已更新

---

## ✅ 驗收檢核清單（依據 rules.md 11）

### 已通過
- [x] **Type 一致性**：核心組件已使用 `general | pending | cr | decision`
- [x] **Status 一致性**：核心組件已使用 `not_started | in_progress | blocked | awaiting_response | completed`
- [x] **TAB 篩選**：
  - [x] 我的任務 TAB 顯示 `type === 'general'` 且指派給當前使用者
  - [x] 待確認 TAB 顯示 `type === 'pending'`
  - [x] 變更 TAB 顯示 `type === 'cr'`
  - [x] 決議 TAB 顯示 `type === 'decision'`
- [x] **統一狀態規則**：CR 不再使用專屬狀態

### 待驗證（需後續測試）
- [ ] **跨視角同步**：在任一視角改 Item，其他視角同步（需實際測試）
- [ ] **未歸屬處理**：未歸屬 Item 顯示在「未分類」（需完成 ProjectWorkView）
- [ ] **Type badge 顯示**：專案工作底下能看見 Item 的 Type badge

---

## 📝 設計決策記錄

### 決策 1：CR 狀態系統
**問題**：CR 原有專屬狀態（requested/reviewing/approved/rejected/implemented）  
**決定**：移除專屬狀態，統一使用 5 個標準狀態  
**理由**：rules.md 2.2 明確規定「禁止為 CR、Decision 另外創造一套專屬狀態名稱」  
**影響**：
- ✅ 簡化系統，降低認知負擔
- ✅ 權限控制更統一
- ⚠️ 若需追蹤審批流程，需在 `meta` 中另外記錄（如 `approval_stage`）

### 決策 2：Decision meta.status 保留
**問題**：DecisionMeta 有 `status: 'active' | 'deprecated'`  
**決定**：保留此欄位  
**理由**：
- 此為決議的「生命週期狀態」，不同於 Item 的「進度狀態」
- 用於標示決議是否仍然有效（active）或已廢棄（deprecated）
- 不違反 rules.md，因為這不是另一套「進度狀態」

### 決策 3：Status 英文值 vs 中文值
**問題**：資料庫存英文（not_started）還是中文（未開始）？  
**決定**：資料庫存英文，UI 顯示中文  
**理由**：
- 資料庫用英文是業界最佳實踐
- rules.md 中文名稱是「業務概念」，不是「實作格式」
- 透過 `statusHelpers.ts` 統一轉換

---

## 🎯 後續建議

### 1. 完整測試
- 測試跨視角同步（在一個 TAB 改狀態，其他 TAB 立即反映）
- 測試 Type 變更時的連動（例如將 general 改為 pending，應出現在待確認 TAB）

### 2. 文件更新
- 更新 `/docs/plan/Tasks_View_CR.md`，移除 CR 專屬狀態的描述
- 確認其他 plan 文件是否有提到舊的 type/status

### 3. 資料遷移（若已有舊資料）
- 寫 migration script 將舊的 type/status 轉換為新值
- 例如：`action` → `general`, `done` → `completed`

---

## 📚 相關文件

- `/docs/spac/rules.md` - 全域業務規則（最高優先級）
- `/docs/任務清單模組_Rules符合性檢查報告.md` - 詳細檢查報告
- `/src/lib/storage/statusHelpers.ts` - 狀態輔助函數
- `/src/lib/storage/types.ts` - 資料類型定義

---

**修正狀態**：✅ 核心邏輯已完成，待後續驗證與測試

**END OF SUMMARY**
