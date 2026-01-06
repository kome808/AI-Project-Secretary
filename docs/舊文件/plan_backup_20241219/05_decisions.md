⚠️ **DEPRECATED**：本文件已被新版 docs/plan/* 取代，請勿作為開發依據。

---

# Module 05：Decisions & Rules (決議與規則記錄)

## 1. 模組目標
建立專案的「單一事實來源 (SSOT)」，記錄所有已定案的規則與決議。取代傳統零散在 Email 或對話中的資訊，提供可檢索、可追溯且具備版本概念的知識庫。

## 2. 功能需求 (Requirements)

### 2.1 Decision List (決議清單)
- **分類管理**：技術 (Technical)、業務 (Business)、UI/UX、流程 (Process)。
- **影響範圍 (Scope)**：全域 (Global)、特定模組 (Module)、特定頁面 (Page)。
- **狀態管理**：有效 (Active)、已作廢 (Deprecated)。

### 2.2 Decision Detail (詳情與追溯)
- **證據來源**：必填 Citation，顯示為何達成此決議 (對話、會議、回覆)。
- **歷史關聯**：若此決議是由某個 Pending 轉化而來，需保留連結。
- **作廢機制**：作廢時需填寫原因，並可連結到「替代的新決議」。

### 2.3 搜尋與引用
- **全域搜尋**：支援標題與描述關鍵字。
- **關聯檢視**：在 Actions 或 Pages 詳情中，可看到關聯的決議。

## 3. 技術實作規劃

### 3.1 資料結構 (Meta)
```typescript
interface DecisionMeta {
  category: string;
  scope: 'global' | 'module' | 'page';
  scope_target?: string;
  status: 'active' | 'deprecated';
  replaced_by_id?: string;
  parent_pending_id?: string;
}
```

### 3.2 關鍵元件
- `DecisionCard.tsx`: 顯示摘要與分類標籤。
- `DecisionFilters.tsx`: 依分類、範圍、狀態篩選。
- `CreateDecisionDialog.tsx`: 支援手動新增或從 Artifact 提取。

## 4. 驗收標準
1. 所有決議必須包含 Citation 連結。
2. 作廢決議時，清單預設隱藏，但可透過篩選找回。
3. 決議可關聯至特定的頁面，並在該頁面地圖中被查閱。
