# 狀態變更權限規則

**文件版本**：v1.0  
**最後更新**：2025-12-19  
**適用模組**：任務清單（Task List）

---

## 概述

本文件定義了「AI 專案秘書原型系統」中各類任務項目（Item）的狀態變更權限規則。不同任務類型（Action、Pending、CR、Decision/Rule）具有不同的權限設定，以確保工作流程的正確性與資料完整性。

---

## 權限角色定義

本系統涉及以下三種角色：

- **PM (Project Manager)**：專案管理者，具有專案層級的全域管理權限
- **Assignee**：任務負責人，針對指派給自己的任務具有操作權限
- **Admin**：系統管理員，用於救援或代管情境，擁有最高權限

---

## A) Action / Pending（工作類任務）

### 可變更狀態者

以下角色可以變更 **Action** 和 **Pending** 類型任務的狀態：

1. **PM（專案管理者）**
2. **該項目負責人（Assignee）**
3. **Admin（系統管理員）** — 用於救援或代管情境

### 例外規則

#### 1. 尚未指派負責人

- 若任務的 `assignee` 欄位為空（未指派負責人）
- **僅 PM / Admin 可變更狀態**
- 一般成員無法操作

#### 2. 專案狀態為「封存」

- 若專案已標記為「封存（Archived）」狀態
- **一律不可變更任何狀態**（唯讀模式）
- 包含 PM / Admin 在內均無法編輯

### 可變更的狀態

| 狀態值 | 狀態標籤 | 說明 |
|--------|----------|------|
| `open` | 待處理 | 新建立或待處理的任務 |
| `in_progress` | 進行中 | 正在執行的任務 |
| `waiting` | 等待中 | 等待外部回應（Pending 常用） |
| `blocked` | 卡關 | 遇到阻礙無法繼續 |
| `done` | 已完成 | 任務完成 |

---

## B) Change Request（需求變更）

### 可變更狀態者

**僅以下角色**可以變更 **CR（Change Request）** 類型任務的狀態：

1. **PM（專案管理者）**
2. **Admin（系統管理員）**

### 限制說明

- **其他成員不可直接改 CR 狀態**
- 其他成員可以：
  - 在詳情頁面補充評估意見
  - 留言討論
  - 新增對應的 Action（待辦事項）
- CR 狀態變更屬於決策層級操作，需由 PM 統一管理

### 可變更的狀態

| 狀態值 | 狀態標籤 | 說明 |
|--------|----------|------|
| `requested` | 已提出 | 新的變更請求 |
| `reviewing` | 評估中 | 正在評估影響與可行性 |
| `approved` | 已核准 | 變更請求已批准 |
| `rejected` | 已駁回 | 變更請求被拒絕 |
| `implemented` | 已實作 | 變更已完成實作 |
| `canceled` | 已取消 | 變更請求已取消 |

---

## C) Decision / Rule（決議紀錄 / 規則）

### 狀態變更限制

- **不提供「工作狀態」變更功能**
- Decision / Rule 類型的項目不應被視為「待執行任務」
- 其狀態為「已入庫（Confirmed）」，代表已被系統記錄

### 內容編輯權限（選配）

若系統允許編輯 Decision / Rule 的內容或分類：

- **僅 PM / Admin 可更新內容**
- **封存專案時同樣為唯讀**

### 狀態顯示（僅供參考）

| 狀態值 | 狀態標籤 | 說明 |
|--------|----------|------|
| `confirmed` | 已入庫 | 已記錄的決議/規則 |
| `active` | 有效 | 目前有效的規則 |
| `superseded` | 已被取代 | 被新版本取代 |
| `deprecated` | 已廢止 | 不再適用 |

---

## 實作建議

### 前端 UI 層

1. **權限檢查邏輯**
   ```typescript
   function canEditStatus(item: Item, currentUser: User, project: Project): boolean {
     // 專案封存時一律唯讀
     if (project.status === 'archived') return false;
     
     // Decision/Rule 不提供狀態變更
     if (item.type === 'decision' || item.type === 'rule') return false;
     
     // Admin 擁有所有權限
     if (currentUser.role === 'admin') return true;
     
     // PM 擁有所有工作類 + CR 權限
     if (currentUser.role === 'pm') return true;
     
     // CR 僅 PM/Admin 可編輯
     if (item.type === 'cr') return false;
     
     // Action/Pending：負責人可編輯
     if (item.assignee === currentUser.email) return true;
     
     return false;
   }
   ```

2. **UI 顯示規則**
   - 無權限時：顯示靜態 Badge（不可點擊）
   - 有權限時：顯示 Select 下拉選單

### 資料庫層（RLS Policy）

在 Supabase 部署時，應設定對應的 Row Level Security (RLS) 規則：

```sql
-- 範例：Action/Pending 狀態更新權限
CREATE POLICY "Allow status update for action/pending"
ON items FOR UPDATE
USING (
  -- 專案未封存
  project_id IN (SELECT id FROM projects WHERE status != 'archived')
  AND
  -- 類型為 Action 或 Pending
  type IN ('action', 'pending')
  AND
  (
    -- 是 PM
    auth.uid() IN (SELECT user_id FROM project_members WHERE project_id = items.project_id AND role = 'pm')
    OR
    -- 是負責人
    assignee = auth.email()
    OR
    -- 是 Admin
    auth.uid() IN (SELECT user_id FROM users WHERE role = 'admin')
  )
);
```

---

## 未來擴展

### 狀態流轉規則（可選）

若需要更嚴格的狀態機（State Machine）控制，可定義：

- 某些狀態只能從特定前置狀態變更（例如：`done` 只能從 `in_progress` 轉換）
- 記錄狀態變更歷史（Audit Log）
- 狀態變更時自動觸發通知

### 批次操作權限

- PM 可能需要批次變更多個任務狀態
- Admin 可能需要批次封存/解封專案

---

## 相關文件

- [任務清單模組總覽](/docs/plan/Tasks.md)
- [專案設定 - PM 權限](/docs/plan/Settings_Project_PM.md)
- [系統設定 - Admin 權限](/docs/plan/Settings_System_Admin.md)
- [任務視圖 - 待辦](/docs/plan/Tasks_View_Actions.md)
- [任務視圖 - 待回覆](/docs/plan/Tasks_View_Pending.md)
- [任務視圖 - 需求變更](/docs/plan/Tasks_View_CR.md)
- [任務視圖 - 決議紀錄](/docs/plan/Tasks_View_Decisions.md)

---

**文件結束**
