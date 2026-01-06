# AI 設定安全性說明

## ⚠️ 重要安全提示

### 目前狀態：API Key 儲存機制

#### ✅ 已實作的安全措施

1. **Row Level Security (RLS) 權限控制**
   - 僅允許 `authenticated` 使用者存取
   - 未登入使用者無法讀取或修改 API Key
   - 參考：`/docs/sql/ai_settings_schema.sql` (第 75-107 行)

2. **Schema 隔離**
   - API Key 儲存於獨立的 `aiproject.system_ai_config` 表
   - 與專案資料分離，降低意外洩漏風險

3. **HTTPS 傳輸加密**
   - Supabase 預設使用 HTTPS 連線
   - 資料在網路傳輸過程中已加密

4. **Local Phase 禁止儲存**
   - 根據 `/guidelines/Guidelines.md` 禁止事項 1
   - Local Phase 不允許儲存 API Key，避免瀏覽器 localStorage 外洩風險

---

## ⚡ 目前的風險與限制

### 🔴 目前 API Key 以「明文」儲存於資料庫

**風險**：
- 若資料庫被入侵，API Key 可能被直接讀取
- Supabase Dashboard 的管理員可以看到明文 API Key
- SQL 查詢 log 可能記錄到明文 API Key

**影響範圍**：
- ✅ **一般使用者**：透過應用程式介面無法直接看到明文 API Key（遮罩顯示）
- ❌ **資料庫管理員**：可透過 SQL Editor 直接查詢到明文
- ❌ **駭客攻擊**：若 RLS 政策被繞過或資料庫被入侵，可取得明文 API Key

---

## 🔒 建議升級：使用 Supabase Vault 加密

### 方案 A：使用 Supabase Vault（推薦）

Supabase Vault 提供資料庫層級的欄位加密，基於 `pgsodium` 擴充功能。

#### 優點
- ✅ 資料庫層級加密，即使管理員也無法直接看到明文
- ✅ 加密金鑰由 Supabase 管理，自動輪替
- ✅ 與現有架構相容，只需修改 Schema

#### 實作步驟

**1. 啟用 Supabase Vault（需在 Supabase Dashboard 執行）**

```sql
-- 啟用 pgsodium 擴充
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- 建立加密金鑰
INSERT INTO vault.secrets (name, secret)
VALUES ('api_key_encryption_key', encode(gen_random_bytes(32), 'base64'));
```

**2. 修改表結構，使用加密欄位**

```sql
-- 備份現有資料
CREATE TABLE aiproject.system_ai_config_backup AS 
SELECT * FROM aiproject.system_ai_config;

-- 新增加密欄位
ALTER TABLE aiproject.system_ai_config 
ADD COLUMN api_key_encrypted BYTEA;

-- 將現有明文 API Key 加密並遷移
UPDATE aiproject.system_ai_config
SET api_key_encrypted = pgsodium.crypto_secretbox_noncegen(
    api_key::bytea,
    (SELECT decrypted_secret FROM vault.decrypted_secrets 
     WHERE name = 'api_key_encryption_key')::bytea
);

-- 刪除明文欄位（⚠️ 請先確認加密欄位正常運作）
ALTER TABLE aiproject.system_ai_config 
DROP COLUMN api_key;

-- 重新命名加密欄位為 api_key
ALTER TABLE aiproject.system_ai_config 
RENAME COLUMN api_key_encrypted TO api_key;
```

**3. 建立解密函數（僅供後端使用）**

```sql
CREATE OR REPLACE FUNCTION aiproject.decrypt_api_key(encrypted_key BYTEA)
RETURNS TEXT AS $$
BEGIN
    RETURN convert_from(
        pgsodium.crypto_secretbox_open(
            encrypted_key,
            (SELECT decrypted_secret FROM vault.decrypted_secrets 
             WHERE name = 'api_key_encryption_key')::bytea
        ),
        'UTF8'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**4. 修改應用程式碼（需要時）**

在 `/src/lib/storage/SupabaseAdapter.ts` 中，讀取 API Key 時需呼叫解密函數（若使用 Edge Function）。

---

### 方案 B：使用環境變數（次佳方案）

**適用情境**：僅系統管理員使用 AI 功能

#### 實作步驟

1. 將 API Key 儲存於 Supabase Edge Function 的環境變數中
2. 前端不直接儲存 API Key，改由後端透過 Edge Function 呼叫 AI API
3. 使用者無需輸入 API Key，降低外洩風險

#### 限制
- ❌ 無法支援多使用者各自使用自己的 API Key
- ❌ 需要額外開發 Edge Function

---

## 📋 安全性檢查清單

在正式上線前，請確認以下事項：

- [ ] 已啟用 RLS 政策（`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`）
- [ ] 已限制 API Key 欄位的存取權限（僅 authenticated 使用者）
- [ ] 已使用 Supabase Vault 加密 API Key（或明確接受明文儲存的風險）
- [ ] 已在應用程式中遮罩顯示 API Key（僅顯示前3+後3字元）
- [ ] 已告知使用者「請勿在公開環境分享專案」
- [ ] 已在 UI 顯示安全提示（參考 `/src/app/settings/AISettingsPage.tsx`）

---

## 🔄 未來改進建議

### 短期（1-2 週）
- [ ] 實作 Supabase Vault 加密（參考方案 A）
- [ ] 新增「重新產生 API Key」功能提示
- [ ] 記錄 API Key 存取日誌（Audit Log）

### 中期（1 個月）
- [ ] 支援「專案層級 API Key」（每個專案可設定獨立金鑰）
- [ ] 新增 API Key 到期時間與自動輪替機制
- [ ] 整合 Supabase Auth 的 User Metadata 儲存個人 API Key

### 長期（3 個月）
- [ ] 支援企業版：使用自建 AI Gateway 代理請求
- [ ] 實作 API 使用量監控與限額管理
- [ ] 支援 OAuth 登入，避免直接儲存 API Key

---

## 🆘 萬一 API Key 外洩怎麼辦？

**立即行動**：

1. 前往 AI 供應商官網（OpenAI / Anthropic / Google）的 API Key 管理頁面
2. 撤銷（Revoke）外洩的 API Key
3. 產生新的 API Key
4. 在本系統更新新的 API Key
5. 檢查 API 使用記錄，確認是否有異常呼叫

**預防措施**：

- 定期輪替 API Key（建議每 30 天）
- 啟用 API 供應商的使用量警報
- 設定每月支出上限

---

## 📚 參考資料

- [Supabase Vault 官方文件](https://supabase.com/docs/guides/database/vault)
- [PostgreSQL pgsodium 擴充](https://github.com/michelp/pgsodium)
- [Row Level Security (RLS) 最佳實踐](https://supabase.com/docs/guides/auth/row-level-security)
- [OpenAI API Key 安全指南](https://platform.openai.com/docs/guides/safety-best-practices)

---

**最後更新**：2024-12-23  
**負責人**：系統架構師  
**版本**：v1.0
