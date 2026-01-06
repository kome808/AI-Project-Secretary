# Supabase 資料表建立指南

## 🔴 錯誤說明

如果您看到以下錯誤：

```
PGRST204: Could not find the table aiproject.items in the schema cache
```

或

```
AI processing error: Error: Method not implemented.
```

這代表 Supabase 資料庫中的資料表結構尚未建立，或者 Schema 名稱設定不正確。

---

## ✅ 解決方案

### 步驟 1：確認 Schema 名稱

1. 登入 Supabase Dashboard
2. 前往「設定」頁面（在左側導航欄）
3. 確認您在「Schema 名稱」欄位中設定的值（例如：`aiproject`）
4. **重要**：記下這個 Schema 名稱，後續步驟會用到

### 步驟 2：執行建表 SQL

1. 在 Supabase Dashboard 左側導航欄，點擊「SQL Editor」
2. 點擊「New Query」建立新的查詢
3. 複製以下完整的 SQL 腳本並貼上
4. 點擊「Run」執行

---

## 📋 完整 SQL 腳本

> **注意**：如果您的 Schema 名稱不是 `aiproject`，請使用「尋找與取代」功能，將以下所有 `aiproject` 替換為您的 Schema 名稱。

```sql
-- ============================================
-- AI 專案秘書系統 - 資料表建立腳本
-- ============================================
-- Schema 名稱：aiproject（請依實際情況修改）
-- ============================================

-- ============================================
-- 步驟 1: 建立 Schema（如果不存在）
-- ============================================

CREATE SCHEMA IF NOT EXISTS aiproject;

-- ============================================
-- 步驟 2: 建立資料表
-- ============================================

-- 1. Projects 表（專案）
CREATE TABLE IF NOT EXISTS aiproject.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'pending_deletion')),
    pm_id TEXT,
    deleted_at TIMESTAMPTZ,
    purge_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Members 表（成員）
CREATE TABLE IF NOT EXISTS aiproject.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES aiproject.projects(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('pm', 'developer', 'designer', 'viewer')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Artifacts 表（文件/證據）
CREATE TABLE IF NOT EXISTS aiproject.artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES aiproject.projects(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL,
    original_content TEXT NOT NULL,
    masked_content TEXT,
    storage_path TEXT,
    file_url TEXT,
    file_size BIGINT,
    file_hash TEXT,
    archived BOOLEAN DEFAULT FALSE,
    meta JSONB,
    source_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Items 表（任務/需求項目）
CREATE TABLE IF NOT EXISTS aiproject.items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES aiproject.projects(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('action', 'pending', 'cr', 'decision', 'rule', 'general')),
    status TEXT NOT NULL DEFAULT 'suggestion' CHECK (status IN (
        'suggestion', 'rejected',
        'open', 'not_started', 'in_progress', 'blocked', 'pending', 'awaiting_response', 
        'done', 'completed', 'archived',
        'requested', 'approved', 'active'
    )),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    source_artifact_id UUID REFERENCES aiproject.artifacts(id) ON DELETE SET NULL,
    assignee_id TEXT,
    work_package_id UUID,
    parent_id UUID REFERENCES aiproject.items(id) ON DELETE SET NULL,
    due_date TIMESTAMPTZ,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    notes TEXT,
    notes_updated_at TIMESTAMPTZ,
    notes_updated_by TEXT,
    meta JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. System AI Config 表（AI 系統設定）
CREATE TABLE IF NOT EXISTS aiproject.system_ai_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'gemini', 'custom')),
    model TEXT NOT NULL,
    api_key TEXT,
    api_endpoint TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    test_status TEXT CHECK (test_status IN ('success', 'failed', 'pending')),
    last_tested_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 步驟 3: 建立索引（提升查詢效能）
-- ============================================

-- Projects 索引
CREATE INDEX IF NOT EXISTS idx_projects_status ON aiproject.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON aiproject.projects(created_at DESC);

-- Members 索引
CREATE INDEX IF NOT EXISTS idx_members_project_id ON aiproject.members(project_id);
CREATE INDEX IF NOT EXISTS idx_members_email ON aiproject.members(email);

-- Artifacts 索引
CREATE INDEX IF NOT EXISTS idx_artifacts_project_id ON aiproject.artifacts(project_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_created_at ON aiproject.artifacts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_artifacts_archived ON aiproject.artifacts(archived);

-- Items 索引
CREATE INDEX IF NOT EXISTS idx_items_project_id ON aiproject.items(project_id);
CREATE INDEX IF NOT EXISTS idx_items_type ON aiproject.items(type);
CREATE INDEX IF NOT EXISTS idx_items_status ON aiproject.items(status);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON aiproject.items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_source_artifact_id ON aiproject.items(source_artifact_id);

-- ============================================
-- 步驟 4: 建立觸發器（自動更新 updated_at）
-- ============================================

-- 先刪除舊的觸發器（如果存在）
DROP TRIGGER IF EXISTS trigger_update_projects_updated_at ON aiproject.projects;
DROP TRIGGER IF EXISTS trigger_update_items_updated_at ON aiproject.items;

-- Projects 觸發器函數
CREATE OR REPLACE FUNCTION aiproject.update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 建立 Projects 觸發器
CREATE TRIGGER trigger_update_projects_updated_at
    BEFORE UPDATE ON aiproject.projects
    FOR EACH ROW
    EXECUTE FUNCTION aiproject.update_projects_updated_at();

-- Items 觸發器函數
CREATE OR REPLACE FUNCTION aiproject.update_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 建立 Items 觸發器
CREATE TRIGGER trigger_update_items_updated_at
    BEFORE UPDATE ON aiproject.items
    FOR EACH ROW
    EXECUTE FUNCTION aiproject.update_items_updated_at();

-- ============================================
-- 步驟 5: 設定 RLS（Row Level Security）
-- ============================================

ALTER TABLE aiproject.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE aiproject.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE aiproject.artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE aiproject.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE aiproject.system_ai_config ENABLE ROW LEVEL SECURITY;

-- 先刪除舊的政策（如果存在）
DROP POLICY IF EXISTS "Allow all for anon" ON aiproject.projects;
DROP POLICY IF EXISTS "Allow all for authenticated" ON aiproject.projects;
DROP POLICY IF EXISTS "Allow all for anon" ON aiproject.members;
DROP POLICY IF EXISTS "Allow all for authenticated" ON aiproject.members;
DROP POLICY IF EXISTS "Allow all for anon" ON aiproject.artifacts;
DROP POLICY IF EXISTS "Allow all for authenticated" ON aiproject.artifacts;
DROP POLICY IF EXISTS "Allow all for anon" ON aiproject.items;
DROP POLICY IF EXISTS "Allow all for authenticated" ON aiproject.items;
DROP POLICY IF EXISTS "Allow all for anon" ON aiproject.system_ai_config;
DROP POLICY IF EXISTS "Allow all for authenticated" ON aiproject.system_ai_config;

-- 允許匿名和已認證使用者完全存取（開發階段）
-- 🚨 生產環境請根據實際需求調整權限政策

CREATE POLICY "Allow all for anon" ON aiproject.projects
    FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated" ON aiproject.projects
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon" ON aiproject.members
    FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated" ON aiproject.members
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon" ON aiproject.artifacts
    FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated" ON aiproject.artifacts
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon" ON aiproject.items
    FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated" ON aiproject.items
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon" ON aiproject.system_ai_config
    FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated" ON aiproject.system_ai_config
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- 步驟 6: 授予權限
-- ============================================

GRANT ALL ON aiproject.projects TO anon, authenticated;
GRANT ALL ON aiproject.members TO anon, authenticated;
GRANT ALL ON aiproject.artifacts TO anon, authenticated;
GRANT ALL ON aiproject.items TO anon, authenticated;
GRANT ALL ON aiproject.system_ai_config TO anon, authenticated;

-- ============================================
-- 步驟 7: 強制刷新 Schema Cache
-- ============================================

NOTIFY pgrst, 'reload schema';

-- ============================================
-- 完成！
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ 資料表建立完成！';
    RAISE NOTICE '========================================';
    RAISE NOTICE '已建立的資料表：';
    RAISE NOTICE '  • aiproject.projects';
    RAISE NOTICE '  • aiproject.members';
    RAISE NOTICE '  • aiproject.artifacts';
    RAISE NOTICE '  • aiproject.items';
    RAISE NOTICE '  • aiproject.system_ai_config';
    RAISE NOTICE '========================================';
END $$;
```

---

## 🔍 驗證安裝

執行完 SQL 後，請執行以下驗證步驟：

### 1. 檢查資料表是否建立成功

在 SQL Editor 中執行：

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'aiproject'
ORDER BY table_name;
```

您應該會看到：
- `artifacts`
- `items`
- `members`
- `projects`
- `system_ai_config`

### 2. 檢查 items 表結構

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'aiproject' 
  AND table_name = 'items'
ORDER BY ordinal_position;
```

確認包含以下關鍵欄位：
- `id` (uuid)
- `project_id` (uuid)
- `type` (text)
- `status` (text)
- `title` (text)
- `description` (text)
- `assignee_id` (text) ← **重要！**
- `meta` (jsonb)
- `created_at` (timestamp with time zone)
- `updated_at` (timestamp with time zone)

---

## 🎯 回到應用程式

1. 返回應用程式的「設定」頁面
2. 點擊「測試連線」按鈕
3. 確認顯示：**✅ 已成功連線至 Supabase**
4. 現在可以開始使用 AI 秘書功能了！

---

## ❓ 常見問題

### Q1: 執行 SQL 時出現 "trigger already exists" 錯誤
**A**: 這表示您之前已經執行過部分 SQL。請使用更新後的 SQL 腳本（已包含 `DROP TRIGGER IF EXISTS` 和 `DROP POLICY IF EXISTS`），它會自動清理舊的物件後重新建立。

### Q2: 執行 SQL 時出現 "schema must be one of..." 錯誤
**A**: 這表示您在應用程式設定中輸入的 Schema 名稱與 SQL 腳本中的不一致。請確保兩者使用相同的名稱（例如都使用 `aiproject`）。

### Q3: 如何修改 Schema 名稱？
**A**: 
1. 使用文字編輯器的「尋找與取代」功能
2. 將上方 SQL 中的所有 `aiproject` 替換為您想要的名稱
3. 在應用程式設定頁面也使用相同的名稱

### Q4: 執行後還是出現錯誤怎麼辦？
**A**: 
1. 確認 SQL 完全執行完畢（沒有紅色錯誤訊息）
2. 執行 `NOTIFY pgrst, 'reload schema';` 強制刷新快取
3. 重新整理應用程式頁面
4. 如果還是不行，請檢查瀏覽器 Console 的詳細錯誤訊息

---

## 📚 相關文件

- [Supabase 官方文件](https://supabase.com/docs)
- [PostgreSQL RLS 說明](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- 專案 Guidelines: `/guidelines/Guidelines.md`