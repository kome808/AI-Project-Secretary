-- ============================================
-- 刪除並重建 aiproject Schema
-- ============================================
-- 用途：完全清除舊的 aiproject schema 並重新建立
-- 警告：此操作會永久刪除 aiproject schema 中的所有資料表和資料
-- ============================================

-- ⚠️ 步驟 1：刪除舊的 aiproject schema（包含所有資料表、函數、觸發器）
-- CASCADE 會自動刪除所有依賴的物件
DROP SCHEMA IF EXISTS aiproject CASCADE;

-- 顯示刪除成功訊息
DO $$
BEGIN
    RAISE NOTICE '🗑️  已刪除舊的 aiproject schema（如果存在）';
END $$;

-- ============================================
-- ✅ 步驟 2：重新建立 aiproject Schema
-- ============================================

-- 建立 aiproject Schema
CREATE SCHEMA aiproject;

-- 確認 Schema 已建立
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.schemata WHERE schema_name = 'aiproject'
    ) THEN
        RAISE NOTICE '✅ Schema "aiproject" 已成功建立';
    ELSE
        RAISE EXCEPTION '❌ Schema "aiproject" 建立失敗';
    END IF;
END $$;

-- ============================================
-- ✅ 步驟 3：建立資料表
-- ============================================

-- 1. 建立 system_ai_config 表
CREATE TABLE aiproject.system_ai_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google')),
    model TEXT NOT NULL,
    api_key TEXT NOT NULL,
    api_endpoint TEXT,
    is_active BOOLEAN NOT NULL DEFAULT false,
    last_tested_at TIMESTAMPTZ,
    test_status TEXT CHECK (test_status IN ('success', 'failed', 'pending', NULL)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 約束：確保只有一筆 is_active = true
    CONSTRAINT unique_active_config EXCLUDE (is_active WITH =) WHERE (is_active = true)
);

-- 2. 建立索引
CREATE INDEX idx_system_ai_config_is_active 
ON aiproject.system_ai_config(is_active) 
WHERE is_active = true;

-- 3. 建立更新時間自動觸發器
CREATE OR REPLACE FUNCTION aiproject.update_system_ai_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_system_ai_config_updated_at
BEFORE UPDATE ON aiproject.system_ai_config
FOR EACH ROW
EXECUTE FUNCTION aiproject.update_system_ai_config_updated_at();

-- 4. 註解說明
COMMENT ON TABLE aiproject.system_ai_config IS '全系統 AI 供應商與模型設定（全專案共用）';
COMMENT ON COLUMN aiproject.system_ai_config.provider IS 'AI 供應商：openai/anthropic/google';
COMMENT ON COLUMN aiproject.system_ai_config.model IS '模型名稱（例如：gpt-4.5-turbo, claude-3-5-sonnet-20241022）';
COMMENT ON COLUMN aiproject.system_ai_config.api_key IS 'API Key（建議使用 Supabase Vault 加密）';
COMMENT ON COLUMN aiproject.system_ai_config.api_endpoint IS '自訂 API Endpoint（可選，用於私有部署）';
COMMENT ON COLUMN aiproject.system_ai_config.is_active IS '是否為當前啟用設定（全系統唯一）';
COMMENT ON COLUMN aiproject.system_ai_config.last_tested_at IS '最後測試連線時間';
COMMENT ON COLUMN aiproject.system_ai_config.test_status IS '測試狀態：success/failed/pending';

-- ============================================
-- ✅ 步驟 4：Row Level Security (RLS) 政策
-- ============================================

-- 啟用 RLS
ALTER TABLE aiproject.system_ai_config ENABLE ROW LEVEL SECURITY;

-- 政策 1：允許匿名使用者讀取（查看設定）
-- 注意：因為本專案使用 anon key 直接連線，所以需要設定 anon 權限
CREATE POLICY "Allow anon users to read system_ai_config"
ON aiproject.system_ai_config
FOR SELECT
TO anon
USING (true);

-- 政策 2：允許匿名使用者新增設定
CREATE POLICY "Allow anon users to insert system_ai_config"
ON aiproject.system_ai_config
FOR INSERT
TO anon
WITH CHECK (true);

-- 政策 3：允許匿名使用者更新設定
CREATE POLICY "Allow anon users to update system_ai_config"
ON aiproject.system_ai_config
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- 政策 4：允許匿名使用者刪除設定
CREATE POLICY "Allow anon users to delete system_ai_config"
ON aiproject.system_ai_config
FOR DELETE
TO anon
USING (true);

-- 政策 5：允許已認證使用者讀取（查看設定）
CREATE POLICY "Allow authenticated users to read system_ai_config"
ON aiproject.system_ai_config
FOR SELECT
TO authenticated
USING (true);

-- 政策 6：允許已認證使用者新增設定
CREATE POLICY "Allow authenticated users to insert system_ai_config"
ON aiproject.system_ai_config
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 政策 7：允許已認證使用者更新設定
CREATE POLICY "Allow authenticated users to update system_ai_config"
ON aiproject.system_ai_config
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 政策 8：允許已認證使用者刪除設定
CREATE POLICY "Allow authenticated users to delete system_ai_config"
ON aiproject.system_ai_config
FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- ✅ 完成訊息
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════';
    RAISE NOTICE '✅ aiproject schema 重建完成！';
    RAISE NOTICE '═══════════════════════════════════════════';
    RAISE NOTICE '已建立的物件：';
    RAISE NOTICE '  - Schema: aiproject';
    RAISE NOTICE '  - Table: aiproject.system_ai_config';
    RAISE NOTICE '  - Trigger: trigger_update_system_ai_config_updated_at';
    RAISE NOTICE '  - RLS Policies: 8 個權限政策';
    RAISE NOTICE '═══════════════════════════════════════════';
    RAISE NOTICE '下一步：';
    RAISE NOTICE '  1. 執行驗證查詢：SELECT * FROM aiproject.system_ai_config;';
    RAISE NOTICE '  2. 在 Supabase 連線設定中輸入 schema 名稱：aiproject';
    RAISE NOTICE '  3. 測試連線並儲存設定';
    RAISE NOTICE '═══════════════════════════════════════════';
END $$;

-- ============================================
-- 🔍 驗證指令（可選）
-- ============================================
-- 執行以下指令確認 schema 已正確建立：

-- 1. 確認 schema 存在
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name = 'aiproject';

-- 2. 確認資料表存在
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'aiproject';

-- 3. 確認 RLS 已啟用
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'aiproject';

-- 4. 測試資料表（應該回傳空結果）
SELECT * FROM aiproject.system_ai_config;
