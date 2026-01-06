# 舊狀態快速修正指南

## 需要修正的檔案清單

以下檔案中仍在使用舊狀態值，需要批次修正：

### 1. 狀態過濾與比較
- `item.status === 'done'` → `item.status === 'completed'`
- `item.status === 'open'` → `item.status === 'not_started'`  
- `item.status === 'pending'` → `item.status === 'awaiting_response'`
- `status: 'open'` → `status: 'not_started'`
- `status: 'done'` → `status: 'completed'`

### 2. 需修正的檔案

#### ActionsBoard.tsx
- Line 20: `status === 'open' || status === 'pending'` → `status === 'not_started' || status === 'awaiting_response'`
- Line 22: `status === 'done'` → `status === 'completed'`
- Line 43: `status="open"` → `status="not_started"`
- Line 61: `status="done"` → `status="completed"`

#### BoardColumn.tsx  
- Line 27: `status === 'open'` → `status === 'not_started'`
- Line 28: `status === 'pending'` → `status === 'awaiting_response'`

#### CRDetail.tsx
- Line 81: `status: 'open'` → `status: 'not_started'`
- Line 131: `status === 'done'` → `status === 'completed'`
- Line 313, 314: `status === 'done'` → `status === 'completed'`

#### DashboardPage.tsx
- Line 169: `status === 'done'` → `status === 'completed'`
- Line 218: `status === 'done'` → `status === 'completed'`
- Line 605: `status: 'open'` → `status: 'not_started'`
- Line 960: `status === 'done'` → `status === 'completed'`

#### CreateDecisionDialog.tsx
- Line 63: `status: 'open'` → `status: 'not_started'`

#### ExecutionMapPage.tsx
- Line 90: `status: 'done'` → `status: 'completed'`
- Line 120: `status === 'done'` → `status === 'completed'`

#### ModuleCard.tsx
- Line 33: `status === 'done'` → `status === 'completed'`

#### InboxPage.tsx
- Line 97: `newStatus = 'open'` → `newStatus = 'not_started'`
- Line 110: `newStatus = 'open'` → `newStatus = 'not_started'`
- Line 236: `newStatus = 'open'` → `newStatus = 'not_started'`

#### PendingDetail.tsx
- Line 162: `status: 'done'` → `status: 'completed'`
- Line 189: `status: 'open'` → `status: 'not_started'`
- Line 203: `status: 'open'` → `status: 'not_started'`
- Line 217: `status: 'done'` → `status: 'completed'`

#### PendingPage.tsx
- Line 43: `status !== 'done'` → `status !== 'completed'`

#### ItemEditDialog.tsx
- Line 42: `'open'` → `'not_started'`
- Line 64: `|| 'open'` → `|| 'not_started'`
- Line 72: `'open'` → `'not_started'`

#### ProjectWorkView.tsx (已修正)
- Line 232: `|| 'open'` → `|| 'not_started'`

## 注意事項

### 不需修正的狀態使用
以下情況使用 `active` 是合法的，不需修正：
- `member.status === 'active'` (MemberStatus)
- `project.status === 'active'` (ProjectStatus)
- `meta.status === 'active'` (DecisionStatus)

### Select 下拉選項
Select 元件中的選項也需要更新：
```tsx
<SelectItem value="open">待處理</SelectItem>  // ❌
<SelectItem value="not_started">未開始</SelectItem>  // ✅

<SelectItem value="done">已完成</SelectItem>  // ❌
<SelectItem value="completed">已完成</SelectItem>  // ✅

<SelectItem value="pending">等待中</SelectItem>  // ❌
<SelectItem value="awaiting_response">待回覆</SelectItem>  // ✅
```
