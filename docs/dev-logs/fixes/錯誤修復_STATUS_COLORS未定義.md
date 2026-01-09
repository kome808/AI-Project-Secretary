# 錯誤修復報告：STATUS_COLORS 未定義

> **修復日期**：2024-12-21  
> **錯誤類型**：ReferenceError  
> **影響範圍**：任務卡片組件

---

## 🐛 錯誤描述

```
ReferenceError: STATUS_COLORS is not defined
    at ItemCard (ItemCard.tsx:153:109)
```

**原因**：在更新 ItemCard 組件以使用統一的 statusHelpers 時，移除了 `STATUS_COLORS` 常量定義，但忘記更新所有引用該常量的地方。

---

## ✅ 修復內容

### 1. ItemCard.tsx
**問題**：
- 移除了 `STATUS_COLORS` 定義
- 但在 SelectTrigger 中仍使用 `STATUS_COLORS[item.status]`

**修復**：
```typescript
// 修復前 ❌
<SelectTrigger className={`... ${STATUS_COLORS[item.status] || 'bg-gray-50'}`}>

// 修復後 ✅
<SelectTrigger className={`... ${getStatusColor(item.status)}`}>
```

**同時修正**：
- 更新 `getAvailableStatuses()` 使用統一的 5 個狀態
- 為 Decision 類型添加不顯示狀態選擇器的邏輯
- 使用 `STATUS_LABELS` 輔助函數顯示狀態名稱

---

### 2. CompactItemCard.tsx
**問題**：仍使用舊的 `STATUS_LABELS` 和 `STATUS_COLORS` 定義

**修復**：
```typescript
// 新增 imports
import { STATUS_LABELS, getStatusColor, STATUS_OPTIONS } from '../../../lib/storage/statusHelpers';
import { TYPE_LABELS, getTypeColor } from '../../../lib/storage/typeHelpers';

// 移除舊的常量定義
// - const STATUS_LABELS = {...}
// - const STATUS_COLORS = {...}

// 使用輔助函數
<Badge className={getStatusColor(item.status)}>
  {STATUS_LABELS[item.status] || item.status}
</Badge>

// 添加類型 Badge
<Badge className={getTypeColor(item.type)}>
  {TYPE_LABELS[item.type] || item.type}
</Badge>
```

---

### 3. ItemDetailDrawer.tsx
**問題**：使用舊的狀態系統和常量定義

**修復**：
```typescript
// 新增 imports
import { STATUS_LABELS, getStatusColor, STATUS_OPTIONS } from '../../../lib/storage/statusHelpers';
import { TYPE_LABELS, getTypeColor } from '../../../lib/storage/typeHelpers';

// 移除舊的 STATUS_LABELS 和 STATUS_COLORS 定義

// 更新 getAvailableStatuses 使用統一狀態
const getAvailableStatuses = () => {
  if (item.type === 'decision') {
    return [];
  }
  return ['not_started', 'in_progress', 'blocked', 'awaiting_response', 'completed'];
};

// 添加狀態選擇器顯示邏輯
const showStatusSelector = item.type !== 'decision';

// 添加類型 Badge 顯示
<Badge className={getTypeColor(item.type)}>
  <Tag className="w-3 h-3 mr-1" />
  {TYPE_LABELS[item.type] || item.type}
</Badge>

// 條件顯示狀態選擇器
{showStatusSelector && (
  <Select value={item.status} onValueChange={handleStatusChange}>
    ...
  </Select>
)}
```

---

## 📊 修正的組件清單

| 組件 | 檔案路徑 | 修正內容 |
|------|---------|---------|
| **ItemCard** | `/src/app/tasks/components/ItemCard.tsx` | ✅ 使用 `getStatusColor()` 替代 `STATUS_COLORS` |
| **CompactItemCard** | `/src/app/tasks/components/CompactItemCard.tsx` | ✅ 引入 statusHelpers 和 typeHelpers |
| **ItemDetailDrawer** | `/src/app/tasks/components/ItemDetailDrawer.tsx` | ✅ 更新狀態系統，添加類型顯示 |

---

## 🔧 統一的修正模式

所有卡片組件現在都遵循以下模式：

### 1. Imports
```typescript
import { STATUS_LABELS, getStatusColor, STATUS_OPTIONS } from '../../../lib/storage/statusHelpers';
import { TYPE_LABELS, getTypeColor } from '../../../lib/storage/typeHelpers';
```

### 2. 狀態顯示
```typescript
// 使用輔助函數取得顏色
<Badge className={getStatusColor(item.status)}>
  {STATUS_LABELS[item.status] || item.status}
</Badge>
```

### 3. 類型顯示
```typescript
// 使用輔助函數取得顏色
<Badge className={getTypeColor(item.type)}>
  <Tag className="w-3 h-3 mr-1" />
  {TYPE_LABELS[item.type] || item.type}
</Badge>
```

### 4. 狀態選擇器
```typescript
// 統一使用 5 個標準狀態
const getAvailableStatuses = () => {
  if (item.type === 'decision') {
    return [];
  }
  return ['not_started', 'in_progress', 'blocked', 'awaiting_response', 'completed'];
};
```

---

## ✅ 驗證結果

- [x] ItemCard 渲染正常
- [x] CompactItemCard 渲染正常
- [x] ItemDetailDrawer 渲染正常
- [x] 所有狀態顏色正確顯示
- [x] 所有類型 Badge 正確顯示
- [x] Decision 類型不顯示狀態選擇器
- [x] 其他類型使用統一的 5 個狀態
- [x] 無 console 錯誤

---

## 📚 相關文件

- `/src/lib/storage/statusHelpers.ts` - 狀態輔助工具
- `/src/lib/storage/typeHelpers.ts` - 類型輔助工具
- `/docs/spac/rules.md` - 全域業務規則
- `/docs/任務清單模組_Rules符合性修正總結.md` - 模組符合性報告

---

## 🎯 經驗教訓

### 避免此類錯誤的最佳實踐：

1. **統一使用輔助函數**：所有狀態/類型相關的顯示邏輯都應使用 helpers
2. **完整搜尋替換**：修改時使用 file_search 確保沒有遺漏
3. **TypeScript 檢查**：依賴類型系統在編譯時發現問題
4. **分段測試**：每修改一個組件就測試一次

---

**修復狀態**：✅ 完成  
**測試狀態**：✅ 通過

**END OF REPORT**
