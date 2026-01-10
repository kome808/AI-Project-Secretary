-- ============================================
-- 移除所有舊的寬鬆 RLS 政策
-- ============================================
-- 執行日期：2026-01-10
-- ⚠️ 這會移除 "Allow all" 類型的政策
-- ============================================

-- Projects 表
DROP POLICY IF EXISTS "Allow all for anon" ON aiproject.projects;
DROP POLICY IF EXISTS "Allow all for authenticated" ON aiproject.projects;

-- Members 表  
DROP POLICY IF EXISTS "Allow all for anon" ON aiproject.members;
DROP POLICY IF EXISTS "Allow all for authenticated" ON aiproject.members;

-- Artifacts 表
DROP POLICY IF EXISTS "Allow all for anon" ON aiproject.artifacts;
DROP POLICY IF EXISTS "Allow all for authenticated" ON aiproject.artifacts;

-- Items 表
DROP POLICY IF EXISTS "Allow all for anon" ON aiproject.items;
DROP POLICY IF EXISTS "Allow all for authenticated" ON aiproject.items;

-- Tasks 表（如果存在）
DROP POLICY IF EXISTS "Allow anon access" ON aiproject.tasks;
DROP POLICY IF EXISTS "Allow auth access" ON aiproject.tasks;

-- System AI Config 表 - 移除所有舊政策
DROP POLICY IF EXISTS "Allow all for anon" ON aiproject.system_ai_config;
DROP POLICY IF EXISTS "Allow all for authenticated" ON aiproject.system_ai_config;
DROP POLICY IF EXISTS "Allow anon users to read system_ai_config" ON aiproject.system_ai_config;
DROP POLICY IF EXISTS "Allow anon users to insert system_ai_config" ON aiproject.system_ai_config;
DROP POLICY IF EXISTS "Allow anon users to update system_ai_config" ON aiproject.system_ai_config;
DROP POLICY IF EXISTS "Allow anon users to delete system_ai_config" ON aiproject.system_ai_config;
DROP POLICY IF EXISTS "Allow authenticated users to read system_ai_config" ON aiproject.system_ai_config;
DROP POLICY IF EXISTS "Allow authenticated users to insert system_ai_config" ON aiproject.system_ai_config;
DROP POLICY IF EXISTS "Allow authenticated users to update system_ai_config" ON aiproject.system_ai_config;
DROP POLICY IF EXISTS "Allow authenticated users to delete system_ai_config" ON aiproject.system_ai_config;

-- System Prompts 表 - 移除 public 政策
DROP POLICY IF EXISTS "Allow public to read system_prompts" ON aiproject.system_prompts;
DROP POLICY IF EXISTS "Allow public to insert system_prompts" ON aiproject.system_prompts;
DROP POLICY IF EXISTS "Allow public to update system_prompts" ON aiproject.system_prompts;
DROP POLICY IF EXISTS "Allow public to delete system_prompts" ON aiproject.system_prompts;

-- ============================================
-- 驗證
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ 舊政策已移除！';
    RAISE NOTICE '請重新執行查詢確認只剩下安全政策';
END $$;

-- 檢查剩餘政策
SELECT tablename, policyname, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'aiproject'
ORDER BY tablename, policyname;
