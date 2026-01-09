# 狀態遷移最終修正 - 完全解決方案

## 問題描述

用戶看到警告訊息：
```
[Status] Legacy status detected: "active" → using "in_progress" color. Please run migration.
```

## 根本原因

1. localStorage 中仍有使用舊狀態 (`active`, `open`, `done` 等) 的資料
2. 之前的遷移可能不完整或有新資料在遷移後被創建
3. `needsMigration()` 只檢查標記，未掃描實際資料

## 完整解決方案

### 1. 改進遷移檢查邏輯

**檔案**：`/src/lib/storage/statusMigration.ts`

**修正**：
- ✅ `needsMigration()` 現在**總是掃描實際資料**
- ✅ 不再僅依賴 `status_migration_completed` 標記
- ✅ 即使有標記，只要發現舊狀態就會執行遷移

**程式碼**：
```typescript
export function needsMigration(): boolean {
  // 總是掃描實際資料，不僅依賴標記
  try {
    const keys = Object.keys(localStorage);
    const itemKeys = keys.filter(key => 
      key.startsWith('items_') || key.startsWith('work_packages_')
    );
    
    for (const key of itemKeys) {
      const data = localStorage.getItem(key);
      if (!data) continue;
      
      const items = JSON.parse(data);
      if (!Array.isArray(items)) continue;
      
      // 檢查是否有舊狀態
      const hasLegacyStatus = items.some((item: any) => 
        item.status && isLegacyStatus(item.status)
      );
      
      if (hasLegacyStatus) {
        console.log(`  ℹ️ 在 ${key} 中發現舊狀態資料`);
        return true;
      }
    }
  } catch (error) {
    console.error('[StatusMigration] Error checking migration need:', error);
  }
  
  return false;
}
```

---

### 2. 修正遷移對應表

**問題**：`rejected` 既是舊狀態（CR 中的「已駁回」），也是新狀態（已拒絕的 AI 建議）

**修正**：
- ✅ 從 `LEGACY_STATUS_MIGRATION_MAP` 中移除 `rejected`
- ✅ 在 `STANDARD_STATUSES` 中保留 `rejected`
- ✅ 更新 statusHelpers.ts 的向後相容對應表

**對應表（13 種舊狀態）**：
```typescript
const LEGACY_STATUS_MIGRATION_MAP = {
  // 通用舊狀態
  'open': 'not_started',
  'active': 'in_progress',
  'done': 'completed',
  'pending': 'awaiting_response',
  'waiting': 'awaiting_response',
  'archived': 'completed',
  
  // CR 舊狀態
  'requested': 'in_progress',
  'reviewing': 'in_progress',
  'approved': 'completed',
  'implemented': 'completed',
  'canceled': 'completed',
  
  // Decision 舊狀態
  'superseded': 'completed',
  'deprecated': 'completed',
};
```

---

### 3. 啟動時自動遷移

**檔案**：`/src/app/App.tsx`

**邏輯**：
```typescript
useEffect(() => {
  // 1. 執行狀態遷移檢查
  console.log('🔄 執行狀態遷移檢查...');
  
  // needsMigration() 會掃描實際資料
  const migrationNeeded = needsMigration();
  
  if (migrationNeeded) {
    console.log('  🔄 檢測到舊狀態數據，開始遷移...');
    const migratedCount = migrateAllItemsStatus();
    console.log(`  ✅ 狀態遷移完成，共更新 ${migratedCount} 筆任務`);
  } else {
    console.log('  ✅ 所有狀態已是最新格式');
  }
}, []);
```

---

### 4. 向後相容保持運作

**檔案**：`/src/lib/storage/statusHelpers.ts`

**功能**：即使遷移前，UI 也不會崩潰

```typescript
// getStatusColor 和 getStatusLabel 內建舊狀態對應
const legacyStatusMap = {
  'open': 'not_started',
  'active': 'in_progress',
  'done': 'completed',
  // ... 等 13 種
};

// 如果遇到舊狀態，自動使用對應的新狀態顏色
if (status in legacyStatusMap) {
  itemStatus = legacyStatusMap[status];
  console.warn(`Legacy status detected: "${status}" → using "${itemStatus}" color`);
}
```

---

## 執行結果

### 預期 Console 輸出

#### 如果有舊資料
```
🔄 執行狀態遷移檢查...
  ℹ️ 在 items_abc123 中發現舊狀態資料
  🔄 檢測到舊狀態數據，開始遷移...
[StatusMigration] Item "某任務": "active" → "in_progress"
[StatusMigration] Item "另一個任務": "done" → "completed"
  ✅ 狀態遷移完成，共更新 5 筆任務
```

#### 如果沒有舊資料
```
🔄 執行狀態遷移檢查...
  ✅ 所有狀態已是最新格式
```

---

## 驗證方式

### 1. 檢查 Console
重新整理頁面，應該看到：
- ✅ `✅ 所有狀態已是最新格式`
- ❌ 不應再看到 `Legacy status detected` 警告

### 2. 檢查 localStorage
在 Console 執行：
```javascript
// 檢查所有 items 的狀態
Object.keys(localStorage)
  .filter(key => key.startsWith('items_'))
  .forEach(key => {
    const items = JSON.parse(localStorage.getItem(key));
    const statuses = [...new Set(items.map(i => i.status))];
    console.log(key, '狀態:', statuses);
  });
```

應該只看到標準狀態：
- `suggestion`, `rejected`, `not_started`, `in_progress`, `blocked`, `awaiting_response`, `completed`

### 3. 檢查 UI
- ✅ 所有狀態 Badge 顯示正確的中文標籤
- ✅ 所有狀態 Badge 顯示正確的顏色
- ✅ 沒有黃色警告框

---

## 標準狀態清單（7 個）

| 狀態值 | 中文名稱 | 用途 | 顏色 |
|--------|---------|------|------|
| `suggestion` | 建議中 | AI 建議（收件匣） | 藍色 |
| `rejected` | 已拒絕 | 已拒絕的建議 | 紅色 |
| `not_started` | 未開始 | 任務尚未開始 | 灰色 |
| `in_progress` | 進行中 | 正在執行 | 藍綠色 |
| `blocked` | 卡關 | 遇到阻礙 | 紅色 |
| `awaiting_response` | 待回覆 | 等待回應 | 橙色 |
| `completed` | 已完成 | 任務完成 | 綠色 |

---

## 舊狀態對應規則（13 種）

| 舊狀態 | → | 新狀態 | 說明 |
|--------|---|--------|------|
| `open` | → | `not_started` | 待處理 → 未開始 |
| `active` | → | `in_progress` | 活躍中 → 進行中 |
| `done` | → | `completed` | 已完成 → 已完成 |
| `pending` | → | `awaiting_response` | 待處理 → 待回覆 |
| `waiting` | → | `awaiting_response` | 等待 → 待回覆 |
| `archived` | → | `completed` | 已歸檔 → 已完成 |
| `requested` | → | `in_progress` | 已提出 → 進行中 |
| `reviewing` | → | `in_progress` | 評估中 → 進行中 |
| `approved` | → | `completed` | 已核准 → 已完成 |
| `implemented` | → | `completed` | 已實作 → 已完成 |
| `canceled` | → | `completed` | 已取消 → 已完成 |
| `superseded` | → | `completed` | 已被取代 → 已完成 |
| `deprecated` | → | `completed` | 已廢止 → 已完成 |

---

## 修正檔案清單

1. ✅ `/src/lib/storage/statusMigration.ts`
   - 改進 `needsMigration()` - 總是掃描實際資料
   - 從對應表移除 `rejected`
   - 在標準狀態加入 `suggestion` 和 `rejected`

2. ✅ `/src/lib/storage/statusHelpers.ts`
   - 向後相容對應表移除 `rejected`
   - `STATUS_LABELS` 加入 `suggestion` 和 `rejected`
   - `STATUS_OPTIONS` 更新

3. ✅ `/src/app/App.tsx`
   - 簡化啟動邏輯
   - 依賴 `needsMigration()` 的實際掃描

---

## 預防未來問題

### 開發規範

1. **新增資料時必須使用標準狀態**
   ```typescript
   // ❌ 錯誤
   createItem({ status: 'open' })
   
   // ✅ 正確
   createItem({ status: 'not_started' })
   ```

2. **條件判斷必須使用標準狀態**
   ```typescript
   // ❌ 錯誤
   if (item.status === 'done')
   
   // ✅ 正確
   if (item.status === 'completed')
   ```

3. **Select 選項必須使用標準狀態**
   ```tsx
   // ✅ 使用 STATUS_OPTIONS
   import { STATUS_OPTIONS } from '@/lib/storage/statusHelpers';
   
   {STATUS_OPTIONS.map(option => (
     <SelectItem value={option.value}>{option.label}</SelectItem>
   ))}
   ```

---

## 總結

### ✅ 已完成
1. 改進遷移檢查 - 總是掃描實際資料
2. 修正對應表 - 移除 `rejected` 避免衝突
3. 啟動時自動遷移 - 確保所有舊資料被清理
4. 向後相容 - 遷移前 UI 不會崩潰

### ✅ 預期效果
- 不再看到 `Legacy status detected` 警告
- 所有狀態顯示正確的中文標籤與顏色
- localStorage 中只有標準狀態

### ✅ 長期穩定
- 即使未來有新的舊資料，也會自動被遷移
- 開發者可依照規範使用標準狀態
- 系統完全符合 rules.md 2.2 規範

---

**問題已徹底解決！重新整理頁面即可看到效果。** 🎉
