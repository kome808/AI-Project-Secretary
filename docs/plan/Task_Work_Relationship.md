# 任務與專案工作歸屬關係（Task-Work Relationship）

## 目標
實現任務（Item）與專案工作（WorkPackage）之間的歸屬關係，讓所有任務都能回到專案工作脈絡中，便於進度彙整、回溯證據（Citation）與責任分工；同時保留對話式輸入的流暢性，允許任務先入庫後再歸戶。

---

## 1. 業務規則

### 1.1 基本規則（Should）
- 任務清單中的每一筆項目（Item）**應歸屬到某一個專案工作（WorkPackage）**之下
- 專案工作可代表：功能模組、交付文件、會議、外部依賴等工作包（Work Package）

### 1.2 允許暫時未歸屬（Must）
任務在以下情境允許「未歸屬」：
- 從收件匣（Inbox）快速 Confirm 入庫時尚未決定歸屬
- 內容不足，需待釐清後才能判斷歸屬
- AI 產生建議卡但使用者尚未確認掛載位置

「未歸屬」的任務仍必須可以：
- 正常追蹤狀態（未開始/進行中/待回覆/卡關/已完成）
- 具備 Citation 溯源
- 被指派負責人與期限（若需要）

### 1.3 未歸屬的呈現方式
- 在「專案工作」視圖中提供一個固定群組：**未分類 / 未歸屬**
- 所有尚未掛到任何專案工作的任務（`work_package_id === null`）都列在此群組下
- 已完成任務仍應顯示在所屬群組下（包含未分類群組），狀態為「已完成」

### 1.4 歸屬流程（Flow）
**任務入庫時：**
- 預設 `work_package_id = null`（未歸屬）
- AI 可提供「建議歸屬」但需人工確認

**任務入庫後：**
- PM 或任務負責人可將任務從「未分類」移動到正確的專案工作（重新歸戶）
- 支援兩種操作方式：
  1. 在任務卡片展開後的編輯區域，通過下拉選單選擇專案工作
  2. 在專案工作視圖中，通過拖拽方式移動任務到目標專案工作

---

## 2. 資料結構調整

### 2.1 Item 介面更新
在 `/src/lib/storage/types.ts` 中的 `Item` 介面增加：
```typescript
export interface Item {
  // ... existing fields
  work_package_id?: string; // Link to WorkPackage (null = 未歸屬)
  // ... existing fields
}
```

### 2.2 LocalAdapter 調整
- `createItem`: 預設 `work_package_id = null`
- `updateItem`: 允許更新 `work_package_id`
- 本地儲存的 JSON 結構需包含此欄位

---

## 3. UI/UX 規劃

### 3.1 專案工作視圖（ProjectWorkView）改造

#### 佈局結構
```
[專案工作視圖]
├── 工具列
│   ├── 新增專案工作按鈕
│   └── 切換顯示已完成項目（Toggle）
│
├── 專案工作群組列表
│   ├── 【未分類 / 未歸屬】（固定群組，置頂）
│   │   ├── 任務卡片 1 (work_package_id = null)
│   │   ├── 任務卡片 2 (work_package_id = null)
│   │   └── ...
│   │
│   ├── 【專案工作 A】
│   │   ├── 工作資訊列（標題、Owner、到期日、進度摘要）
│   │   ├── 任務卡片 1 (work_package_id = A.id)
│   │   ├── 任務卡片 2 (work_package_id = A.id)
│   │   └── ...
│   │
│   ├── 【專案工作 B】
│   │   └── ...
│   └── ...
```

#### 群組功能
- **未分類群組**：
  - 永遠顯示在最上方
  - 即使為空也顯示（提示「目前沒有未歸屬的任務」）
  - 支援拖拽放入任務（從其他專案工作拖入 = 解除歸屬）

- **專案工作群組**：
  - 顯示專案工作資訊：標題、Owner、到期日
  - 顯示進度摘要：`已完成 X / 總計 Y`、是否有 blocked/overdue
  - 可展開/收合任務列表
  - 支援拖拽放入任務（從未分類或其他專案工作拖入 = 重新歸戶）

#### 顯示/隱藏已完成項目
- 工具列提供 Toggle 按鈕：「顯示已完成項目」
- 預設：**隱藏**已完成項目（`status === 'done'`）
- 開啟後：顯示所有任務，包含已完成
- 狀態記憶於 localStorage：`projectWork_showCompleted_${projectId}`

#### 拖拽功能（Drag & Drop）
- 使用 `react-dnd` 實作
- 支援任務卡片拖拽到：
  - 未分類群組（解除歸屬）
  - 其他專案工作群組（重新歸戶）
- 拖拽時視覺提示：目標群組高亮、拖拽中的卡片半透明
- 拖拽完成後：更新 `work_package_id`，重新載入資料

### 3.2 我的任務視圖（ActionsView）調整

#### 任務卡片顯示
在任務卡片上增加顯示**所屬專案工作**：
```
[任務卡片]
├── 狀態標籤 + 類型標籤
├── 標題
├── 描述（摘要）
├── 所屬專案工作：【專案工作 A】 <-- 新增
├── 負責人 + 到期日
└── 操作按鈕
```

- 若 `work_package_id !== null`：顯示專案工作標題，點擊可跳轉到專案工作視圖
- 若 `work_package_id === null`：顯示「未分類」，顏色淡化

### 3.3 任務卡片編輯區（所有視圖通用）

#### 增加專案工作選擇器
在任務卡片展開後的編輯區域，增加「專案工作」下拉選單：
```
[編輯區域]
├── 標題輸入框
├── 描述輸入框
├── 負責人選擇器
├── 到期日選擇器
├── 專案工作選擇器 <-- 新增
│   ├── 選項：未分類（null）
│   ├── 選項：專案工作 A
│   ├── 選項：專案工作 B
│   └── ...
├── 狀態選擇器
└── 儲存按鈕
```

- 選擇器顯示所有專案工作列表
- 包含「未分類」選項（值為 `null`）
- 選擇後立即更新 `work_package_id`

---

## 4. 驗收標準（AC）

### AC1：資料結構
- [ ] Item 介面包含 `work_package_id?: string`
- [ ] LocalAdapter 支援儲存與更新 `work_package_id`
- [ ] 新建任務時預設 `work_package_id = null`

### AC2：專案工作視圖
- [ ] 顯示「未分類 / 未歸屬」固定群組（置頂）
- [ ] 按專案工作分組顯示任務
- [ ] 每個專案工作群組顯示：標題、Owner、到期日、進度摘要
- [ ] 進度摘要計算：`已完成數 / 總計`
- [ ] 工具列包含「顯示已完成項目」Toggle
- [ ] 預設隱藏已完成項目，Toggle 開啟後顯示
- [ ] Toggle 狀態記憶於 localStorage

### AC3：拖拽功能
- [ ] 任務卡片可拖拽到未分類群組（解除歸屬）
- [ ] 任務卡片可拖拽到其他專案工作群組（重新歸戶）
- [ ] 拖拽時有視覺提示（目標高亮、卡片半透明）
- [ ] 拖拽完成後更新 `work_package_id` 並重新載入資料

### AC4：我的任務視圖
- [ ] 任務卡片顯示所屬專案工作標題
- [ ] 點擊專案工作標題可跳轉到專案工作視圖
- [ ] 未歸屬任務顯示「未分類」（淡化顏色）

### AC5：任務編輯
- [ ] 任務卡片編輯區包含專案工作下拉選單
- [ ] 下拉選單顯示所有專案工作 + 「未分類」選項
- [ ] 選擇後更新 `work_package_id`

### AC6：其他視圖
- [ ] 「待確認」「變更」「決議」視圖中的任務卡片也顯示所屬專案工作
- [ ] 編輯功能一致（都有專案工作選擇器）

---

## 5. 技術實作要點

### 5.1 套件安裝
- 安裝 `react-dnd` 和 `react-dnd-html5-backend` 用於拖拽功能

### 5.2 元件拆分
- **ProjectWorkGroup.tsx**: 專案工作群組元件（包含任務列表）
- **UnclassifiedGroup.tsx**: 未分類群組元件
- **DraggableTaskCard.tsx**: 可拖拽的任務卡片
- **WorkPackageSelector.tsx**: 專案工作下拉選擇器

### 5.3 狀態管理
- 在 ProjectWorkView 維護：
  - `workPackages: WorkPackage[]`
  - `items: Item[]`
  - `showCompleted: boolean`（從 localStorage 讀取）
- 計算派生狀態：
  - 未分類任務：`items.filter(i => !i.work_package_id)`
  - 各專案工作的任務：`items.filter(i => i.work_package_id === wp.id)`

### 5.4 進度摘要計算
```typescript
function calculateProgress(workPackageId: string, items: Item[]) {
  const relatedItems = items.filter(i => i.work_package_id === workPackageId);
  const total = relatedItems.length;
  const completed = relatedItems.filter(i => i.status === 'done').length;
  const blocked = relatedItems.some(i => i.status === 'blocked');
  const overdue = relatedItems.some(i => 
    i.due_date && new Date(i.due_date) < new Date() && i.status !== 'done'
  );
  return { total, completed, blocked, overdue };
}
```

---

## 6. 後續優化（Not in MVP）
- 在收件匣 Confirm 時，AI 建議歸屬（顯示於建議卡）
- 專案工作視圖支援甘特圖（Gantt Chart）展示時間軸
- 批次歸戶：一次選擇多個任務重新歸戶
- 專案工作樣板：預設建立某類型專案工作時，自動建立標準任務

---

## 7. 遵循規範提醒
- ✅ 使用 Tailwind CSS 變數（從 `/src/styles/theme.css`）
- ✅ 禁止寫死假資料，所有資料透過 Adapter 讀取
- ✅ LocalAdapter 所有方法必須為 async（即使讀取 localStorage）
- ✅ 確保全中文介面
- ✅ 僅使用 CSS 中定義的字體
