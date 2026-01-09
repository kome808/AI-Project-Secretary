⚠️ **DEPRECATED**：本文件已被新版 docs/plan/* 取代，請勿作為開發依據。

---

# Module 03：Actions（待辦清單與看板）

## 1. 模組目標
管理「已入庫」的 Action（待辦）：提供清單、三欄看板、任務詳情與來源回溯 (Citation)。以少數狀態為核心，強調證據溯源能力。

## 2. 功能需求

### 2.1 待辦清單視圖 (Actions List)
- **顯示內容**：標題、狀態、負責人、到期日、優先級、Citation。
- **篩選器**：
  - 狀態：open, in_progress, pending, blocked, done。
  - 負責人：含「My Tasks」快捷鍵。
  - 到期：逾期、今日、本週。
- **證據鏈**：每筆項目顯示 `source_artifact_id` 連結，點擊顯示原始內容。

### 2.2 看板視圖 (Kanban Board)
- **三欄佈局**：
  - **To Do** (status: open)
  - **Doing** (status: in_progress)
  - **Done** (status: done)
- **卡片設計**：
  - 顯示標題、負責人、到期日。
  - **特別標示**：若狀態為 `pending` 或 `blocked`，卡片顯示對應徽章，且在 To Do 欄位中置頂。
- **拖拉互動**：使用 `react-dnd` 實作狀態變更。

### 2.3 任務詳情 (Action Detail)
- **編輯功能**：更新狀態、指派人員、設定到期日與優先級。
- **關聯掛載**：顯示此任務關聯的「模組」與「頁面」。
- **證據回溯**：完整呈現原始 Artifact 內容（如對話文字、檔案預覽）。

## 3. 技術實作規劃
- **資料讀取**：排除 `status = 'suggestion'` 與 `archived = true` 的項目。
- **資料結構**：擴充 `assignee`, `due_date`, `priority`, `tags`, `archived` 欄位。
- **樣式要求**：Typography 必須使用 `h3`, `p`, `label` 等標籤以符合 `theme.css` 規範。

## 4. 驗收標準
1. 從 Inbox 確認後的項目能立即出現在清單中。
2. 看板拖拉能正確更新 `localStorage`。
3. 詳情頁面可點擊進入原始來源進行比對。
