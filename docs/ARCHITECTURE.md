# AI 專案助理架構文件 (Architecture & Refactoring Plan)

## 1. 專案摘要 (Project Summary)

本專案為「AI 對話式專案助理」的互動雛形，核心價值在於透過 AI 協助 PM 與團隊將碎片化的溝通（會議、對話、文件）轉化為結構化的專案追蹤項目。

### 1.1 核心概念
- **Human-in-the-loop**: AI 僅提供建議（Suggestion），必須經過人工確認（Inbox flow）才成為正式紀錄（Item）。
- **Single Source of Truth**: 所有的任務視圖（待辦、待回覆、決議、變更）皆源自同一份 Item 資料。
- **證據鏈 (Citation)**: 每個追蹤項目都必須能回溯至原始來源（Artifact）。

### 1.2 關鍵流程
1. **輸入與解析**: 上傳文件/貼上文字 -> AI 解析 -> 產生建議卡 (Inbox)。
2. **確認與入庫**: User 在 Inbox 確認/編輯建議 -> 轉為正式 Item -> 進入任務清單。
3. **任務管理**: 透過不同視圖 (Actions, Pending, Decisions, CR, WBS) 管理同一份 Item 數據。
4. **風險控管**: Dashboard 主動提示逾期、卡關、待回覆項目。

---

## 2. 目前程式碼結構 (Current Structure)

基於 Figma Make 匯出的 Vite + React 專案：
- **路徑**: `/AI專案助理 v0.11　/src`
- **主要頁面**: Dashboard, Inbox, Tasks, Sources, Settings.
- **技術現狀**: React 18, Tailwind CSS 4, Radix UI, Supabase Client (Mock/Prototype usage).
- **待優化點**: 元件過於巨大、狀態管理分散、缺乏型別安全性、缺乏統一的資料存取層。

---

## 3. 重構計畫 (Refactoring Plan)

### 3.1 建議技術棧 (Proposed Tech Stack)
為了在不改變 UX 的前提下提升程式碼品質與可維護性，建議採用以下技術組合：

- **核心框架**: **Vite + React 18 + TypeScript**
  - 維持現有 Build 工具，專注於程式碼結構重構。
- **狀態管理**: **Zustand**
  - 用於 Global UI State (如 Sidebar 狀態、當前專案 Context、Toast 通知)。
  - 取代原本分散的 Context API，減少 Re-render。
- **伺服器狀態/資料獲取**: **TanStack Query (React Query)**
  - 用於管理 API 資料 (Items, Artifacts)，處理 Caching, Loading, Error states。
- **路由**: **React Router v7** (維持或升級)
- **樣式**: **Tailwind CSS 4** + **Radix UI** (Shadcn-like pattern)
  - 延續現有設計，但標準化 Token 使用。
- **資料驗證**: **Zod**
  - 用於驗證 API 回傳資料與 Form 輸入，確保型別安全。

### 3.2 建議目錄結構 (Proposed Directory Structure)
採用 **Feature-based** 架構，將功能相關的 Component, Hook, Store 聚合在一起。

```
src/
├── app/                    # 路由頁面入口 (Pages)
│   ├── dashboard/
│   ├── inbox/
│   ├── tasks/
│   └── ...
├── components/             # 共用元件 (Shared UI)
│   ├── ui/                 # 原子元件 (Button, Input, Card...)
│   └── layout/             # 佈局元件 (Sidebar, Header...)
├── features/               # 業務功能模組 (由此處進行邏輯拆分)
│   ├── inbox/              # Inbox 相關邏輯
│   │   ├── components/
│   │   ├── hooks/          # useInboxItems, useConfirmSuggestion
│   │   └── types.ts
│   ├── tasks/              # Task Management 相關邏輯
│   │   ├── components/     # TaskCard, TaskDetailDrawer...
│   │   └── ...
│   ├── ai/                 # AI 整合服務
│   └── project/            # 專案 Context 相關
├── lib/                    # 核心工具與設定
│   ├── api/                # API Client 與 Endpoints 抽象層
│   ├── supabase/           # Supabase Client 設定
│   └── utils/              # 通用工具函式
├── stores/                 # 全域狀態 (Zustand)
└── types/                  # 全域型別定義
```

### 3.3 重構步驟 (Phases)

1. **基礎建設 (Infrastructure)**:
   - 設定 TypeScript 環境與路徑別名 (@/*)。
   - 建立 API 抽象層 (Mock Service 介面，預留對接真實 Supabase 的能力)。
   - 設定 React Query Client 與 Zustand Store。

2. **模組化重構 (Modularization)**:
   - **Shared UI**: 將 `/src/components/ui` 整理為標準原子元件。
   - **Feature Migration**: 依序重構 Dashboard -> Inbox -> Tasks -> Sources -> Settings。
   - 每個模組重構時，將邏輯從 Page Component 抽離至 Custom Hooks。

3. **資料層整合 (Data Layer)**:
   - 用 React Query 取代 useEffect fetch。
   - 實作「樂觀更新 (Optimistic UI)」提升操作流暢度。

---

## 4. 畫面與模組清單 (Screens & Modules)

請參考 `handoff-for-antigravity.md` 的 3.1 章節，重點保留：

1. **Dashboard**: 專案摘要卡、風險提示列表。
2. **Inbox**: 建議卡列表 (Suggestion Cards)、預覽抽屜 (Artifact Drawer)。
3. **Tasks**:
   - 視圖 Tabs: Actions, Pending, Decisions, CR, Project Work.
   - WBS 樹狀結構與拖曳排序。
   - 任務詳情抽屜 (Detail Drawer)。
4. **Sources**: 文件列表、上傳 Dialog、文件詳情 (含 Citation 標記)。
5. **Settings**: 專案設定與 AI 系統設定。
6. **AI Chat**: 全域浮動對話視窗。

---

## 5. 已知限制與注意事項

- **UX 保留**: 嚴格遵守現有 Figma Make 的操作流程。
- **敏感資料**: API Keys 僅在開發環境透過 `.env` 或 Mock 處理，不在前端寫死。
- **Supabase**: 目前階段若無後端環境，將使用 `src/lib/api/mock` 進行模擬，但結構需與 Supabase Table Schema 一致。
