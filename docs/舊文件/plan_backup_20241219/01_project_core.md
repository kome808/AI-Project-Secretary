⚠️ **DEPRECATED**：本文件已被新版 docs/plan/* 取代，請勿作為開發依據。

---

# Module 01：Project Core & Dashboard (專案核心與儀表板)

## 1. 模組目標
建立系統的基礎骨架，包含資料存取層 (Adapter Pattern)、全域版面配置 (App Shell)、以及專案管理功能。此模組將作為後續所有功能的容器，確保資料流的單一事實來源 (SSOT)。

## 2. 功能需求 (Requirements)

### 2.1 資料核心 (Data Access Layer)
- **Adapter Pattern**：實作 `StorageFactory` 與 `LocalAdapter`。
- **Schema 定義**：
  - `projects` table: `id`, `name`, `description`, `created_at`, `status`
  - `members` table: `id`, `project_id`, `email`, `role`, `name`
- **強制非同步**：所有 CRUD 操作必須封裝為 `Promise<{ data, error }>`。
- **本地儲存命名**：Key 命名需對應 `[schema]_[table]` 格式。

### 2.2 專案管理 (Project Management)
- **專案列表**：顯示使用者參與的專案，支援「建立新專案」。
- **切換機制**：全域 Context 管理 `currentProject`，確保切換時所有模組資料同步更新。
- **成員檢視**：在專案設定中可查看成員列表。

### 2.3 應用程式外框 (App Shell)
- **側邊導覽 (Sidebar)**：
  - 項目：收件匣 (Inbox)、儀表板 (Dashboard)、專案工作 (Project Work)、待辦清單 (Actions)、待確認 (Pending)、決議與規則 (Decisions)、需求變更 (CR)、文件庫 (Documents)、控制塔 (Control Tower)、設定 (Settings)。
  - 響應式設計：桌面端固定，移動端收合。
- **頂部工具列**：顯示專案名稱、搜尋框與使用者資訊。

### 2.4 儀表板 (Dashboard)
- **進度追蹤 (Health)**：顯示專案整體完成度百分比。
- **風險監控 (Blocked)**：列出所有 `status = blocked` 的 Action Items，使用紅色警示。
- **個人任務 (My Tasks)**：顯示指派給當前使用者的待辦事項。
- **客戶回覆 (Client Pending)**：統計等待客戶回覆的 Pending 項目。

## 3. 技術實作要點
- **禁制事項**：禁止使用 `import.meta.env` 與 `kv_store`。
- **樣式規範**：嚴格使用 `/styles/theme.css` 中的變數。
- **組件結構**：
  - `/src/app/layout/Sidebar.tsx`
  - `/src/app/dashboard/DashboardPage.tsx`
  - `/src/lib/storage/StorageFactory.ts`

## 4. 驗收標準
1. 建立專案後，重新整理頁面資料不流失。
2. 點擊導覽列能正確切換頁面且不造成 Crash。
3. Dashboard 佈局符合 Grid 系統規範。
