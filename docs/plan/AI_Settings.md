# AI 供應商與模型設定 - 功能規劃

> 版本：V1.0  
> 更新日期：2024-12-22  
> 狀態：設計中

## 1. 功能目標

提供全系統層級的 AI 供應商與模型設定介面，讓使用者可以：
- 選擇 AI 供應商（OpenAI、Anthropic、Google Gemini）
- 選擇對應的模型
- 輸入並儲存 API Key（加密儲存於 Supabase）
- 測試連線是否正常
- 查看當前設定狀態

## 2. 設定層級

**全系統層級（System-wide）**
- 所有專案共用同一組 AI 設定
- 設定儲存於 `system_ai_config` 表（非 project_id 關聯）
- 僅系統管理員可修改（未來擴充權限控制）

## 3. 支援的 AI 供應商與模型

### OpenAI
- `gpt-4.5-turbo` - GPT-4.5 Turbo（推薦）
- `gpt-4.5-mini` - GPT-4.5 Mini（經濟）
- `gpt-4.5-nano` - GPT-4.5 Nano（最快）

### Anthropic
- `claude-3-5-sonnet-20241022` - Claude 3.5 Sonnet（推薦）
- `claude-3-5-haiku-20241022` - Claude 3.5 Haiku（快速）
- `claude-3-opus-20240229` - Claude 3 Opus（最強）

### Google Gemini
- `gemini-2.0-flash-exp` - Gemini 2.0 Flash（推薦）
- `gemini-1.5-pro` - Gemini 1.5 Pro
- `gemini-1.5-flash` - Gemini 1.5 Flash

## 4. 資料結構

### system_ai_config 表

| 欄位 | 類型 | 說明 | 必填 |
|------|------|------|------|
| id | UUID | 主鍵 | ✅ |
| provider | TEXT | 供應���（openai/anthropic/google） | ✅ |
| model | TEXT | 模型名稱 | ✅ |
| api_key | TEXT | API Key（加密） | ✅ |
| api_endpoint | TEXT | API Endpoint（可選，用於自訂） | ❌ |
| is_active | BOOLEAN | 是否啟用 | ✅ |
| last_tested_at | TIMESTAMPTZ | 最後測試時間 | ❌ |
| test_status | TEXT | 測試狀態（success/failed/pending） | ❌ |
| created_at | TIMESTAMPTZ | 建立時間 | ✅ |
| updated_at | TIMESTAMPTZ | 更新時間 | ✅ |

**特性：**
- 全域唯一：只有一筆 `is_active = true` 的設定
- API Key 加密：使用 Supabase 的 RLS + Vault（或前端加密）

## 5. 核心流程

### 5.1 設定 AI 供應商

```
[使用者] → 進入「設定 → AI 設定」
         → 選擇供應商（下拉選單）
         → 選擇模型（根據供應商動態載入）
         → 輸入 API Key（密碼欄位）
         → [可選] 測試連線
         → 點擊「儲存」
         → 系統：儲存至 Supabase system_ai_config 表
         → 顯示：「設定已儲存」
```

### 5.2 測試連線

```
[使用者] → 點擊「測試連線」
         → 系統：呼叫對應 AI API（簡單 prompt）
         → 成功：顯示「✅ 連線成功」，更新 last_tested_at
         → 失敗：顯示「❌ 連線失敗：{錯誤訊息}」
```

### 5.3 查看當前設定

```
[頁面載入] → 從 Supabase 讀取 is_active = true 的設定
           → 顯示：供應商、模型、測試狀態、最後測試時間
           → API Key：顯示為 "sk-***...***xyz"（遮罩）
```

## 6. 安全性設計

### 6.1 API Key 保護
- **前端顯示**：遮罩顯示（只顯示前 3 字元與後 3 字元）
- **傳輸**：HTTPS + Supabase RLS
- **儲存**：Supabase 加密儲存（使用 Vault 或 pgcrypto）

### 6.2 權限控制
- **Local Phase**：無權限控制（單人使用）
- **Supabase Phase**：僅系統管理員可修改（RLS Policy）

## 7. UI/UX 規劃

### 7.1 設定頁面結構

```
設定
├── 系統管理
│   ├── 專案列表
│   ├── AI 設定 ← 新增
│   └── 開發工具
└── 專案設定
    ├── 基本資訊
    └── 成員管理
```

### 7.2 AI 設定頁面佈局

```
┌─────────────────────────────────────────┐
│ 🤖 AI 供應商與模型設定                    │
│ 設定系統使用的 AI 服務供應商與模型         │
├─────────────────────────────────────────┤
│                                         │
│ [當前設定狀態卡片]                        │
│   供應商: OpenAI                         │
│   模型: gpt-4o                           │
│   狀態: ✅ 連線正常                       │
│   最後測試: 2024-12-22 10:30             │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│ 供應商                                   │
│ [下拉選單: OpenAI / Anthropic / Google]  │
│                                         │
│ 模型                                     │
│ [下拉選單: gpt-4o / gpt-4o-mini / ...]   │
│                                         │
│ API Key                                 │
│ [密碼輸入框: sk-***************]          │
│                                         │
│ API Endpoint（可選）                     │
│ [輸入框: https://api.openai.com/v1]     │
│                                         │
│ [測試連線] [儲存設定]                     │
│                                         │
├─────────────────────────────────────────┤
│ ℹ️ API Key 會加密儲存於資料庫中            │
│ 🔒 請確保 API Key 安全，勿與他人分享       │
└──────────��──────────────────────────────┘
```

## 8. 使用情境

AI 設定會套用至以下功能：

1. **儀表板 - 晨間簡報生成**
   - 使用 AI 分析專案狀態，產生摘要

2. **收件匣 - 文件解析**
   - 使用 AI 解析上傳的文件（PDF、Word、圖片）
   - 自動建立建議卡（Suggestions）

3. **AI 秘書對話**
   - 儀表板「問 AI 秘書」輸入框
   - 自然語言查詢與指令

4. **未來擴充**
   - 自動分類任務
   - 智慧提醒
   - 風險預測

## 9. 開發階段

### Phase 1：基礎設定（當前階段）
- ✅ Supabase Schema 設計
- ✅ Adapter 實作（SupabaseAdapter）
- ✅ UI 頁面（設定 → AI 設定）
- ✅ 測試連線功能

### Phase 2：AI 服務整合（下一階段）
- ⬜ Edge Function：AI Proxy
- ⬜ 文件解析功能
- ⬜ 晨間簡報生成
- ⬜ 對話功能

### Phase 3：進階功能
- ⬜ 支援多組 AI 設定（不同用途）
- ⬜ 使用量統計
- ⬜ 成本追蹤

## 10. 驗證規則

### 10.1 必填欄位
- 供應商：必選
- 模型：必選
- API Key：必填，長度 > 10

### 10.2 格式驗證
- OpenAI API Key：以 `sk-` 或 `sk-proj-` 開頭
- Anthropic API Key：以 `sk-ant-` 開頭
- Google API Key：符合 Google API Key 格式

### 10.3 連線測試
- 呼叫 AI API 發送簡單測試 prompt
- 超時時間：30 秒
- 成功：回傳 200 + 正常 response
- 失敗：顯示具體錯誤訊息

## 11. 錯誤處理

| 錯誤情境 | 處理方式 |
|---------|---------|
| API Key 格式錯誤 | 前端驗證，顯示錯誤提示 |
| API Key 無效 | 測試連線失敗，顯示錯誤訊息 |
| 網路錯誤 | 顯示「無法連線至 AI 服務」 |
| 額度不足 | 顯示「API 額度不足，請檢查帳戶」 |
| Supabase 儲存失敗 | 顯示「儲存失敗，請稍後再試」 |

## 12. 測試案例

| ID | 測試場景 | 操作步驟 | 預期結果 |
|----|---------|---------|---------|
| TC-01 | 正常設定 | 選擇供應商 → 選擇模型 → 輸入有效 API Key → 儲存 | 設定成功，顯示確認訊息 |
| TC-02 | API Key 格式錯誤 | 輸入無效格式的 API Key → 儲存 | 前端驗證失敗，提示格式錯誤 |
| TC-03 | 測試連線成功 | 輸入有效 API Key → 點擊測試連線 | 顯示「✅ 連線成功」 |
| TC-04 | 測試連線失敗 | 輸入無效 API Key → 點擊測試連線 | 顯示「❌ 連線失敗：{錯誤}」 |
| TC-05 | 查看當前設定 | 進入 AI 設定頁面 | 正確顯示當前供應商、模型、狀態 |
| TC-06 | 切換供應商 | 從 OpenAI 切換至 Anthropic | 模型下拉選單動態更新 |

## 13. 待確認事項

- [ ] API Key 是否需要支援多組（例如：不同功能用不同 Key）？
- [ ] 是否需要記錄 AI 使用歷史（Token 用量、成本）？
- [ ] 測試連線的 Prompt 內容為何？
- [ ] 是否需要支援自訂 API Endpoint（私有部署）？