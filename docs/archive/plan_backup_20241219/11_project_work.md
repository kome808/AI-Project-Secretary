⚠️ **DEPRECATED**：本文件已被新版 docs/plan/Tasks_View_ProjectWork.md 取代，請勿作為開發依據。

---

# Module 11：Project Work（專案工作包與執行地圖）模組規格

> 本模組的核心不是做第二套 Jira，而是把 **WBS / 系統規格書**轉成可指派、可回報、可對齊里程碑的「工作包（Work Package / Project Work）」。
>
> 「模組/頁面執行地圖（Module/Page Map）」是本模組的一種視圖（Map View），用來把工作包與功能架構、時間波段（Milestone/Wave）視覺化對齊。

---

## 1. 模組目標

1. **把文件變工作**：PM 上傳 WBS 或系統規格書後，AI 產生「工作包建議」，經人工確認後入庫，形成專案初始工作主幹。
2. **責任到人**：每個工作包可指派 Owner（負責人），並能掛載里程碑/Wave（或目標完成日）。
3. **回報要省事**：成員用一句話回報進度，AI 協助把回報落地為 Actions / Pending / CR 等可追蹤物件（必要時才產生）。
4. **控制塔對齊**：用 Map View 將「功能架構（模組/頁面）」×「WBS 時間（波段/里程碑）」對齊呈現，並可從節點下鑽到相關 Items 與 Citation。

---

## 2. 模組定位與邊界

### 2.1 模組定位（一句話）

> Module 11 是「交付地圖＋責任主幹」：用工作包把 WBS/規格變成可執行的交付單位，再以地圖視圖對齊里程碑與風險。

### 2.2 與其他模組的邊界

* **Module 2（Chat & Inbox）**：

  * WBS/規格書的 AI 提取結果，必須以「建議卡」形式先進 Inbox，**確認後才入庫**成為正式工作包。
* **Module 3（Actions）**：

  * Actions 是日常任務；工作包是中層交付單位。
  * 工作包不做完整任務系統，細項落在 Actions。
* **Module 4（Pending）**：

  * 回報若牽涉「等客戶/等外部回覆」可落地為 Pending。
* **Module 7（Change Request）**：

  * 變更影響範圍可連到工作包/模組/頁面節點，協助評估 impact。
* **Module 10（Dashboard）**：

  * Dashboard 的健康度/風險可引用工作包彙總（例如本週波段、卡關工作包）。
* **Module 6（Documents & Artifacts）**：

  * 工作包必須可回溯到來源 Artifact（WBS/規格段落），並支援雙向追蹤。

---

## 3. 使用情境（MVP 必須支援）

### 3.1 PM：上傳 WBS / 規格書，建立專案工作主幹

1. PM 上傳文件或貼上內容。
2. AI 產生「工作包建議卡」：包含工作包標題、對應模組/頁面（若可判斷）、建議里程碑/Wave（若可判斷）、引用來源。
3. PM 在 Inbox 編輯/確認後入庫，形成正式工作包。

### 3.2 團隊：指派 Owner、對齊波段、開始回報

* PM 在工作包清單中快速指派 Owner、設定 Wave/目標日。
* 成員在工作包上用一句話回報：

  * 例如「登入頁已完成，等客戶確認 SSO 流程」→ AI 建議建立 Pending 或 CR（走 Inbox 確認）。

### 3.3 PM/主管：用執行地圖檢視交付與風險

* Map View 依里程碑/Wave 顯示工作包/模組/頁面節點。
* 節點上顯示風險燈號（blocked/overdue/high-risk CR）與完成率。
* 點擊節點可下鑽查看相關 Actions / Pending / CR，並附 Citation。

---

## 4. 主要功能範圍

## 4.1 Work List（工作包清單）

### 必顯示欄位（MVP）

* 工作包標題
* Owner（負責人）
* Wave / Milestone（或目標日）
* 完成率（由關聯 Actions 推導）
* 風險提示（blocked / overdue / high-risk CR）
* Citation（可點回來源 Artifact）

### 操作（MVP）

* 指派/更換 Owner
* 指定 Wave / 目標日
* 進入工作包詳情

> 原則：工作包不做複雜狀態流，避免變成第二套任務系統。

---

## 4.2 Work Detail（工作包詳情）

### 必備區塊（MVP）

1. **摘要區**：標題、Owner、Wave/目標日、風險燈號、完成率
2. **關聯 Items**：

   * Actions（執行中/逾期/卡關優先顯示）
   * Pending（等待客戶/外部回覆）
   * Change Requests（若有）
   * Decisions（若有、可選）
3. **來源回溯（Citation）**：可點回 Artifact，看到來源段落
4. **回報入口（Update）**：

   * 一句話回報輸入框（針對此工作包的局部上下文）
   * 提供快捷 chips（例：更新進度 / 標記卡關 / 等客戶回覆 / 提出變更）

### 回報落地規則（MVP）

* 回報內容可由 AI 產生「建議卡」：

  * 需要建立 Action / Pending / CR 時 → 先進 Inbox 待確認
* 若只是一句狀態更新，可記錄為工作包動態（Activity）而不一定產生新 Item（避免碎片化爆量）。

---

## 4.3 Map View（模組/頁面 × 波段 的執行地圖視圖）

> Map View 是視圖，不是獨立重型排程工具。MVP 先做到「對齊可讀、可下鑽」。

### 呈現方式（MVP 二選一，視 Figma Make 產出）

* **方式 A：雙欄對齊**

  * 左：功能樹（模組→頁面/工作包）
  * 右：波段欄（Milestone/Wave）
  * 節點在右側欄位顯示所屬波段

* **方式 B：依波段分組**

  * 上：波段切換（Tabs/Chips）
  * 下：該波段底下的工作包/模組/頁面列表與完成率

### 節點資訊（MVP）

* 節點名稱 + 完成率
* 風險燈號（blocked/overdue/high-risk CR）
* 點擊節點 → 下鑽到 Work Detail 或相關 Items 清單

---

## 4.4 AI Extraction（WBS/規格提取為工作包）

### 輸入方式（MVP）

* 貼上文字
* 上傳文件（Word/PDF/Excel/圖片）

### 輸出方式（MVP）

* 產生「工作包建議卡」並送往 Inbox：

  * 建議工作包標題
  * 建議對應模組/頁面（可選）
  * 建議波段/里程碑（可選）
  * Citation（來源段落/頁碼/檔名）

### 入庫規則（MVP）

* 必須經人工確認（Confirm）才會建立正式工作包
* 支援 Edit 後確認、Reject 丟棄

---

## 5. UI/UX 設計原則

1. **中層粒度**：工作包粒度可到頁面，但不取代任務（Actions）。
2. **少填表、多對話**：回報與拆解以一句話為主，搭配 chips 引導。
3. **風險優先**：清單與地圖要讓卡關/逾期/高風險一眼可見。
4. **一鍵下鑽**：從地圖/清單點一下就能進到 Work Detail、再到相關 Items 與來源。

---

## 6. 驗收標準（Acceptance Criteria）

1. PM 上傳 WBS/規格內容後，能產生「工作包建議卡」並出現在 Inbox。
2. 建議卡確認入庫後，能在工作包清單看到新增的工作包。
3. 工作包可指派 Owner、指定 Wave/目標日，並可在清單中立即看到變更。
4. Work Detail 可看到關聯的 Actions/Pending/CR，並能點回 Citation（Artifact）。
5. 在 Map View 能看到工作包/功能節點與 Wave 的對齊關係，且節點可下鑽。
6. 工作包風險燈號會根據關聯 Items（blocked/overdue/high-risk CR）正確顯示。

---

## 7. 測試案例（供 QA/設計驗證）

1. 上傳一份含 5 個模組/10 個頁面的規格文字 → Inbox 出現工作包建議卡（至少 5～10 筆）。
2. Confirm 其中 3 筆 → Work List 出現 3 筆正式工作包，且均有 Citation。
3. 指派 Owner + 設定 Wave 後刷新 → 設定仍保留且顯示正確。
4. 於某工作包底下建立 2 筆 Actions（1 blocked、1 overdue）→ Work List 與 Map View 風險燈號亮起。
5. 點擊 Map View 節點 → 能進到 Work Detail，並看到該節點關聯 Items 與來源。
6. 在 Work Detail 回報「等客戶回覆」→ AI 產生 Pending 建議卡進 Inbox（需 Confirm 才入庫）。
