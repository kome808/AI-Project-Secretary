# 強制重新遷移 Console 腳本

## 快速修復：在瀏覽器 Console 執行

如果您看到 `[Status] Unknown status color: "active"` 錯誤，代表仍有舊狀態未遷移。

請打開瀏覽器 Console（F12），複製以下腳本並執行：

```javascript
// 1. 清除遷移標記
localStorage.removeItem('status_migration_completed');

// 2. 重新整理頁面以觸發自動遷移
location.reload();
```

## 完整說明

### 問題原因
- 系統在首次載入時會自動執行遷移
- 如果遷移已完成（有 `status_migration_completed` 標記），就不會再執行
- 但可能有新增的資料仍使用舊狀態

### 解決方法
1. **清除遷移標記**：刪除 `status_migration_completed` 
2. **重新整理頁面**：觸發 App.tsx 中的遷移檢查邏輯
3. **系統會自動**：
   - 掃描所有 items 和 work_packages
   - 將舊狀態轉換為新狀態
   - 記錄遷移結果到 Console

### 驗證遷移成功
Console 應該顯示類似訊息：
```
🔄 檢測到舊狀態數據，開始遷移...
[StatusMigration] Item "某任務": "active" → "in_progress"
[StatusMigration] Item "某任務": "done" → "completed"
✅ 狀態遷移完成，共更新 X 筆任務
```

### 進階：手動檢查資料
如果想查看 localStorage 中的原始資料：

```javascript
// 查看所有 items
Object.keys(localStorage)
  .filter(key => key.startsWith('items_'))
  .forEach(key => {
    const items = JSON.parse(localStorage.getItem(key));
    console.log(key, items);
  });

// 查看所有 work_packages
Object.keys(localStorage)
  .filter(key => key.startsWith('work_packages_'))
  .forEach(key => {
    const wps = JSON.parse(localStorage.getItem(key));
    console.log(key, wps);
  });
```

### 進階：手動批次修正（不推薦，除非自動遷移失敗）

```javascript
// 定義舊狀態對應規則
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

// 手動遷移所有 items
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

console.log(`\n✅ 完成！共更新 ${updated} 筆 items`);

// 手動遷移所有 work_packages
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

// 最後重新整理頁面
console.log('\n🔄 3 秒後自動重新整理頁面...');
setTimeout(() => location.reload(), 3000);
```

## 預防措施

為避免未來再出現此問題：

1. **新增資料時**：確保使用標準狀態
   - ❌ `status: 'open'`
   - ✅ `status: 'not_started'`

2. **條件判斷時**：使用新狀態
   - ❌ `item.status === 'done'`
   - ✅ `item.status === 'completed'`

3. **下拉選單**：使用新狀態值
   ```tsx
   <SelectItem value="not_started">未開始</SelectItem>
   <SelectItem value="in_progress">進行中</SelectItem>
   <SelectItem value="blocked">卡關</SelectItem>
   <SelectItem value="awaiting_response">待回覆</SelectItem>
   <SelectItem value="completed">已完成</SelectItem>
   ```

## 標準狀態清單

僅有以下 7 個狀態是合法的 `ItemStatus`：

1. `suggestion` - AI 建議（收件匣專用）
2. `rejected` - 已拒絕建議
3. `not_started` - 未開始
4. `in_progress` - 進行中
5. `blocked` - 卡關
6. `awaiting_response` - 待回覆
7. `completed` - 已完成

所有其他狀態值（如 `open`, `done`, `active`, `pending` 等）都是舊格式，會被自動遷移。
