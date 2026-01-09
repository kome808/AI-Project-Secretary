⚠️ **DEPRECATED**：本文件已被新版 docs/plan/* 取代，請勿作為開發依據。

---

# Module 04：Pending Confirmation (待確認事項)

## 1. 模組目標
專門管理「在等的事」（如等客戶回覆、等權限、等流程確認）。透過明確區分對象與預期回覆類型，減少專案阻塞，並在回覆後能快速轉化為「決議」或「待辦」。

## 2. 功能需求 (Requirements)

### 2.1 Pending List (待確認清單)
- **核心欄位**：
    - 等誰回 (Waiting on): 客戶 / 內部 / 外部。
    - 等什麼 (Title/Description)。
    - 預期回覆類型 (Expected Response): 是/否、選擇、檔案、文字。
    - 到期日 (Due Date)。
- **視圖切換**：依據「等待對象」分組顯示。

### 2.2 Response Management (回覆管理)
- **填寫回覆**：手動填寫回覆內容與回覆時間。
- **後續轉換 (Resolution)**：
    - **轉決議 (To Decision)**：回覆後自動產生建議的 Decision 項目。
    - **轉待辦 (To Action)**：若需要後續執行，產生 Action 項目。
    - **結案 (Done)**：純粹資訊同步後結案。

### 2.3 風險預警
- 逾期未回覆的項目在儀表板以紅字提示。
- 顯示「已等待天數」。

## 3. 技術實作規劃

### 3.1 資料結構 (Meta)
```typescript
interface PendingMeta {
  waiting_on_type: 'client' | 'internal' | 'external';
  waiting_on_name: string;
  expected_response: string;
  response_content?: string;
  response_at?: string;
  resolution_hint?: 'to_decision' | 'to_action' | 'workaround';
}
```

### 3.2 關鍵元件
- `PendingFilters.tsx`: 等待對象篩選。
- `ResponseDialog.tsx`: 填寫回覆內容。
- `ConvertDialog.tsx`: 轉換為決議或待辦的互動介面。

## 4. 驗收標準
1. 可依據「等待客戶」快速篩選出所有需要客戶回覆的項目。
2. 回覆後可一鍵啟動「轉為決議」流程，並自動帶入回覆內容作為決議依據。
3. 超過 3 天未回覆的項目在清單中有明顯提示。
