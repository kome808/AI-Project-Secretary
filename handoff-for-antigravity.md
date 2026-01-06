# AI 專案秘書系統｜工程師交接文件

> **文件版號**：V1.0  
> **產出日期**：2024-12-26  
> **目標讀者**：工程師、Antigravity IDE  
> **文件用途**：作為重建與重構專案的理解依據，不是直接照搬的程式碼規格書

---

## 1. 專案簡介

### 1.1 系統定位

「AI 對話式專案助理平台」是一個以 **AI 秘書** 為核心的專案管理輔助系統，主要使用者為 **PM（專案經理）** 與 **專案團隊成員**。

**核心價值主張**：
- 將碎片化的會議記錄、LINE/Email 對話、規格文件等輸入，透過 AI 自動轉換為「可追蹤的任務項目」
- 所有 AI 生成的內容必須經過「人工確認」才入庫（Inbox → 確認 → 入庫）
- 提供「證據鏈」（Citation）機制，每個任務都能回溯到原始來源（Artifact）
- 以「對話驅動、少入口」的介面設計，避免傳統 PM 工具的複雜操作

**目前開發階段**：
- ✅ 雛形原型（Prototype）已完成主要 UX 流程驗證
- ✅ 已串接 Supabase（資料庫 + Storage + Edge Functions）
- ⚠️ 尚未正式上線，部分功能為 Demo 用途

---

## 2. 技術與工具現況（Prototype）

### 2.1 前端技術棧

| 技術 | 版本 | 用途 |
|------|------|------|
| **React** | 18.3.1 | UI 框架 |
| **TypeScript** | - | 型別安全 |
| **React Router** | 7.11.0 | 路由管理（Hash Router） |
| **Tailwind CSS** | 4.1.12 | 樣式系統（使用 CSS 變數與 Design Tokens） |
| **Radix UI** | 多個套件 | 無障礙 UI 元件庫（Accordion、Dialog、Dropdown 等） |
| **react-dnd** | 16.0.1 | 拖曳功能（WBS 樹狀結構排序） |
| **Vite** | 6.3.5 | 建置工具 |

**UI 元件庫說明**：
- 本專案使用 **Shadcn UI 概念**，將 Radix UI 元件封裝於 `/src/app/components/ui/` 目錄
- 樣式系統統一使用 `/src/styles/theme.css` 與 `/src/styles/globals.css` 定義的 CSS 變數
- **強制要求**：所有元件必須使用 Design Tokens（顏色、間距、圓角、陰影等），不寫死 Tailwind class 數值

### 2.2 後端技術棧

| 技術 | 用途 | 備註 |
|------|------|------|
| **Supabase** | PostgreSQL 資料庫 | Schema: `aiproject` |
| **Supabase Storage** | 檔案儲存（PDF、Excel、圖片） | Bucket: `make-fe692720-project-[project_id]` |
| **Supabase Edge Functions** | AI 代理（安全呼叫 OpenAI/Anthropic API） | `/supabase/functions/server/` |

**重要架構原則**：
- ✅ **直接使用 Supabase Client（Direct Client）** 進行 CRUD 操作
- ❌ **禁止使用 Edge Functions 處理一般資料**（會導致 404 錯誤與延遲）
- ✅ **Edge Functions 僅用於 AI 推論與代理**（隔離 API Key、避免前端暴露）

### 2.3 AI 整合

| AI 供應商 | 支援模型 | 用途 |
|----------|---------|------|
| **OpenAI** | GPT-4o, GPT-4o-mini | AI 對話、文件解析、意圖識別 |
| **Anthropic** | Claude 3.5 Sonnet | AI 對話、文件解析 |
| **Google** | Gemini 2.0 Flash | AI 對話、文件解析 |

**AI 流程說明**：
1. 前端收集使用者輸入（文字、檔案、對話記錄）
2. 前端呼叫 Supabase Edge Function（`/functions/server/`）
3. Edge Function 使用加密的 API Key 呼叫 AI 供應商
4. AI 回傳結構化建議（JSON 格式）
5. 前端將建議卡顯示於「收件匣」，等待人工確認

### 2.4 文件解析功能

| 檔案類型 | 解析工具 | 支援格式 |
|---------|---------|---------|
| **PDF** | pdfjs-dist (5.4.449) | 文字提取 |
| **Excel** | xlsx (0.18.5) | 表格內容轉 JSON |
| **Word** | mammoth (1.11.0) | .docx 轉文字 |
| **圖片** | 透過 AI Vision API | PNG, JPG（OCR + 結構識別） |

**限制**：
- 檔案大小上限：10MB
- 文字長度上限：50,000 字元（避免 AI token 超限）

### 2.5 重要提醒

> ⚠️ **這些實作都是為了 UX Demo 與 Prototype，正式產品由工程師在 Antigravity 中決定最終技術棧與架構。**

建議工程師在 Antigravity 中考慮：
- 評估是否使用 **Next.js** 替代 Vite + React Router（支援 SSR、API Routes）
- 評估是否使用 **React Query** 統一資料狀態管理
- 評估是否使用 **Zustand / Jotai** 替代 Context API（避免不必要的 re-render）
- 評估是否使用 **Zod** 進行資料驗證與型別推斷

---

## 3. 畫面與模組結構

### 3.1 畫面列表

本系統採用「左側導航欄 + 單頁應用」架構，共 **5 個主要入口**：

#### 3.1.1 Dashboard（儀表板）

**功能目的**：
- 以「秘書簡報」形式呈現「需要你處理」的項目（逾期、卡關、待回覆）
- 顯示專案概況卡片（Brief Card）：專案狀態、風險項目、待處理任務數量

**主要使用者操作**：
- 查看專案摘要（自動生成或手動編輯）
- 點擊風險卡片跳轉至對應任務
- 查看最近更新的任務與文件

**技術實作檔案**：
- `/src/app/dashboard/DashboardPage.tsx`
- `/src/app/dashboard/BriefCard.tsx`

---

#### 3.1.2 Inbox（收件匣）

**功能目的**：
- AI 生成的「建議卡」（Suggestion Cards）集中管理區
- 使用者可以 **Confirm（確認入庫）**、**Edit（編輯後確認）**、**Reject（拒絕）**

**主要使用者操作**：
1. 上傳文件（PDF、Excel、圖片）或貼上文字
2. AI 自動解析並生成建議卡（任務、待回覆、決議等）
3. 使用者確認或編輯建議卡的標題、負責人、期限、Type
4. 確認後，建議卡轉為正式 **Item**，進入任務清單

**重要規則**：
- ✅ **建議卡（status = 'suggestion'）不算正式任務**，只有確認後才入庫
- ✅ **所有 Item 必須關聯到至少一個 Artifact（來源證據）**

**技術實作檔案**：
- `/src/app/inbox/InboxPage.tsx`
- `/src/app/components/inbox/InboxList.tsx`
- `/src/app/components/inbox/SuggestionCardV2.tsx`
- `/src/app/components/inbox/ArtifactViewDrawer.tsx`

---

#### 3.1.3 Tasks（任務清單）

**功能目的**：
- **單一工作入口**，以 **多視圖（Tabs）** 呈現不同任務類型
- 所有視圖共用同一套 **Item 資料**，只是篩選條件不同

**視圖列表**：

| 視圖名稱 | 篩選條件 | 預設顯示對象 |
|---------|---------|------------|
| **Actions（待辦）** | `type = 'general'` 且有 assignee | 一般成員 |
| **Pending（待回覆）** | `type = 'pending'` | 所有成員 |
| **Decisions（決議）** | `type = 'decision'` | 所有成員 |
| **CR（變更）** | `type = 'cr'` | 所有成員 |
| **Project Work（專案工作）** | 以 WorkPackage 分組，展開查看其底下的 Items | PM |

**重要規則**：
- ✅ **同一筆 Item 在任何視圖修改，其他視圖必須同步更新**（單一資料來源）
- ✅ **預設視圖規則**：PM 預設進入 Project Work，一般成員預設進入 Actions
- ✅ **支援 WBS 樹狀結構**：Items 可以有父子關係（`parent_id` 欄位）

**使用者操作**：
- 點擊任務卡片：開啟詳情抽屜（Drawer）
- 拖曳排序：Project Work 視圖中的第一層任務可拖曳上下排序
- 新增子任務：在任務卡片標題列點擊 `+` 按鈕
- 快速改狀態：下拉選單選擇（未開始、進行中、卡關、待回覆、已完成）
- 查看備註：在詳情抽屜中編輯與查看備註（支援多行文字）

**技術實作檔案**：
- `/src/app/tasks/TasksPage.tsx`
- `/src/app/tasks/views/ProjectWorkView.tsx`（專案工作視圖）
- `/src/app/tasks/views/ActionsView.tsx`（待辦視圖）
- `/src/app/tasks/views/PendingView.tsx`（待回覆視圖）
- `/src/app/tasks/views/DecisionsView.tsx`（決議視圖）
- `/src/app/tasks/views/CRView.tsx`（變更視圖）
- `/src/app/tasks/components/DraggableWBSCard.tsx`（拖曳卡片元件）
- `/src/app/tasks/components/ItemDetailDrawer.tsx`（詳情抽屜）

---

#### 3.1.4 Sources（文件庫）

**功能目的**：
- 顯示所有上傳的文件與輸入內容（Artifacts）
- 提供查看、下載、標記封存功能

**主要使用者操作**：
- 上傳新文件（支援 PDF、Excel、Word、圖片）
- 點擊文件查看內容（PDF 預覽、文字內容顯示）
- 查看「引用此文件的任務」（Citation 反向查詢）
- 封存不需要的文件（封存後仍保留，但不顯示於預設清單）

**重要規則**：
- ❌ **Artifact 原始內容不可修改**（維持證據鏈可信度）
- ✅ **允許修改顯示名稱與來源描述**（UI 層面）

**技術實作檔案**：
- `/src/app/sources/SourcesPage.tsx`
- `/src/app/sources/components/SourceCard.tsx`
- `/src/app/sources/components/SourceDetailPanel.tsx`
- `/src/app/sources/components/CreateSourceDialog.tsx`

---

#### 3.1.5 Settings（設定）

**功能目的**：
- 分為 **系統設定（System Settings）** 與 **專案設定（Project Settings）**
- **權限分離**：系統設定僅系統管理員可見

**系統設定（Admin Only）**：
- AI 供應商與模型選擇（OpenAI、Anthropic、Google）
- API Key 設定（加密儲存於 Supabase）
- AI 連線測試
- System Prompts 編輯（WBS 解析、意圖分類等）

**專案設定（PM）**：
- 專案基本資訊（名稱、描述、客戶）
- 成員管理（邀請、角色指派、停用）
- 專案狀態（啟用、封存、刪除）

**重要規則**：
- ❌ **API Key 等機密不得只存前端**（正式環境必須儲存於後端並加密）
- ✅ **AI 設定為全系統共用**（所有專案使用同一組 AI 供應商）
- ✅ **專案刪除採延遲機制**：標記刪除後 30 天才永久刪除，期間可復原

**技術實作檔案**：
- `/src/app/settings/SettingsPage.tsx`
- `/src/app/settings/views/SystemSettings.tsx`
- `/src/app/settings/views/ProjectSettings.tsx`
- `/src/app/settings/AISettingsPage.tsx`
- `/src/app/settings/components/SystemPromptsEditor.tsx`

---

### 3.2 模組檔案結構

```
/src/app/
├── App.tsx                     # 主應用入口（Router 設定）
├── layout/
│   ├── AppLayout.tsx           # 左側導航欄 + Outlet
│   └── Sidebar.tsx             # 左側選單（5 個入口）
├── context/
│   └── ProjectContext.tsx      # 全域 Project 狀態管理（當前專案、成員、工作包）
├── dashboard/                  # 儀表板模組
├── inbox/                      # 收件匣模組
├── tasks/                      # 任務清單模組（含多個子視圖）
├── sources/                    # 文件庫模組
├── settings/                   # 設定模組
├── components/
│   ├── chat/                   # AI 對話元件（浮動面板、輸入框）
│   ├── inbox/                  # 收件匣專用元件（建議卡、預覽抽屜）
│   ├── ui/                     # Shadcn UI 風格元件（Button、Dialog、Dropdown 等）
│   └── ...                     # 其他共用元件
└── ...
```

---

## 4. 使用流程（User Flows）

### 4.1 Flow 1：上傳規格書 → AI 解析 → 建立專案工作與任務

**起點畫面**：Dashboard 或 Inbox

**步驟**：
1. 使用者點擊「上傳文件」按鈕或拖曳檔案至上傳區
2. 系統將檔案儲存為 **Artifact**（內容不可修改）
3. 系統呼叫 Edge Function，AI 解析文件內容：
   - 識別 WBS 結構（層級、編號、標題、負責人、期限）
   - 提取任務項目（一般任務、待回覆、決議等）
4. AI 生成多張「建議卡」（Suggestion Cards），顯示於 **Inbox**
5. 使用者逐一檢視建議卡：
   - **Confirm**：直接入庫（轉為正式 Item）
   - **Edit**：修改標題、負責人、期限、Type 後再入庫
   - **Reject**：拒絕，建議卡不入庫
6. 確認後的 Items 出現於 **Tasks（任務清單）** 的對應視圖：
   - 若 AI 推測歸屬於某個 WorkPackage → 顯示於該 WorkPackage 底下
   - 若無法推測 → 顯示於「未分類」群組

**涉及畫面**：
- Dashboard / Inbox → Inbox（建議卡列表） → Tasks（Project Work 視圖）

**關鍵互動**：
- 上傳檔案（拖曳或點擊）
- AI 解析中提示（Loading + 進度條）
- 建議卡確認/編輯/拒絕
- 任務卡片拖曳排序

**預期結果**：
- ✅ 文件成功上傳並儲存為 Artifact
- ✅ AI 生成的建議卡出現於 Inbox
- ✅ 確認後的任務出現於 Tasks，並正確歸屬於 WorkPackage
- ✅ 所有 Item 可溯源到來源 Artifact（Citation）

---

### 4.2 Flow 2：PM 查看風險 → 更新任務狀態 → AI 提出建議

**起點畫面**：Dashboard

**步驟**：
1. PM 登入後，Dashboard 顯示「需要你處理」的項目：
   - 逾期任務（due_date < 今天且 status ≠ completed）
   - 卡關任務（status = 'blocked'）
   - 待回覆超過 5 天（status = 'awaiting_response' 且 ≥5 天）
2. PM 點擊風險卡片，跳轉至 **Tasks（Project Work 視圖）**
3. PM 點擊任務卡片，開啟 **詳情抽屜（Drawer）**
4. PM 更新任務狀態（例如：從「進行中」改為「卡關」）
5. 系統偵測到狀態變更，自動同步至其他視圖（若該任務同時是 CR，則 CR 視圖也會更新）
6. AI 主動偵測到「卡關」狀態，生成新的建議卡於 **Inbox**：
   - 建議：「是否需要新增待回覆項目？」
   - 建議：「是否需要調整期限或重新指派？」
7. PM 前往 Inbox 確認 AI 建議，決定是否接受

**涉及畫面**：
- Dashboard → Tasks（Project Work） → 詳情抽屜 → Inbox

**關鍵互動**：
- 點擊風險卡片跳轉
- 開啟詳情抽屜（Slide from right）
- 下拉選單快速改狀態
- AI 主動提示（Toast 通知 + Inbox 紅點）

**預期結果**：
- ✅ 任務狀態成功更新，所有視圖同步
- ✅ AI 生成相關建議卡於 Inbox
- ✅ PM 可以選擇接受或拒絕建議

---

### 4.3 Flow 3：AI 對話助理 → 查詢專案記憶 → 建立新任務

**起點畫面**：任意畫面（AI Chat Panel 為浮動元件）

**步驟**：
1. 使用者點擊右下角「AI 助理」按鈕，浮動面板開啟
2. 使用者輸入自然語言問題：「上週客戶提到的 API 金鑰問題處理了嗎？」
3. 系統將問題送至 Edge Function，AI 判斷意圖：
   - **Intent**：QUERY（查詢）
   - **Confidence**：0.85
4. AI 搜尋專案記憶（Artifacts + Items + Conversations）：
   - 找到關聯的 Artifact（某次會議記錄）
   - 找到關聯的 Item（狀態為「進行中」）
5. AI 回覆：「已找到相關任務：『申請客戶 API 金鑰』，目前狀態為進行中，負責人：John，預計 12/28 完成。」
6. 使用者追問：「幫我建立一個提醒任務，12/27 要確認進度」
7. AI 判斷意圖：CREATE（建立）
8. AI 生成建議卡於 **Inbox**：
   - 標題：「確認 API 金鑰申請進度」
   - Type：general
   - 負責人：當前使用者
   - 期限：12/27
9. 使用者前往 Inbox 確認，點擊 Confirm 入庫

**涉及畫面**：
- 任意畫面 → AI Chat Panel（浮動） → Inbox

**關鍵互動**：
- 浮動面板開啟/關閉
- 自然語言輸入（支援多輪對話）
- AI 回覆附帶 Citation（可點擊跳轉至來源）
- 建議卡自動出現於 Inbox

**預期結果**：
- ✅ AI 正確判斷意圖（QUERY / CREATE）
- ✅ AI 搜尋結果附帶 Citation 連結
- ✅ 建立的建議卡出現於 Inbox
- ✅ 確認後成功入庫為 Item

---

## 5. 資料模型與資料庫（Prototype Schema）

> ⚠️ **本節描述的是 Prototype 階段的資料模型，僅供工程師理解目前 UX 假設，正式資料庫設計與優化由工程師在 Antigravity 與後端環境中決定。**

### 5.1 核心主體（Core Entities）

#### 5.1.1 Project（專案）

**用途**：一個客戶案或內部案的獨立空間，所有資料必須隸屬某個 Project。

| 欄位名稱 | 資料類型 | 說明 | 限制 |
|---------|---------|------|------|
| id | UUID | 主鍵 | NOT NULL |
| name | TEXT | 專案名稱 | NOT NULL |
| description | TEXT | 專案描述 | 可選 |
| status | TEXT | 專案狀態 | 'active' / 'archived' / 'pending_deletion' / 'deleted' |
| pm_id | TEXT | 專案經理 ID | 可選 |
| deleted_at | TIMESTAMPTZ | 標記刪除時間 | 可選 |
| purge_at | TIMESTAMPTZ | 永久刪除時間（deleted_at + 30 天） | 可選 |
| created_at | TIMESTAMPTZ | 建立時間 | NOT NULL |
| updated_at | TIMESTAMPTZ | 更新時間 | 自動更新 |

**業務規則**：
- ✅ 專案封存（archived）後，成員不可編輯（唯讀）
- ✅ 專案刪除採「延遲刪除」：標記為 `pending_deletion` 後 30 天才永久刪除
- ✅ 30 天內可復原（status 改回 active）

---

#### 5.1.2 Member（專案成員）

**用途**：記錄專案成員的角色與狀態。

| 欄位名稱 | 資料類型 | 說明 | 限制 |
|---------|---------|------|------|
| id | UUID | 主鍵 | NOT NULL |
| project_id | UUID | 關聯到 Project | NOT NULL, FOREIGN KEY |
| email | TEXT | 成員 Email | NOT NULL |
| name | TEXT | 成員姓名 | NOT NULL |
| role | TEXT | 成員角色 | 'client' / 'pm' / 'designer' / 'engineer' / 'other' |
| role_display_name | TEXT | 自訂角色顯示名稱 | 可選 |
| status | TEXT | 成員狀態 | 'invited' / 'active' / 'disabled' |
| joined_at | TIMESTAMPTZ | 加入時間 | NOT NULL |

**業務規則**：
- ✅ 同一專案中，email 必須唯一（UNIQUE CONSTRAINT）
- ✅ 角色用於預設篩選、指派建議、視覺標示（MVP 不做複雜權限矩陣）

---

#### 5.1.3 Artifact（來源/證據）

**用途**：所有貼上文字、上傳檔案、截圖、連結、會議逐字稿等「原始輸入」，用於 Citation 溯源。

| 欄位名稱 | 資料類型 | 說明 | 限制 |
|---------|---------|------|------|
| id | UUID | 主鍵 | NOT NULL |
| project_id | UUID | 關聯到 Project | NOT NULL, FOREIGN KEY |
| content_type | TEXT | MIME type | NOT NULL |
| original_content | TEXT | 原始內容（不可修改） | NOT NULL |
| masked_content | TEXT | 遮罩敏感資訊後的內容 | 可選 |
| storage_path | TEXT | Supabase Storage 路徑 | 可選（檔案類型必填） |
| file_url | TEXT | 簽章 URL（1 小時有效） | 可選 |
| file_size | INTEGER | 檔案大小（bytes） | 可選 |
| file_hash | TEXT | SHA-256 雜湊值（去重與完整性檢查） | 可選 |
| archived | BOOLEAN | 是否封存 | 預設 false |
| meta | JSONB | 彈性欄位（channel, summary, source_info, uploader_id, file_name） | 可選 |
| created_at | TIMESTAMPTZ | 建立時間 | NOT NULL |

**業務規則**：
- ❌ **原始內容（original_content）不可修改**（維持證據鏈可信度）
- ✅ 允許修改 meta.summary、meta.source_info（UI 層面的顯示名稱）
- ✅ 檔案儲存於 Supabase Storage，使用簽章 URL（1 小時有效，過期需重新產生）
- ✅ file_hash 用於檔案去重（避免重複上傳相同檔案）

**content_type 範例**：
- `text/plain`：純文字
- `text/conversation`：對話記錄（LINE、Email）
- `text/uri-list`：連結清單
- `application/pdf`：PDF 文件
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`：Excel
- `image/png`、`image/jpeg`：圖片

---

#### 5.1.4 Item（任務項目）

**用途**：實際會被追蹤、指派、變更狀態的工作單位。**系統僅有一套 Item，透過不同視角（TAB/頁面）呈現。**

| 欄位名稱 | 資料類型 | 說明 | 限制 |
|---------|---------|------|------|
| id | UUID | 主鍵 | NOT NULL |
| project_id | UUID | 關聯到 Project | NOT NULL, FOREIGN KEY |
| type | TEXT | 任務類型 | 'general' / 'pending' / 'cr' / 'decision' |
| status | TEXT | 任務狀態 | 'not_started' / 'in_progress' / 'blocked' / 'awaiting_response' / 'completed' |
| title | TEXT | 標題 | NOT NULL |
| description | TEXT | 描述 | NOT NULL |
| source_artifact_id | UUID | 來源證據 | 可選, FOREIGN KEY to Artifact |
| assignee_id | TEXT | 負責人 ID | 可選 |
| work_package_id | UUID | 歸屬的專案工作 | 可選, FOREIGN KEY to WorkPackage |
| parent_id | UUID | 父任務 ID（樹狀結構） | 可選, FOREIGN KEY to Item |
| due_date | TIMESTAMPTZ | 期限 | 可選 |
| priority | TEXT | 優先級 | 'low' / 'medium' / 'high' |
| notes | TEXT | 備註內容（多行文字） | 可選 |
| notes_updated_at | TIMESTAMPTZ | 備註最後更新時間 | 可選 |
| notes_updated_by | TEXT | 備註最後更新者 email | 可選 |
| meta | JSONB | 彈性欄位（tags, confidence, pending target, rule scope, level, wbs_code） | 可選 |
| created_at | TIMESTAMPTZ | 建立時間 | NOT NULL |
| updated_at | TIMESTAMPTZ | 更新時間 | 自動更新 |

**業務規則**：
- ✅ **同一筆 Item 在任何視角修改，其他視角必須同步更新**（單一資料來源）
- ✅ **Type 決定任務出現在哪些 TAB**（type = 'pending' → 出現在 Pending TAB）
- ✅ **Status 只代表進度，不代表任務類型**（所有 Type 都用同一套 Status）
- ✅ **允許任務具有父子關係**（parent_id 欄位建立樹狀結構）
- ✅ **允許 Item 暫時不歸屬 WorkPackage**（work_package_id = null → 顯示於「未分類」群組）

**status 與 TAB 關係**（重要）：
- ❌ **「待回覆」是 Status（awaiting_response），不是 Type**
- ✅ Pending TAB 篩選條件：`type = 'pending'`（與 status 無關）
- ✅ 一個 `type = 'pending'` 的任務，status 可以是 'not_started' / 'in_progress' / 'completed' 等

**meta 欄位說明**：
- `level`：任務層級（1=根任務，2=第二層，依此類推）
- `wbs_code`：WBS 編號（例如 "1.1"、"2.3.1"）
- `waiting_on_type`：等待對象類型（'client' / 'internal' / 'external'）
- `waiting_on_name`：等待對象名稱
- `expected_response`：預期回覆內容
- `resolution_hint`：解決方向提示（'to_decision' / 'to_action' / 'workaround'）
- `category`：決議分類（'technical' / 'business' / 'ui_ux' / 'process' / 'other'）
- `scope`：決議範圍（'global' / 'module' / 'page'）
- `risk_level`：風險等級（'low' / 'medium' / 'high'）
- `impact_modules`：影響模組清單（陣列）
- `impact_pages`：影響頁面清單（陣列）

---

#### 5.1.5 WorkPackage（專案工作/工作包）

**用途**：專案層級的「交付/工作容器」，用於組織和歸類 Item。

| 欄位名稱 | 資料類型 | 說明 | 限制 |
|---------|---------|------|------|
| id | UUID | 主鍵 | NOT NULL |
| project_id | UUID | 關聯到 Project | NOT NULL, FOREIGN KEY |
| title | TEXT | 標題 | NOT NULL |
| description | TEXT | 描述 | 可選 |
| owner_id | TEXT | 負責人 ID | 可選 |
| status | TEXT | 狀態 | 'not_started' / 'in_progress' / 'completed' / 'on_hold' |
| module_id | UUID | 關聯到 Module | 可選, FOREIGN KEY |
| page_id | UUID | 關聯到 Page | 可選, FOREIGN KEY |
| milestone_id | UUID | 關聯到 Milestone | 可選, FOREIGN KEY |
| wave | TEXT | Wave 名稱 | 可選（例如 "Wave 1"、"Phase A"） |
| target_date | TIMESTAMPTZ | 目標完成日期 | 可選 |
| completion_rate | INTEGER | 完成率（0-100） | 可選（從關聯的 Items 計算） |
| source_artifact_id | UUID | 來源 WBS/規格文件 | 可選, FOREIGN KEY to Artifact |
| notes | TEXT | 備註內容（多行文字） | 可選 |
| notes_updated_at | TIMESTAMPTZ | 備註最後更新時間 | 可選 |
| notes_updated_by | TEXT | 備註最後更新者 email | 可選 |
| meta | JSONB | 彈性欄位（order, suggested_module, suggested_page, citation） | 可選 |
| created_at | TIMESTAMPTZ | 建立時間 | NOT NULL |
| updated_at | TIMESTAMPTZ | 更新時間 | 自動更新 |

**業務規則**：
- ✅ 主要由 PM 建立與指派，但其他成員也可建立
- ✅ WorkPackage 本身不是「個人待辦」；指派後才會轉成個人/團隊可執行的「任務」
- ✅ completion_rate 從關聯的 Items 自動計算：`(已完成 Items / 總 Items) * 100`

---

#### 5.1.6 SystemAIConfig（系統 AI 設定）

**用途**：全系統唯一的 AI 供應商與模型設定（所有專案共用）。

| 欄位名稱 | 資料類型 | 說明 | 限制 |
|---------|---------|------|------|
| id | UUID | 主鍵 | NOT NULL |
| provider | TEXT | AI 供應商 | 'openai' / 'anthropic' / 'google' |
| model | TEXT | 模型名稱 | NOT NULL |
| api_key | TEXT | API Key（加密儲存） | NOT NULL |
| api_endpoint | TEXT | API Endpoint | 可選 |
| is_active | BOOLEAN | 是否啟用 | 預設 false |
| last_tested_at | TIMESTAMPTZ | 最後測試時間 | 可選 |
| test_status | TEXT | 測試狀態 | 'success' / 'failed' / 'pending' |
| created_at | TIMESTAMPTZ | 建立時間 | NOT NULL |
| updated_at | TIMESTAMPTZ | 更新時間 | 自動更新 |

**業務規則**：
- ✅ **系統只能有一組啟用中的 AI 設定**（is_active = true）
- ✅ **API Key 必須加密儲存於 Supabase**（前端顯示時遮罩，只顯示前後各 3 字元）
- ✅ **供應商與模型必須配對正確**（例如 OpenAI 供應商不能選擇 Claude 模型）
- ✅ **測試連線建議在儲存前執行**（但非強制）

---

### 5.2 輔助主體（Supporting Entities）

#### 5.2.1 Module（功能模組）
用於執行地圖（Execution Map）功能。

#### 5.2.2 Page（頁面）
用於執行地圖功能。

#### 5.2.3 Milestone（里程碑）
用於時間軸顯示。

#### 5.2.4 Conversation（對話）
用於 AI 助理多輪對話記錄。

#### 5.2.5 Message（訊息）
用於儲存對話中的每一則訊息。

#### 5.2.6 SystemPromptConfig（系統提示詞設定）
用於自訂 AI 解析行為（WBS 解析、意圖分類、場景提示詞模板）。

---

### 5.3 資料庫 Schema（Supabase）

**Schema 名稱**：`aiproject`

**DDL 檔案位置**：
- `/docs/sql/create_projects_tables.sql`（核心資料表）
- `/docs/sql/ai_settings_schema.sql`（AI 設定表）
- `/docs/sql/create_conversations_schema.sql`（對話記錄表）
- `/docs/sql/create_system_prompts_table.sql`（系統提示詞表）

**RLS（Row Level Security）**：
- 目前 Prototype 未啟用 RLS（開發階段使用 Service Role Key）
- 正式環境建議啟用 RLS，並根據專案成員角色設定權限

**索引（Index）**：
- 所有外鍵欄位都有索引（project_id, assignee_id, work_package_id, parent_id）
- 常用篩選欄位有索引（status, type, created_at, due_date）

---

## 6. 架構設計（Architecture）

### 6.1 Adapter Pattern（轉接器模式）

**目的**：支援從「本地開發」無縫遷移至「Supabase 上線」。

**核心原則**：
- ✅ **Adapter 介面一致性**：無論是 `LocalAdapter` 或 `SupabaseAdapter`，回傳格式必須統一模擬 Supabase 格式：`{ data: T | null, error: Error | null }`
- ✅ **強制非同步（Async by Default）**：本地端實作即使讀取 localStorage，也必須封裝為 Promise (Async/Await)
- ✅ **Singleton Pattern**：禁止重複建立 Client，必須透過 `StorageFactory` 全域僅有一個實例

**實作檔案**：
- `/src/lib/storage/StorageFactory.ts`（Singleton 工廠）
- `/src/lib/storage/LocalAdapter.ts`（本地端實作）
- `/src/lib/storage/SupabaseAdapter.ts`（Supabase 實作）
- `/src/lib/storage/types.ts`（型別定義）

**切換方式**：
```typescript
// 本地開發模式
const storage = StorageFactory.getClient('local');

// Supabase 上線模式
const storage = StorageFactory.getClient('supabase');
```

---

### 6.2 單一資料來源（Single Source of Truth）

**核心原則**：
- ✅ **Item 是所有「任務卡片」的唯一資料來源**
- ✅ 「收件匣、任務清單、待確認、變更、決議、專案工作」都只能顯示同一批 Item 的不同篩選/分組結果
- ❌ **禁止建立「重複任務卡片」**
- ❌ **禁止在不同模組各自維護狀態**（會造成不同步）

**連動一致性**：
- 同一筆 Item 在任何視角修改（狀態/期限/負責人/內容），其他視角必須同步更新

---

### 6.3 證據鏈（Citation）

**核心原則**：
- ✅ **每個 Item 都應該關聯到至少一個 Artifact**（source_artifact_id）
- ✅ **Artifact 原始內容不可修改**（維持證據鏈可信度）
- ✅ **UI 必須提供 Citation 連結**（點擊後跳轉至來源 Artifact）

**實作方式**：
- Item 透過 `source_artifact_id` 關聯到 Artifact
- Artifact 透過 `meta.citation` 記錄來源位置資訊（頁碼、段落、highlight_text）
- 前端點擊 Citation 連結後，開啟 Artifact 詳情抽屜，並高亮相關文字

---

### 6.4 AI 意圖路由（Intent Routing）

**核心原則**：
- ✅ **AI 只做「意圖判斷＋建議產生＋必要追問」，不直接寫入最終資料**
- ✅ **所有新增/更新 → 先進 Inbox → 人工確認**
- ✅ **上下文最小化**：只提供「當前專案＋成員＋必要相關來源/項目」

**意圖類型（IntentType）**：
- `CREATE`：建立新的任務/待回覆/決議/變更
- `QUERY`：查詢專案記憶（Artifacts + Items + Conversations）
- `UPDATE`：更新現有任務的狀態/期限/負責人
- `RELATE`：關聯多個任務/來源
- `CLARIFY`：資訊不足，需要追問

**AI 回覆結構**：
```typescript
interface AIResponse {
  intent: IntentType;
  confidence: number;
  message: string;
  suggestions?: SuggestionDraft[];
  searchResults?: {
    items: Item[];
    artifacts: Artifact[];
    summary: string;
  };
  clarifications?: Clarification[];
  citations: Citation[];
}
```

**實作檔案**：
- `/src/lib/ai/AIService.ts`（AI 服務主邏輯）
- `/src/lib/ai/GeneratorService.ts`（建議卡生成）
- `/src/lib/ai/fileParser.ts`（文件解析）
- `/src/lib/ai/prompts.ts`（提示詞模板）

---

## 7. 目前限制與待優化項目

### 7.1 程式碼結構

**已知問題**：
- ❌ **元件拆分不夠細**：部分頁面元件過於肥大（例如 `TasksPage.tsx` 超過 500 行）
- ❌ **狀態管理分散**：使用 Context API + useState，未統一使用狀態管理庫
- ❌ **缺乏錯誤處理**：部分 API 呼叫未包裹 try-catch，錯誤訊息不友善
- ❌ **缺少測試**：無單元測試與整合測試
- ❌ **型別定義不完整**：部分 meta 欄位未定義嚴格型別（使用 `Record<string, any>`）

**建議優化**：
- ✅ 引入 **React Query** 統一管理 API 呼叫與快取
- ✅ 引入 **Zustand / Jotai** 替代 Context API（減少不必要的 re-render）
- ✅ 引入 **Zod** 進行資料驗證與型別推斷
- ✅ 引入 **Vitest** + **React Testing Library** 進行測試

---

### 7.2 UX / 功能缺口

**已知缺口**：
- ❌ **缺少「批次操作」功能**：無法批次修改多個任務的狀態/負責人
- ❌ **缺少「通知系統」**：逾期/卡關任務無主動推播（目前只在 Dashboard 顯示）
- ❌ **缺少「權限矩陣」**：目前只有簡單的角色標籤，無細緻權限控制
- ❌ **缺少「版本控制」**：WorkPackage 與 Item 的修改歷史未記錄
- ❌ **缺少「範本功能」**：無法將現有專案存為範本，快速建立新專案
- ❌ **缺少「匯出報表」**：無法匯出專案進度報表（Excel / PDF）
- ❌ **缺少「整合第三方服務」**：無 Gmail / LINE / Slack 自動同步（目前需手動貼上內容）

**建議迭代方向**：
- ✅ 優先補強「批次操作」與「通知系統」（高頻使用場景）
- ✅ 評估是否需要「細緻權限控制」（取決於目標客戶規模）
- ✅ 整合 Gmail API / LINE Notify / Slack Webhook（自動化輸入流程）

---

### 7.3 效能與擴展性

**已知問題**：
- ❌ **大量任務載入慢**：未實作虛擬滾動（Virtual Scroll），超過 100 筆任務會卡頓
- ❌ **檔案上傳無分片**：大檔案上傳失敗率高（目前上限 10MB）
- ❌ **AI 推論延遲高**：Edge Function 冷啟動時間 2-3 秒，使用者體驗不佳
- ❌ **搜尋功能簡陋**：前端簡單字串比對，無全文檢索（Full-Text Search）

**建議優化**：
- ✅ 引入 **react-window** 實作虛擬滾動
- ✅ 檔案上傳改用 **分片上傳（Chunked Upload）**，支援斷點續傳
- ✅ AI 推論改用 **Streaming Response**（逐字顯示，降低等待感）
- ✅ 引入 **PostgreSQL Full-Text Search** 或 **Elasticsearch**（正式環境）

---

### 7.4 安全性

**已知問題**：
- ❌ **API Key 儲存於前端 localStorage**（開發階段暫時方案）
- ❌ **未啟用 RLS（Row Level Security）**（所有資料可被任意讀取）
- ❌ **未實作 CSRF 防護**
- ❌ **未實作 Rate Limiting**（AI 推論可能被濫用）

**強制要求（正式環境）**：
- ✅ **API Key 必須儲存於後端並加密**（使用 Supabase Vault）
- ✅ **啟用 RLS**，根據專案成員角色設定權限
- ✅ **實作 Rate Limiting**（Supabase Edge Functions 或 API Gateway）
- ✅ **實作 CSRF Token**（防止跨站請求偽造）

---

## 8. 給工程師與 Antigravity 的建議

### 8.1 重構方向

**核心原則**：
- ✅ **工程師應以這份文件 + Figma Design 最終 Mockup + 這個 Figma Make 雛形作為理解依據**
- ✅ **工程師可以重構、替換或重寫現有程式碼結構，只要維持 UX 流程與關鍵互動一致**
- ❌ **不建議直接把目前的 Prototype 程式碼原封不動上線**（程式碼品質不足以支撐正式產品）

**建議技術棧（供參考）**：
- **前端框架**：Next.js 14 (App Router) + React 18 + TypeScript
- **狀態管理**：Zustand（輕量、易測試）或 Jotai（原子化狀態）
- **API 管理**：React Query（快取、重試、樂觀更新）
- **UI 元件庫**：繼續使用 Radix UI + Tailwind CSS 4（保持 Design Tokens）
- **資料驗證**：Zod（型別安全的 Schema 驗證）
- **測試**：Vitest + React Testing Library + Playwright（E2E）
- **CI/CD**：GitHub Actions + Vercel（前端）+ Supabase（後端）

---

### 8.2 資料庫設計建議

**優化方向**：
- ✅ **引入 Full-Text Search**：在 `artifacts.original_content` 與 `items.title/description` 建立 GIN 索引
- ✅ **引入 Soft Delete Pattern**：所有資料不直接刪除，改為標記 `deleted_at`
- ✅ **引入 Audit Log**：記錄所有 CRUD 操作（who, what, when）
- ✅ **引入 Materialized View**：加速 Dashboard 統計查詢（逾期任務、卡關任務數量）
- ✅ **引入 Partition**：若單一專案任務超過 10,000 筆，考慮依 `created_at` 分區

**Schema 優化建議**：
- ✅ 將 `meta` JSONB 欄位的常用鍵值提升為獨立欄位（例如 `meta.level` → `level` INTEGER）
- ✅ 將 `assignee_id` 改為 UUID，並建立 FOREIGN KEY 關聯到 `members` 表
- ✅ 將 `pm_id` 改為 UUID，並建立 FOREIGN KEY 關聯到系統用戶表（若有）

---

### 8.3 AI 整合建議

**優化方向**：
- ✅ **引入 Streaming Response**：AI 回覆逐字顯示，降低等待感（使用 Server-Sent Events）
- ✅ **引入 Prompt Caching**：相同上下文的多次推論可節省 Token 費用（Anthropic 支援）
- ✅ **引入 Fallback 機制**：當主要 AI 供應商故障時，自動切換至備用供應商
- ✅ **引入 Token 用量監控**：記錄每次推論的 Token 使用量，避免費用爆炸
- ✅ **引入 RAG（Retrieval-Augmented Generation）**：搭配向量資料庫（pgvector / Pinecone）提升搜尋準確度

**Prompt Engineering 建議**：
- ✅ 將 System Prompts 儲存於資料庫（`system_prompts` 表），方便 A/B 測試
- ✅ 針對不同場景（WBS 解析、會議記錄整理、需求分析）使用不同的 Prompt 模板
- ✅ 引入 Few-Shot Learning：在 Prompt 中提供 2-3 個範例，提升輸出品質

---

### 8.4 部署建議

**前端部署**：
- ✅ **Vercel**（推薦）：與 Next.js 深度整合，支援自動部署、Edge Functions、Analytics
- ✅ **Netlify**（替代）：類似 Vercel，支援 Serverless Functions
- ✅ **Cloudflare Pages**（替代）：全球 CDN，速度快，費用低

**後端部署**：
- ✅ **Supabase**（推薦）：PostgreSQL + Storage + Edge Functions + Auth 全包，開發速度快
- ✅ **自架 PostgreSQL + S3 + AWS Lambda**（替代）：彈性高，但維護成本高

**CI/CD 建議**：
- ✅ 前端：GitHub Actions + Vercel（自動部署）
- ✅ 後端：Supabase CLI + GitHub Actions（自動執行 Migration）
- ✅ 測試：每次 PR 自動執行測試，通過才允許合併

---

### 8.5 安全性檢核清單

在正式上線前，必須完成以下檢核：

- [ ] **API Key 已從前端移除**（改為後端加密儲存）
- [ ] **已啟用 Supabase RLS**（Row Level Security）
- [ ] **已實作 Rate Limiting**（防止 AI 推論濫用）
- [ ] **已實作 CSRF 防護**
- [ ] **已實作 XSS 防護**（React 預設已處理，但需檢查 `dangerouslySetInnerHTML`）
- [ ] **已實作 SQL Injection 防護**（使用 Parameterized Query）
- [ ] **已實作檔案上傳驗證**（檔案類型、大小、副檔名檢查）
- [ ] **已實作 HTTPS**（強制使用）
- [ ] **已實作日誌監控**（Sentry / LogRocket）
- [ ] **已實作資料備份策略**（自動備份 + 定期測試復原）

---

## 9. 附錄：關鍵檔案索引

### 9.1 核心架構

| 檔案路徑 | 說明 |
|---------|------|
| `/src/app/App.tsx` | 主應用入口（Router 設定） |
| `/src/app/context/ProjectContext.tsx` | 全域 Project 狀態管理 |
| `/src/lib/storage/StorageFactory.ts` | Singleton 工廠（Adapter Pattern） |
| `/src/lib/storage/LocalAdapter.ts` | 本地端實作 |
| `/src/lib/storage/SupabaseAdapter.ts` | Supabase 實作 |
| `/src/lib/storage/types.ts` | 型別定義 |

### 9.2 UI 元件

| 檔案路徑 | 說明 |
|---------|------|
| `/src/app/components/ui/button.tsx` | 按鈕元件 |
| `/src/app/components/ui/dialog.tsx` | 對話框元件 |
| `/src/app/components/ui/dropdown-menu.tsx` | 下拉選單元件 |
| `/src/app/components/ui/drawer.tsx` | 抽屜元件 |
| `/src/app/components/ui/badge.tsx` | 徽章元件 |

### 9.3 AI 功能

| 檔案路徑 | 說明 |
|---------|------|
| `/src/lib/ai/AIService.ts` | AI 服務主邏輯 |
| `/src/lib/ai/GeneratorService.ts` | 建議卡生成 |
| `/src/lib/ai/fileParser.ts` | 文件解析 |
| `/src/lib/ai/prompts.ts` | 提示詞模板 |
| `/src/hooks/useAIChat.ts` | AI 對話 Hook |

### 9.4 資料庫 Schema

| 檔案路徑 | 說明 |
|---------|------|
| `/docs/sql/create_projects_tables.sql` | 核心資料表 DDL |
| `/docs/sql/ai_settings_schema.sql` | AI 設定表 DDL |
| `/docs/sql/create_conversations_schema.sql` | 對話記錄表 DDL |
| `/docs/sql/create_system_prompts_table.sql` | 系統提示詞表 DDL |

### 9.5 文件

| 檔案路徑 | 說明 |
|---------|------|
| `/guidelines/Product_Context.md` | 產品背景與核心概念 |
| `/docs/spac/rules.md` | 全域業務規則 |
| `/docs/plan/*.md` | 各模組的規劃文件 |
| `/guidelines/Guidelines.md` | 開發流程與架構規範 |

---

## 10. 結語

本文件旨在幫助工程師快速理解「AI 專案秘書系統」的核心概念、資料模型、使用流程與架構設計。

**請注意**：
- ⚠️ 本文件描述的是 **Prototype 階段的實作**，不是最終產品規格
- ✅ 工程師應以「理解 UX 流程與業務邏輯」為主，而非直接照搬程式碼
- ✅ 正式產品的技術棧、資料庫設計、安全性措施，由工程師在 Antigravity 中決定
- ✅ 若有任何疑問，請參考 `/guidelines/Product_Context.md` 與 `/docs/spac/rules.md`

**祝開發順利！** 🚀

---

**文件結束**
