⚠️ **DEPRECATED**：本文件已被新版 docs/plan/* 取代，請勿作為開發依據。

---

# Module 06：System & Project Settings (系統與專案設定)

## 1. 模組目標
管理系統運作所需的基礎配置，包含 AI 模型金鑰、專案偏好設定以及資料庫連線測試。確保系統在「本地」與「雲端」模式下皆能正確運作。

## 2. 功能需求 (Requirements)

### 2.1 全域系統設定 (System Config)
- **AI 配置**：輸入 OpenAI / Gemini API Key (支援遮罩儲存)。
- **模型選擇**：設定對話 (Chat) 與向量 (Embedding) 模型。
- **連線測試**：測試 API Key 有效性與儲存端連線狀態。

### 2.2 專案偏好設定 (Project Config)
- **個人化通知**：設定晨間 Brief 開啟狀態。
- **資料保護**：設定 Artifacts 預設是否開啟敏感資訊遮罩。
- **隔離設定**：檢視專案 Schema 與隔離金鑰 (Isolation Key)。

### 2.3 成員管理 (基礎)
- 檢視當前專案成員列表。
- 管理成員角色 (PM, Designer, Engineer, Client)。

## 3. 技術實作規劃

### 3.1 儲存邏輯
- 系統設定儲存於 `localStorage` 的特定 Key。
- 在雲端模式下，API Key 不存於客戶端資料庫，僅透過 UI 暫時傳遞或由伺服器端環境變數管理 (遵循 Guidelines 禁制事項)。

### 3.2 關鍵元件
- `SettingsPage.tsx`: 分頁式設定介面。
- `ApiKeyInput.tsx`: 具備顯示/隱藏與遮罩邏輯的輸入框。
- `ConnectionStatus.tsx`: 顯示目前系統連線模式 (Local / Supabase)。

## 4. 驗收標準
1. 設定 API Key 後，系統能正確模擬 AI 建議產生。
2. 切換專案偏好後，對應的功能 (如遮罩) 立即生效。
3. 嚴格遵守禁止使用 `import.meta.env` 的規則。
