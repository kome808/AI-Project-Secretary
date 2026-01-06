-- ============================================
-- 快速驗證 aiproject Schema 是否正確設定
-- ============================================

-- 1️⃣ 檢查所有可用的 Schema
SELECT '🔍 可用的 Schema：' AS info;
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name NOT IN ('pg_toast', 'pg_catalog', 'information_schema')
ORDER BY schema_name;

-- 2️⃣ 檢查 aiproject Schema 是否存在
SELECT '🔍 檢查 aiproject Schema：' AS info;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.schemata WHERE schema_name = 'aiproject'
        ) 
        THEN '✅ aiproject Schema 存在'
        ELSE '❌ aiproject Schema 不存在 - 請執行 ai_settings_schema.sql'
    END AS status;

-- 3️⃣ 檢查 system_ai_config 表是否存在
SELECT '🔍 檢查 system_ai_config 表：' AS info;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'aiproject' 
            AND table_name = 'system_ai_config'
        ) 
        THEN '✅ system_ai_config 表存在'
        ELSE '❌ system_ai_config 表不存在 - 請執行 ai_settings_schema.sql'
    END AS status;

-- 4️⃣ 檢查表格結構（欄位清單）
SELECT '🔍 system_ai_config 表結構：' AS info;
SELECT 
    column_name AS 欄位名稱,
    data_type AS 資料型別,
    is_nullable AS 可為空,
    column_default AS 預設值
FROM information_schema.columns
WHERE table_schema = 'aiproject' 
AND table_name = 'system_ai_config'
ORDER BY ordinal_position;

-- 5️⃣ 檢查 RLS 政策
SELECT '🔍 RLS 政策清單：' AS info;
SELECT 
    policyname AS 政策名稱,
    cmd AS 操作類型,
    roles AS 角色
FROM pg_policies
WHERE schemaname = 'aiproject' 
AND tablename = 'system_ai_config';

-- 6️⃣ 檢查資料筆數
SELECT '🔍 目前資料筆數：' AS info;
SELECT COUNT(*) AS 資料筆數
FROM aiproject.system_ai_config;

-- ============================================
-- 預期結果
-- ============================================
-- ✅ aiproject Schema 存在
-- ✅ system_ai_config 表存在
-- ✅ 應有 10 個欄位（id, provider, model, api_key, api_endpoint, is_active, last_tested_at, test_status, created_at, updated_at）
-- ✅ 應有 4 條 RLS 政策（SELECT, INSERT, UPDATE, DELETE）
-- ============================================