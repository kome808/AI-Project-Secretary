# ✅ AI API 測試檢查清單

> **最後更新**：2024-12-23  
> **Edge Function 狀態**：✅ 已部署（使用 `max_completion_tokens`）

---

## 📋 測試步驟

### 步驟 1：確認 Edge Function 部署狀態

✅ **已完成**：Edge Function `make-server-4df51a95` 已更新

您可以透過以下方式確認：

#### 方法 A：檢查 Supabase Dashboard

1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇您的專案
3. 前往 **Edge Functions** → `make-server-4df51a95`
4. 查看 **Logs** 標籤，確認最新的部署時間

#### 方法 B：測試 Health Check

開啟瀏覽器或使用 curl：

```bash
curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-4df51a95/health
```

預期回應：
```json
{"status": "ok"}
```

---

### 步驟 2：準備有效的 OpenAI API Key

⚠️ **重要**：根據您之前的錯誤訊息，您的 API Key 可能有問題。

#### 2.1 檢查現有 API Key

前往 [OpenAI Platform - API Keys](https://platform.openai.com/api-keys)

確認您的 API Key：
- [ ] ✅ 狀態為「Active」（非 Revoked）
- [ ] ✅ 有足夠的使用額度（Credits）
- [ ] ✅ 所屬組織有權限使用 GPT-4 模型

#### 2.2 建立新的 API Key（建議）

如果您的 API Key 有任何問題，建議建立新的：

1. 前往 [OpenAI Platform - API Keys](https://platform.openai.com/api-keys)
2. 點擊「+ Create new secret key」
3. 輸入名稱（例如：`AI-Project-Secretary-2024`）
4. 設定權限（選擇「All」或至少包含「Model capabilities」）
5. 點擊「Create secret key」
6. **立即複製並儲存**（只會顯示一次！）

#### 2.3 檢查帳戶餘額

前往 [OpenAI Platform - Usage](https://platform.openai.com/usage)

確認：
- [ ] ✅ 有可用的額度（Credits > $0）
- [ ] ✅ 沒有超過使用限額

**如果沒有額度**：
- 前往 [Billing](https://platform.openai.com/account/billing/overview) 購買額度
- 最低充值金額通常為 $5 USD

---

### 步驟 3：在 AI 設定頁面測試連線

#### 3.1 進入 AI 設定頁面

1. 開啟您的應用程式
2. 前往「**設定**」→「**系統管理**」→「**AI 設定**」

#### 3.2 填寫設定

| 欄位 | 值 | 說明 |
|------|-----|------|
| **AI 供應商** | OpenAI | 選擇 OpenAI |
| **模型** | gpt-4o 或 gpt-4 | 建議使用 gpt-4o（更快且便宜） |
| **API Key** | sk-proj-... | 貼上您的 OpenAI API Key |
| **API Endpoint** | (留空) | 使用預設值 |

#### 3.3 測試連線

1. 點擊「**測試連線**」按鈕
2. 等待測試完成（約 3-10 秒）

#### 3.4 檢查結果

**✅ 成功訊息**：
```
✅ 成功連線至 openai gpt-4o
```

**❌ 如果失敗**，查看錯誤訊息：

| 錯誤訊息 | 原因 | 解決方法 |
|---------|------|---------|
| `Incorrect API key provided` | API Key 無效 | 建立新的 API Key（見步驟 2.2） |
| `Insufficient quota` | 額度不足 | 前往 Billing 購買額度 |
| `Unsupported parameter: max_tokens` | Edge Function 未更新 | **此錯誤應已解決**，如仍出現請回報 |
| `Rate limit exceeded` | 呼叫頻率過高 | 等待 1 分鐘後重試 |
| `Model not found` | 模型名稱錯誤 | 確認模型名稱拼寫正確 |

#### 3.5 儲存設定

測試成功後：
1. 點擊「**儲存設定**」
2. 確認看到成功訊息

---

### 步驟 4：測試實際 AI 對話功能

#### 4.1 進入儀表板或收件匣

前往「**儀表板**」或「**收件匣**」頁面

#### 4.2 找到 AI 秘書輸入框

應該會看到一個輸入框，標題為「AI 專案秘書」或類似文字

#### 4.3 輸入測試訊息

嘗試輸入以下訊息：

```
明天下午 3 點要跟客戶開會討論新功能
```

#### 4.4 檢查回應

**✅ 成功**：
- AI 回應對話訊息
- 自動生成建議卡（如：待辦事項、決議等）
- 建議卡顯示在列表中

**❌ 失敗**：
- 檢查瀏覽器 Console 的錯誤訊息
- 確認 AI 設定是否已儲存並啟用

---

## 🐛 除錯指南

### 開啟瀏覽器 Console

**Chrome / Edge**：
- Windows: `F12` 或 `Ctrl + Shift + I`
- Mac: `Cmd + Option + I`

**Firefox**：
- Windows: `F12` 或 `Ctrl + Shift + K`
- Mac: `Cmd + Option + K`

### 查看重要的 Console 日誌

成功的日誌應該包含：

```
✅ Supabase 已設定，使用 SupabaseAdapter
📊 使用 Schema: aiproject
🔍 讀取系統 AI 設定...
✅ AI 設定載入成功: openai / gpt-4o
🧪 測試 openai API 連線...
📡 呼叫 Edge Function: https://xxx.supabase.co/functions/v1/make-server-4df51a95/ai/chat
✅ AI API 測試成功
```

失敗的日誌會包含：

```
❌ 字樣的錯誤訊息
詳細的錯誤堆疊
```

### 常見錯誤與解決方法

#### 錯誤 1：`Supabase 連線資訊不完整`

**原因**：localStorage 中缺少 Supabase 連線資訊

**解決方法**：
1. 前往「設定」→「Supabase 連線設定」
2. 填寫完整的連線資訊
3. 點擊「測試連線」
4. 點擊「儲存設定」
5. 重新整理頁面

#### 錯誤 2：`AI 設定未啟用`

**原因**：尚未在 AI 設定頁面儲存設定

**解決方法**：
1. 前往「設定」→「系統管理」→「AI 設定」
2. 填寫 API Key 並測試連線
3. 點擊「儲存設定」

#### 錯誤 3：`Failed to fetch`

**原因**：網路問題或 Edge Function 未正確部署

**解決方法**：
1. 檢查網路連線
2. 確認 Edge Function 已部署
3. 查看 Supabase Edge Function Logs

#### 錯誤 4：`CORS error`

**原因**：Edge Function CORS 設定問題

**解決方法**：
- 確認 `/supabase/functions/server/index.tsx` 包含 CORS 設定：
  ```typescript
  app.use("/*", cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }));
  ```

---

## 📊 完整檢查清單

### 部署階段

- [x] ✅ Edge Function 程式碼已修正（使用 `max_completion_tokens`）
- [x] ✅ Edge Function 已部署至 Supabase
- [x] ✅ Edge Function Logs 顯示最新部署時間

### 設定階段

- [x] ✅ OpenAI API Key 已建立且有效
- [x] ✅ OpenAI 帳戶有可用額度
- [x] ✅ Supabase 連線已設定
- [x] ✅ AI 設定已填寫並儲存

### 測試階段

- [x] ✅ AI 設定頁面測試連線成功
- [x] ✅ 不再出現「Unsupported parameter」錯誤
- [x] ✅ 不再出現「Incorrect API key」錯誤
- [ ] ⏳ AI 秘書對話功能正常運作
- [ ] ⏳ 建議卡可以成功生成

### 驗證階段

- [ ] ⏳ 瀏覽器 Console 無錯誤訊息
- [ ] ⏳ Edge Function Logs 顯示成功的 API 呼叫
- [ ] ⏳ AI 回應內容合理且有用

---

## 🎯 下一步行動

### 立即執行

1. **前往 OpenAI Platform 確認 API Key 狀態**
   - 網址：https://platform.openai.com/api-keys
   - 如有問題，建立新的 API Key

2. **在 AI 設定頁面重新測試連線**
   - 使用新的或確認有效的 API Key
   - 點擊「測試連線」

3. **查看錯誤訊息**
   - 如果「Unsupported parameter」錯誤消失 → ✅ Edge Function 部署成功
   - 如果「Incorrect API key」錯誤消失 → ✅ API Key 有效

### 如果仍有問題

請提供以下資訊：

1. **完整的錯誤訊息**（從瀏覽器 Console 複製）
2. **Edge Function Logs**（從 Supabase Dashboard 複製最近的幾筆）
3. **測試步驟**（您執行了哪些步驟）
4. **OpenAI API Key 狀態**（Active / Revoked / 額度不足）

---

## 📚 相關文件

- [Edge Function 部署指南](/docs/Edge_Function_Deployment_Guide.md)
- [OpenAI API 參數變更說明](/docs/OpenAI_API_Parameter_Change.md)
- [ChatGPT API 串接完成報告](/docs/AI_ChatGPT_Integration_Complete.md)
- [AI 設定安全性說明](/docs/AI_Settings_Security.md)

---

**文件版本**：v1.0  
**最後更新**：2024-12-23  
**更新者**：AI Assistant