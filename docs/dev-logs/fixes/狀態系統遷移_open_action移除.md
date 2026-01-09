# 狀態系統遷移：移除舊狀態值

> **問題回報**：為何多了 "open action" 狀態標籤？  
> **修復日期**：2024-12-21  
> **根本原因**：localStorage 中存在舊的狀態數據

---

## 🔍 問題分析

### 狀態不一致的原因

系統在前期開發時使用了多套狀態系統：
- **舊的工作狀態**：`open`, `waiting`, `done`, `canceled`
- **舊的 CR 狀態**：`requested`, `reviewing`, `approved`, `rejected`, `implemented`
- **舊的 Decision 狀態**：`active`, `confirmed`, `superseded`, `deprecated`

在更新到統一狀態系統後（rules.md 2.2），定義了 5 個標準狀態：
- ✅ `not_started`（未開始）
- ✅ `in_progress`（進行中）
- ✅ `blocked`（卡關）
- ✅ `awaiting_response`（待回覆）
- ✅ `completed`（已完成）

但是，**localStorage 中的舊數據沒有被更新**，導致舊狀態值（如 `open`, `action`）仍然存在於系統中。

---

## ✅ 解決方案

### 1. 創建狀態遷移工具（statusMigration.ts）

**檔案位置**：`/src/lib/storage/statusMigration.ts`

#### 功能：
- ✅ **舊狀態到新狀態的對應表**：定義所有舊狀態如何映射到新狀態
- ✅ **自動遷移函數**：掃描 localStorage 並更新所有任務的狀態
- ✅ **檢測需求**：判斷是否需要執行遷移

#### 遷移對應表：

| 舊狀態 | 新狀態 | 說明 |
|--------|--------|------|
| `open` | `not_started` | 待處理 → 未開始 |
| `waiting` | `awaiting_response` | 等待中 → 待回覆 |
| `done` | `completed` | 完成 → 已完成 |
| `canceled` | `completed` | 取消 → 已完成 |
| `requested` | `not_started` | 已提出 → 未開始 |
| `reviewing` | `in_progress` | 評估中 → 進行中 |
| `approved` | `in_progress` | 已核准 → 進行中 |
| `rejected` | `completed` | 已駁回 → 已完成 |
| `implemented` | `completed` | 已實作 → 已完成 |
| `active` | `completed` | 有效 → 已完成 |
| `confirmed` | `completed` | 已確認 → 已完成 |
| `superseded` | `completed` | 已被取代 → 已完成 |
| `deprecated` | `completed` | 已廢止 → 已完成 |

```typescript
export function migrateStatus(oldStatus: string): ItemStatus {
  const newStatus = OLD_TO_NEW_STATUS[oldStatus];
  
  if (!newStatus) {
    console.warn(`Unknown status: "${oldStatus}", defaulting to "not_started"`);
    return 'not_started';
  }
  
  return newStatus;
}
```

---

### 2. 在應用啟動時自動執行遷移（App.tsx）

**修改內容**：

```typescript
import { checkMigrationNeeded, migrateAllItemsStatus } from '../lib/storage/statusMigration';

export default function App() {
  useEffect(() => {
    // 1. 執行狀態遷移（如果需要）
    if (checkMigrationNeeded()) {
      console.log('🔄 檢測到舊狀態數據，開始遷移...');
      const migratedCount = migrateAllItemsStatus();
      console.log(`✅ 狀態遷移完成，共更新 ${migratedCount} 筆任務`);
    }
    
    // 2. Initialize mock data...
  }, []);
}
```

**執行流程**：
1. ✅ 檢查 localStorage 是否有舊狀態數據
2. ✅ 如果有，自動執行遷移
3. ✅ 更新所有任務的狀態值
4. ✅ 記錄遷移數量到 console

---

### 3. 增強 statusHelpers 錯誤處理

**修改**：`getStatusColor()` 和 `getStatusLabel()` 函數

**目的**：即使遇到未知狀態，也能正常顯示而不崩潰

```typescript
export function getStatusLabel(status: string): string {
  // 優先使用標準狀態
  if (status in STATUS_LABELS) {
    return STATUS_LABELS[status as ItemStatus];
  }
  
  // 如果是舊狀態，返回原值並提示需要遷移
  console.warn(`[Status] Unknown status: "${status}", please run migration`);
  return status;
}

export function getStatusColor(status: string): string {
  switch (status as ItemStatus) {
    case 'not_started':
      return 'bg-muted text-muted-foreground border border-border';
    // ... 其他狀態
    default:
      // 未知狀態使用警告色（橙色背景）
      console.warn(`[Status] Unknown status color: "${status}"`);
      return 'bg-amber-50 text-amber-700 border border-amber-200';
  }
}
```

**好處**：
- ✅ 遷移前：舊狀態顯示為橙色背景（警告色）
- ✅ 遷移後：所有狀態使用正確的顏色
- ✅ console 提示：方便開發時發現問題

---

## 📋 修改文件清單

| 檔案 | 類型 | 說明 |
|------|------|------|
| `/src/lib/storage/statusMigration.ts` | 新增 | 狀態遷移工具 |
| `/src/app/App.tsx` | 修改 | 啟動時自動執行遷移 |
| `/src/lib/storage/statusHelpers.ts` | 修改 | 增強錯誤處理 |
| `/src/app/tasks/components/ItemCard.tsx` | 修改 | 使用 `getStatusLabel()` |

---

## 🎯 使用說明

### 自動遷移（推薦）

**方式**：重新整理頁面

系統會自動：
1. 檢測是否有舊狀態
2. 執行遷移
3. 在 console 顯示結果

```
🔄 檢測到舊狀態數據，開始遷移...
[Status Migration] Migrating status: "open" -> "not_started"
[Status Migration] Migrating status: "done" -> "completed"
✅ 狀態遷移完成，共更新 23 筆任務
```

### 手動執行（開發用）

**在 Console 執行**：

```javascript
// 引入遷移函數
import { migrateAllItemsStatus } from './src/lib/storage/statusMigration';

// 執行遷移
const count = migrateAllItemsStatus();
console.log(`已更新 ${count} 筆任務`);
```

---

## ✅ 驗證結果

### 遷移前
- ❌ 顯示 "open" 狀態（橙色背景）
- ❌ 顯示 "action" 標籤
- ❌ Console 出現警告

### 遷移後
- ✅ 顯示 "未開始" 狀態（灰色背景）
- ✅ 所有狀態使用正確顏色
- ✅ Console 無警告訊息

---

## 🔧 統一狀態系統（最終版）

根據 `/docs/spac/rules.md` 2.2：

### 所有任務類型統一使用 5 個狀態：

| 狀態值 | 中文名稱 | 顏色 | 適用情境 |
|--------|---------|------|---------|
| `not_started` | 未開始 | 灰色 | 任務尚未開始處理 |
| `in_progress` | 進行中 | 藍色 | 任務正在處理中 |
| `blocked` | 卡關 | 紅色 | 遇到障礙無法繼續 |
| `awaiting_response` | 待回覆 | 橙色 | 等待他人回覆 |
| `completed` | 已完成 | 綠色 | 任務已完成 |

### 特殊規則

**Decision 類型**：
- ❌ 不提供狀態下拉選擇器
- ✅ 狀態由系統控制（meta.status）
- ✅ 生命週期：`active` → `deprecated`（但這些是 meta.status，不是 Item.status）

---

## 📚 相關文件

- `/src/lib/storage/statusMigration.ts` - 遷移工具
- `/src/lib/storage/statusHelpers.ts` - 狀態輔助函數
- `/docs/spac/rules.md` - 業務規則（2.2 狀態系統）
- `/docs/任務清單模組_Rules符合性修正總結.md` - 符合性報告

---

## 🎓 經驗教訓

### 為什麼會出現這個問題？

1. **漸進式重構**：系統從多套狀態系統逐步統一
2. **數據持久化**：localStorage 保存的舊數據沒有自動更新
3. **缺乏遷移機制**：之前沒有自動遷移工具

### 最佳實踐

1. ✅ **提供遷移工具**：數據結構變更時必須提供遷移腳本
2. ✅ **自動執行**：在應用啟動時自動檢測並遷移
3. ✅ **向後兼容**：舊數據即使未遷移也能正常顯示（降級處理）
4. ✅ **版本控制**：記錄數據版本，避免重複遷移

---

**問題狀態**：✅ 已解決  
**遷移狀態**：✅ 自動執行  
**數據一致性**：✅ 達成

---

## 🚀 後續建議

### 1. 添加數據版本號

在 localStorage 中記錄數據版本：

```typescript
interface DataVersion {
  version: number;
  migrations: string[];
}

localStorage.setItem('data_version', JSON.stringify({
  version: 2,
  migrations: ['status_migration_v1_to_v2']
}));
```

### 2. 遷移歷史記錄

記錄所有已執行的遷移，避免重複執行：

```typescript
function hasMigrationRun(migrationId: string): boolean {
  const history = JSON.parse(localStorage.getItem('migration_history') || '[]');
  return history.includes(migrationId);
}
```

### 3. 備份機制

執行遷移前自動備份：

```typescript
function backupBeforeMigration() {
  const backup = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.endsWith('_items')) {
      backup[key] = localStorage.getItem(key);
    }
  }
  localStorage.setItem('backup_' + Date.now(), JSON.stringify(backup));
}
```

---

**END OF DOCUMENT**
