# 狀態系統完整指南

## 系統狀態

### ✅ 已實作的功能

1. **標準狀態定義**（符合 rules.md 2.2）
   - 7 個合法的 ItemStatus
   - 統一的狀態顯示與顏色

2. **自動遷移工具**
   - 啟動時自動檢測舊狀態
   - 一鍵遷移到標準狀態
   - 遷移記錄與結果顯示

3. **向後相容處理** ⭐ NEW
   - `getStatusColor()` 自動處理舊狀態
   - `getStatusLabel()` 自動顯示正確標籤
   - **即使有舊資料也不會崩潰**

4. **管理介面**
   - 設定頁面可查看遷移狀態
   - 手動執行遷移功能
   - 重置遷移標記

---

## 標準狀態清單

### ItemStatus（7 個合法狀態）

#### AI 建議流程
| 狀態值 | 中文名稱 | 用途 | 顏色 |
|--------|---------|------|------|
| `suggestion` | 建議中 | AI 產生的建議（收件匣） | 藍色 |
| `rejected` | 已拒絕 | 已拒絕的建議 | 紅色 |

#### 標準任務狀態
| 狀態值 | 中文名稱 | 說明 | 顏色 |
|--------|---------|------|------|
| `not_started` | 未開始 | 任務尚未開始 | 灰色 |
| `in_progress` | 進行中 | 正在執行中 | 藍綠色 |
| `blocked` | 卡關 | 遇到阻礙無法進行 | 紅色 |
| `awaiting_response` | 待回覆 | 等待他人回應 | 橙色 |
| `completed` | 已完成 | 任務完成 | 綠色 |

---

## 向後相容機制 ⭐

### 工作原理

即使 localStorage 中仍有舊狀態（如 `active`, `open`, `done`），系統也能正常運作：

1. **自動對應顯示**
   ```typescript
   // 舊狀態會自動對應到新狀態的顏色與標籤
   getStatusColor('active')  // → 顯示「進行中」的藍綠色
   getStatusLabel('done')    // → 顯示「已完成」
   getStatusColor('open')    // → 顯示「未開始」的灰色
   ```

2. **警告訊息**
   - Console 會顯示警告，提醒您執行遷移
   - 但不會中斷 UI 顯示

3. **完整對應表**
   | 舊狀態 | → | 新狀態 | 顯示 |
   |--------|---|--------|------|
   | `open` | → | `not_started` | 未開始 |
   | `active` | → | `in_progress` | 進行中 |
   | `done` | → | `completed` | 已完成 |
   | `pending` | → | `awaiting_response` | 待回覆 |
   | `waiting` | → | `awaiting_response` | 待回覆 |
   | `archived` | → | `completed` | 已完成 |
   | `requested` | → | `in_progress` | 進行中 |
   | `reviewing` | → | `in_progress` | 進行中 |
   | `approved` | → | `completed` | 已完成 |
   | `implemented` | → | `completed` | 已完成 |
   | `canceled` | → | `completed` | 已完成 |
   | `superseded` | → | `completed` | 已完成 |
   | `deprecated` | → | `completed` | 已完成 |

---

## 執行遷移

### 方法 1：瀏覽器 Console（最快）

打開 Console（F12），執行：

```javascript
localStorage.removeItem('status_migration_completed');
location.reload();
```

系統會自動遷移所有資料。

---

### 方法 2：管理介面

1. 前往：**設定 → 系統管理 → 狀態遷移**
2. 點擊「重置標記」
3. 點擊「執行遷移」
4. 查看遷移結果

---

### 方法 3：手動批次遷移（進階）

如果自動遷移失敗，可在 Console 執行：

```javascript
// 定義對應規則
const MIGRATION_MAP = {
  'open': 'not_started',
  'active': 'in_progress',
  'done': 'completed',
  'pending': 'awaiting_response',
  'waiting': 'awaiting_response',
  'archived': 'completed',
  'requested': 'in_progress',
  'reviewing': 'in_progress',
  'approved': 'completed',
  'rejected': 'completed',
  'implemented': 'completed',
  'canceled': 'completed',
  'superseded': 'completed',
  'deprecated': 'completed'
};

// 遷移所有 items
let updated = 0;
Object.keys(localStorage)
  .filter(key => key.startsWith('items_'))
  .forEach(key => {
    const items = JSON.parse(localStorage.getItem(key));
    let changed = false;
    items.forEach(item => {
      if (item.status in MIGRATION_MAP) {
        const oldStatus = item.status;
        item.status = MIGRATION_MAP[oldStatus];
        console.log(`✅ "${item.title}": ${oldStatus} → ${item.status}`);
        changed = true;
        updated++;
      }
    });
    if (changed) {
      localStorage.setItem(key, JSON.stringify(items));
    }
  });

console.log(`✅ 完成！共更新 ${updated} 筆 items`);

// 遷移所有 work_packages
let wpUpdated = 0;
Object.keys(localStorage)
  .filter(key => key.startsWith('work_packages_'))
  .forEach(key => {
    const wps = JSON.parse(localStorage.getItem(key));
    let changed = false;
    wps.forEach(wp => {
      if (wp.status in MIGRATION_MAP) {
        const oldStatus = wp.status;
        wp.status = MIGRATION_MAP[oldStatus];
        console.log(`✅ WorkPackage "${wp.title}": ${oldStatus} → ${wp.status}`);
        changed = true;
        wpUpdated++;
      }
    });
    if (changed) {
      localStorage.setItem(key, JSON.stringify(wps));
    }
  });

console.log(`✅ 完成！共更新 ${wpUpdated} 筆 work_packages`);
location.reload();
```

---

## 常見問題

### Q1: 為什麼還會看到「Unknown status color」警告？

**A:** 這代表 localStorage 中仍有舊狀態的資料。系統已啟用向後相容，UI 會正常顯示，但建議執行遷移以完全清除舊資料。

---

### Q2: Project 使用 `active` 狀態是否正常？

**A:** 是的！`Project.status` 使用 `ProjectStatus` 類型，合法值包括：
- `active` ✅ 活躍專案
- `archived` ✅ 已封存
- `pending_deletion` ✅ 待刪除
- `deleted` ✅ 已刪除

這與 `ItemStatus` 是不同的類型，不需要遷移。

---

### Q3: Member 使用 `active` 狀態是否正常？

**A:** 是的！`Member.status` 使用 `MemberStatus` 類型，合法值包括：
- `invited` ✅ 已邀請
- `active` ✅ 活躍成員
- `disabled` ✅ 已停用

這與 `ItemStatus` 是不同的類型，不需要遷移。

---

### Q4: Decision 的 meta.status 使用 `active` 是否正常？

**A:** 是的！Decision 的 `meta.status` 使用 `DecisionStatus`，合法值包括：
- `active` ✅ 生效中
- `superseded` ✅ 已被取代
- `deprecated` ✅ 已廢止

這是決議的「生效狀態」，與 Item 的執行狀態無關。

---

## 開發注意事項

### 新增資料時必須使用標準狀態

❌ **錯誤**
```typescript
createItem({
  status: 'open',  // ❌ 舊狀態
  // ...
})
```

✅ **正確**
```typescript
createItem({
  status: 'not_started',  // ✅ 標準狀態
  // ...
})
```

---

### 條件判斷必須使用標準狀態

❌ **錯誤**
```typescript
if (item.status === 'done') {  // ❌
  // ...
}
```

✅ **正確**
```typescript
if (item.status === 'completed') {  // ✅
  // ...
}
```

---

### Select 下拉選項必須使用標準狀態

❌ **錯誤**
```tsx
<SelectItem value="open">待處理</SelectItem>  {/* ❌ */}
<SelectItem value="done">已完成</SelectItem>  {/* ❌ */}
```

✅ **正確**
```tsx
<SelectItem value="not_started">未開始</SelectItem>  {/* ✅ */}
<SelectItem value="completed">已完成</SelectItem>  {/* ✅ */}
```

或直接使用 `STATUS_OPTIONS`：
```tsx
import { STATUS_OPTIONS } from '@/lib/storage/statusHelpers';

STATUS_OPTIONS.map(option => (
  <SelectItem key={option.value} value={option.value}>
    {option.label}
  </SelectItem>
))
```

---

## 技術架構

### 檔案結構

```
/src/lib/storage/
├── types.ts              # ItemStatus 類型定義（7 個狀態）
├── statusHelpers.ts      # 狀態輔助函數（含向後相容）
└── statusMigration.ts    # 自動遷移工具

/src/app/
├── App.tsx              # 啟動時執行遷移檢查
└── settings/
    └── components/
        └── StatusMigrationPanel.tsx  # 管理介面
```

---

### 核心函數

1. **`getStatusLabel(status: string): string`**
   - 取得狀態的中文顯示名稱
   - 自動處理舊狀態（向後相容）
   - 返回對應的標準狀態標籤

2. **`getStatusColor(status: string): string`**
   - 取得狀態的 Tailwind CSS 類別
   - 自動處理舊狀態（向後相容）
   - 返回對應的標準狀態顏色

3. **`migrateAllItemsStatus(): number`**
   - 掃描所有 localStorage 資料
   - 將舊狀態轉換為新狀態
   - 返回遷移數量

4. **`needsMigration(): boolean`**
   - 檢查是否需要執行遷移
   - 檢查是否有遷移完成標記

---

## 版本歷史

### v2.0 - 向後相容版本 ⭐
- ✅ 新增 `suggestion` 和 `rejected` 狀態支援
- ✅ `getStatusColor` 和 `getStatusLabel` 自動處理舊狀態
- ✅ 即使有舊資料也不會崩潰
- ✅ 提供友善的警告訊息

### v1.0 - 基礎遷移版本
- ✅ 定義 5 個標準任務狀態
- ✅ 自動遷移工具
- ✅ 管理介面

---

## 總結

### 當前狀態
- ✅ 系統已完全向後相容
- ✅ 舊資料不會導致崩潰
- ✅ 提供多種遷移方式
- ✅ 符合 rules.md 2.2 規範

### 建議操作
1. **立即執行遷移**（清除舊資料）
2. **檢查 Console 警告**（確認是否還有舊狀態）
3. **更新程式碼**（使用標準狀態）

---

**所有問題已解決！系統可正常運作，無論是否有舊狀態資料。** 🎉
