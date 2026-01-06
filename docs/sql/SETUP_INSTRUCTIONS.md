# Supabase Schema 設定指南

## 📋 目標
在 Supabase 中正確建立 `AIproject` Schema 並執行建表 SQL。

---

## 🚨 重要提醒

**🔴 PostgreSQL 大小寫規則**：
```
PostgreSQL 會將未加引號的識別符轉為小寫！
CREATE SCHEMA AIproject;  → 實際建立的是 aiproject（全小寫）
```

**你目前看到的錯誤訊息**：
```
Schema "AIproject" 不存在。可用的 Schema：public, graphql_public, myschema1
```

**這表示**：
1. ✅ Supabase 連線本身是成功的（URL 和 Key 正確）
2. ❌ `aiproject` schema **並沒有真的在資料庫中建立成功**
3. 📋 你的 Supabase 目前只有這些 schema：`public`, `graphql_public`, `myschema1`

**解決方案**：按照下方步驟執行完整的 SQL 檔案（已更新為全小寫 `aiproject`，符合 PostgreSQL 慣例）

---

## 🔧 完整設定步驟（請按順序執行）

### 步驟 1：前往 Supabase SQL Editor
1. 登入 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇你的專案
3. 點擊左側選單的 **SQL Editor**
4. 點擊右上角的 **New Query** 建立新查詢

---

### 步驟 2：執行完整的建表 SQL

1. **開啟檔案**：`/docs/sql/ai_settings_schema.sql`（已更新，包含建立 Schema）
2. **複製完整內容**：Ctrl+A 全選，然後 Ctrl+C 複製
3. **貼到 SQL Editor**：在 Supabase 的查詢編輯器中貼上
4. **執行 SQL**：點擊右下角的 **Run** 按鈕（或按 Ctrl+Enter）

---

### 步驟 3：檢查執行結果

**成功的訊息應該包含**：
```
NOTICE: ✅ Schema "aiproject" 已成功建立或已存在
```

**如果看到錯誤**：
- 檢查是否有權限建立 Schema
- 確認沒有語法錯誤
- 複製完整錯誤訊息（我會幫你診斷）

---

### 步驟 4：驗證 Schema 和表格已建立

在 SQL Editor 中執行以下驗證 SQL：

```sql
-- 驗證 1：確認 Schema 存在
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name = 'aiproject';

-- 驗證 2：確認表格存在
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'aiproject' 
AND table_name = 'system_ai_config';

-- 驗證 3：查看表格結構
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'aiproject' 
AND table_name = 'system_ai_config'
ORDER BY ordinal_position;
```

**預期結果**：
- 驗證 1 應顯示：`aiproject`
- 驗證 2 應顯示：`system_ai_config`
- 驗證 3 應顯示：完整的欄位清單（id, provider, model, api_key, 等 10 個欄位）

---

### 步驟 5：在應用程式中測試連線

完成上述步驟後：

1. **回到應用程式**：前往「設定 → 系統管理 → Supabase 連線」
2. **填寫連線��訊**：
   - **Supabase Project URL**：`https://你的專案ID.supabase.co`
   - **Anon / Public Key**：從 Supabase Dashboard → Settings → API → Project API keys → `anon public` 複製
   - **Schema Name**：`aiproject`（小寫）
3. **測試連線**：點擊「測試連線」按鈕
4. **儲存設定**：看到成功訊息後，點擊「儲存設定」

---

## 🎯 成功指標

當你看到以下訊息時，表示設定成功：

```
✅ 已成功連線至 Supabase (Schema: aiproject)
```

---

## ❓ 常見問題

### Q1: 錯誤訊息「The schema must be one of the following: public, graphql_public」

**原因**：Schema 尚未建立或名稱不正確

**解決**：
1. 回到步驟 2，執行建立 Schema 的 SQL
2. 確認 Schema 名稱拼寫正確（區分大小寫）
3. 檢查是否有權限建立 Schema（需要 SUPERUSER 或 CREATEDB 權限）

---

### Q2: 錯誤訊息「relation "AIproject.system_ai_config" does not exist」

**原因**：表格尚未建立

**解決**：
1. 回到步驟 3，執行完整的建表 SQL
2. 確認 SQL 執行無誤（檢查錯誤訊息）
3. 使用步驟 4 的驗證 SQL 確認表格存在

---

### Q3: 測試連線成功，但無法讀取/寫入資料

**原因**：RLS 政策未正確設定

**解決**：
1. 使用步驟 5 的 SQL 檢查政策是否存在
2. 確認你使用的是 `anon` key（不是 `service_role` key）
3. 檢查 RLS 政策的條件是否正確

---

## 📚 相關文件

- [ai_settings_schema.sql](/docs/sql/ai_settings_schema.sql) - 建表 SQL
- [Supabase Schema 官方文件](https://supabase.com/docs/guides/database/schemas)
- [Supabase RLS 官方文件](https://supabase.com/docs/guides/auth/row-level-security)

---

## 🎯 成功指標

當你看到以下訊息時，表示設定成功：

```
✅ 已成功連線至 Supabase (Schema: aiproject)
```

現在你可以開始使用 AI 設定功能了！🎉