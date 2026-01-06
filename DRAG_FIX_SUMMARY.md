# 拖曳功能修復總結

## 已完成的修復

### 1. 核心問題診斷與修復
**問題**: 拖曳手柄的 ref 沒有正確連接，導致拖曳功能無法觸發。

**修復內容**:
- 新增專用的 `dragHandleRef` ref 用於拖曳手柄
- 將 `drop(cardRef)` 連接到整個卡片容器（接受放置）
- 將 `drag(dragHandleRef)` 連接到拖曳手柄圖示（觸發拖曳）
- 這種分離式設計確保：
  - 只有抓取手柄圖示時才能拖曳
  - 整個卡片都可以作為放置目標

### 2. 拖曳類型統一
- 所有元件統一使用 `UNIVERSAL_DND_TYPE`
- Level 1 專案工作卡片強制使用 50/50 上下排序（不允許 inside 嵌套）
- Level 2+ 子任務卡片使用 25/50/25 三區排序（允許 before/inside/after）

### 3. 調試日誌
已添加 console.log 用於診斷：
- 拖曳開始時：`[DraggableWBSCard] Can drag item: xxx (Level N)`
- 放置時：`[DraggableWBSCard] Drop: xxx -> xxx (Position: xxx)`

## 測試步驟

### 測試 1: Level 1 專案工作拖曳排序
1. 打開「專案工作」視圖
2. 確保有至少 2 個專案工作（Work Package）
3. 將滑鼠懸停在任一專案工作卡片的**拖曳手柄圖示**（左側的六點圖示 ⋮⋮）上
4. 按住滑鼠左鍵並拖曳
5. 觀察：
   - 卡片應變為半透明（opacity-50）
   - 將卡片拖到另一個專案工作上方/下方時，應出現藍色線條指示器
   - 上半部：顯示頂部藍色邊框（before）
   - 下半部：顯示底部藍色邊框（after）
   - **不應出現**：包圍整個卡片的藍色環（inside）
6. 放開滑鼠，卡片應重新排序

### 測試 2: Level 2+ 子任務拖曳
1. 展開一個專案工作，顯示子任務
2. 抓取子任務的拖曳手柄並拖曳
3. 觀察：
   - 可以在同層級任務間重新排序（before/after）
   - 可以拖到其他任務上建立父子關係（inside，顯示藍色環）

### 測試 3: 跨層級拖曳限制
1. 嘗試將 Level 1 專案工作拖到 Level 2 子任務上
2. 觀察：不應顯示任何放置指示器（禁止此操作）

## 查看調試日誌

打開瀏覽器開發者工具（F12），切換到 Console 標籤：
- 拖曳時應看到 `Can drag item` 訊息
- 放置時應看到 `Drop` 訊息，包含源 ID、目標 ID 和位置

## 如果仍然無法拖曳

### 檢查清單
1. **確認使用拖曳手柄**: 只有點擊並拖曳左側的六點圖示才能觸發拖曳
2. **檢查 DndProvider**: 確認 `ProjectWorkView` 有用 `<DndProvider backend={HTML5Backend}>` 包裹
3. **檢查 Console**: 查看是否有錯誤訊息
4. **檢查瀏覽器**: 確保使用的是現代瀏覽器（Chrome, Firefox, Safari, Edge）

### 常見問題

**Q: 點擊拖曳手柄沒有反應**
A: 檢查 Console 是否有 `Can drag item` 訊息。如果沒有，可能是 ref 連接問題。

**Q: 拖曳時卡片不會變半透明**
A: 檢查 `isDragging` 狀態是否正確。查看元素的 className 是否包含 `opacity-50`。

**Q: 無法放置到目標卡片**
A: 檢查 `canDrop` 邏輯，確認拖曳和目標的 level 是否符合規則。

## 技術細節

### 拖曳架構
```
DraggableWBSCard
├── cardRef (drop target)
│   └── 整個卡片容器可接受放置
└── dragHandleRef (drag source)
    └── 只有拖曳手柄可觸發拖曳
```

### 拖曳數據結構
```typescript
{
  id: string,           // 卡片 ID
  parentId: string,     // 父級 ID
  level: number,        // 層級（1=專案工作, 2+=子任務）
  type: string          // 類型（WORK_PACKAGE, etc.）
}
```

### 放置位置判斷
- **Level 1 vs Level 1**: 50/50 split (before/after only)
- **Level 2+ vs Level 2+**: 25/50/25 split (before/inside/after)
- **Level 1 vs Level 2+**: Forbidden (canDrop returns false)

## 設計系統遵循

所有樣式已更新為使用 `/src/styles/theme.css` 中定義的 CSS 變數：
- `bg-card` - 卡片背景
- `border-border` - 邊框顏色
- `text-foreground` - 前景文字
- `text-muted-foreground` - 次要文字
- `rounded-[var(--radius-lg)]` - 大圓角
- 所有顏色、間距、圓角都來自設計系統

## 下一步

如果測試成功，可以：
1. 移除調試 console.log
2. 優化拖曳動畫效果
3. 添加拖曳預覽自定義樣式
4. 完善錯誤處理和用戶反饋
