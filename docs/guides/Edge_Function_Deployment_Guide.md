# 🚀 Edge Function 部署指南

> **重要**：修改 Edge Function 程式碼後，必須重新部署才會生效！

---

## 📋 目前狀態

✅ **程式碼已修正**：`/supabase/functions/server/index.tsx` 已更新為使用 `max_completion_tokens`

⚠️ **需要部署**：修改尚未部署至 Supabase，目前運行的仍是舊版本

---

## 🔧 部署方法

### 方法 1：使用 Supabase CLI（推薦）

#### 1. 安裝 Supabase CLI

```bash
# macOS / Linux
brew install supabase/tap/supabase

# Windows (使用 Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# 或使用 npm
npm install -g supabase
```

#### 2. 登入 Supabase

```bash
supabase login
```

系統會開啟瀏覽器，請登入您的 Supabase 帳號。

#### 3. 連結專案

```bash
supabase link --project-ref YOUR_PROJECT_ID
```

**如何取得 PROJECT_ID**：
- 從 Supabase URL 取得：`https://YOUR_PROJECT_ID.supabase.co`
- 或前往 Supabase Dashboard → Settings → General → Reference ID

#### 4. 部署 Edge Function

```bash
supabase functions deploy make-server-4df51a95
```

#### 5. 驗證部署

```bash
# 檢查部署狀態
supabase functions list

# 測試 Edge Function
curl -X POST "https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-4df51a95/health" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

---

### 方法 2：使用 Supabase Dashboard（手動上傳）

#### 1. 前往 Supabase Dashboard

開啟：https://supabase.com/dashboard

#### 2. 選擇專案

點選您的專案。

#### 3. 前往 Edge Functions

左側選單 → **Edge Functions**

#### 4. 找到或建立 Function

- 如果已存在 `make-server-4df51a95`，點擊進入
- 如果不存在，點擊「New Function」建立

#### 5. 更新程式碼

1. 點擊「Edit Function」
2. 將 `/supabase/functions/server/index.tsx` 的完整內容複製貼上
3. 點擊「Deploy」

#### 6. 驗證部署

前往「Logs」標籤，檢查是否有部署成功的訊息。

---

### 方法 3：使用 GitHub Actions（自動化）

如果您的專案使用 Git，可以設定自動部署：

#### 1. 建立 GitHub Action 工作流程

**檔案**：`.github/workflows/deploy-functions.yml`

```yaml
name: Deploy Edge Functions

on:
  push:
    branches:
      - main
    paths:
      - 'supabase/functions/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      
      - name: Deploy to Supabase
        run: supabase functions deploy make-server-4df51a95
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}
```

#### 2. 設定 GitHub Secrets

前往 GitHub Repository → Settings → Secrets and variables → Actions

新增：
- `SUPABASE_ACCESS_TOKEN`：從 Supabase Dashboard → Settings → API → Personal Access Tokens 建立
- `SUPABASE_PROJECT_ID`：您的專案 ID

#### 3. 推送程式碼

```bash
git add .
git commit -m "Fix: Update OpenAI API to use max_completion_tokens"
git push origin main
```

GitHub Actions 會自動部署 Edge Function。

---

## 🧪 部署後測試

### 1. 檢查 Edge Function 日誌

**Supabase Dashboard** → **Edge Functions** → `make-server-4df51a95` → **Logs**

應該會看到最新的部署記錄。

### 2. 測試 AI 設定頁面

1. 前往「設定 → 系統管理 → AI 設定」
2. 選擇 **OpenAI** 供應商
3. 選擇 **GPT-4** 或 **GPT-4o** 模型
4. 輸入有效的 API Key
5. 點擊「測試連線」

### 3. 預期結果

✅ **成功訊息**：
```
✅ 成功連線至 openai gpt-4
```

❌ **如果還是失敗**：
- 檢查是否真的已部署（查看 Edge Function Logs）
- 檢查 API Key 是否有效（第一個錯誤是 API Key 無效）
- 清除瀏覽器快取並重新整理

---

## ⚠️ 關於 API Key 錯誤

您的錯誤訊息中顯示兩個問題：

### 問題 1：API Key 無效

```
"Incorrect API key provided: sk-proj-...414A"
```

**這不是程式碼問題**，而是您輸入的 OpenAI API Key 有問題。

**解決方法**：

1. 前往 [OpenAI Platform](https://platform.openai.com/api-keys)
2. 檢查 API Key 是否：
   - ✅ 仍然有效（未被撤銷或過期）
   - ✅ 有足夠的額度（Credits）
   - ✅ 複製時沒有多餘的空格或字元
3. 如果有問題，建立新的 API Key
4. 在 AI 設定頁面重新輸入新的 API Key

### 問題 2：參數錯誤

```
"Unsupported parameter: 'max_tokens'"
```

**這是程式碼問題**，表示 Edge Function 還在使用舊版本。

**解決方法**：
- 重新部署 Edge Function（見上方部署方法）

---

## 📊 部署檢查清單

部署前：
- [ ] 確認 `/supabase/functions/server/index.tsx` 已修改
- [ ] 確認使用 `max_completion_tokens`（第 52 行）
- [ ] 確認 Anthropic 部分仍使用 `max_tokens`（第 80 行）

部署中：
- [ ] 執行部署指令（CLI 或 Dashboard）
- [ ] 等待部署完成（通常 10-30 秒）

部署後：
- [ ] 檢查 Edge Function Logs 確認部署成功
- [ ] 測試連線（AI 設定頁面）
- [ ] 確認不再出現「Unsupported parameter」錯誤
- [ ] 測試實際 AI 對話功能

---

## 🆘 常見問題

### Q1: 部署後還是出現舊錯誤？

**A**: 清除瀏覽器快取，或使用無痕模式重新測試。

### Q2: CLI 部署時出現權限錯誤？

**A**: 確認已執行 `supabase login` 並成功登入。

### Q3: Dashboard 找不到 Edge Functions 選項？

**A**: 您的 Supabase 專案可能未啟用 Edge Functions，請聯繫 Supabase 支援。

### Q4: 部署成功但 Function 沒有運行？

**A**: 檢查 Edge Function Logs，可能有語法錯誤或執行時錯誤。

### Q5: API Key 確定正確但還是失敗？

**A**: 
1. 檢查 OpenAI 帳戶餘額
2. 確認 API Key 所屬組織有權限
3. 嘗試在 OpenAI Playground 測試同一個 API Key

---

## 📚 相關資源

- [Supabase Edge Functions 文件](https://supabase.com/docs/guides/functions)
- [Supabase CLI 安裝指南](https://supabase.com/docs/guides/cli)
- [OpenAI API Keys 管理](https://platform.openai.com/api-keys)
- [OpenAI API 文件](https://platform.openai.com/docs/api-reference)

---

**文件版本**：v1.0  
**最後更新**：2024-12-23  
**更新者**：AI Assistant

---

## 🎯 快速指令參考

```bash
# 登入 Supabase
supabase login

# 連結專案
supabase link --project-ref YOUR_PROJECT_ID

# 部署特定 Function
supabase functions deploy make-server-4df51a95

# 查看所有 Functions
supabase functions list

# 查看 Function 日誌
supabase functions logs make-server-4df51a95

# 測試 Function
curl -X POST "https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-4df51a95/health" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```
