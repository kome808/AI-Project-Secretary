⚠️ **DEPRECATED**：本文件已被新版 docs/plan/* 取代，請勿作為開發依據。

---

# Module 02：Chat & Inbox (對話入口與建議卡收件匣)

## 1. 模組目標
實作專案的唯一入口：對話與上傳區塊。透過 AI 模擬 (Mocked Generator) 提取內容，產生「建議卡 (Suggestions)」並進入 Inbox，由使用者確認後才正式入庫。

## 2. 功能需求 (Requirements)

### 2.1 對話入口 (Chat Input)
- **浮動面板 / 固定區域**：支援純文字貼上與檔案上傳。
- **敏感資訊處理**：在前端進行簡易的內容遮罩 (Masking) 處理。
- **Artifact 建立**：將輸入內容儲存為 `artifact` 物件。

### 2.2 AI 建議卡產生 (Suggestion Generation)
- **Mock AI Service**：模擬 AI 解析流程。
- **建議分類**：
  - `ActionItem` (待辦)
  - `PendingConfirmation` (待確認)
  - `Decision` (決議)
- **卡片屬性**：標題、描述、建議負責人、建議期限、信心指數。

### 2.3 Inbox 收件匣 (Inbox UI)
- **卡片列表**：顯示所有狀態為 `suggestion` 的項目。
- **操作行為**：
  - **確認 (Confirm)**：更新狀態為 `open` / `active` 並進入追蹤系統。
  - **丟棄 (Dismiss)**：刪除該建議卡。
  - **編輯 (Edit)**：在確認前調整標題、描述或指派。
- **分群顯示**：依據建議類型 (Action/Pending/Decision) 分組。

### 2.4 證據回溯 (Citation UI)
- 在建議卡與正式項目中，點擊可顯示關聯的 `artifact` 內容。

## 3. 技術實作規劃 (Implementation Plan)

### 3.1 目錄結構
```text
src/
  app/
    components/chat/    # ChatInput, ArtifactView
    inbox/             # InboxPage, SuggestionCard
  lib/
    ai/                # GeneratorService (Mock)
```

### 3.2 關鍵元件 (Components)
- `ChatFloatingPanel.tsx`: 包含文字框與上傳按鈕。
- `InboxList.tsx`: 呈現分群的建議卡。
- `SuggestionCard.tsx`: 包含編輯與確認邏輯。
- `ArtifactView.tsx`: 顯示原始貼上文字或檔案預覽。

### 3.3 資料流 (Data Flow)
1. User Inputs → `storage.createArtifact()`
2. `generatorService.generateSuggestions(artifact)` → 返回建議列表
3. `storage.createItem()` (status: 'suggestion')
4. Inbox 讀取 `status: 'suggestion'` 的 Items
5. User Confirm → `storage.updateItem(status: 'open')`

## 4. 驗收標準 (Acceptance Criteria)
1. 貼上文字後，Inbox 需立即出現對應的建議卡。
2. 建議卡需包含信心指數與原始來源連結。
3. 點擊「確認」後，卡片從 Inbox 消失，並在對應的清單模組中出現。
4. 點擊「查看來源」可開啟側邊欄顯示原始輸入的遮罩內容。
