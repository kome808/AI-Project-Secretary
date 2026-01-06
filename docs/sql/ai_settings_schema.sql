-- ============================================
-- AI 供應商與模型設定 - Supabase Schema
-- ============================================
-- 建立日期：2024-12-22
-- 用途：儲存全系統 AI 供應商與模型設定
-- Schema 名稱：aiproject（全小寫，符合 PostgreSQL 慣例）
-- ============================================

-- 0. 建立 aiproject Schema（如果尚未存在）
CREATE SCHEMA IF NOT EXISTS aiproject;

-- 確認 Schema 已建立
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.schemata WHERE schema_name = 'aiproject'
    ) THEN
        RAISE NOTICE '✅ Schema "aiproject" 已成功建立或已存在';
    ELSE
        RAISE EXCEPTION '❌ Schema "aiproject" 建立失敗';
    END IF;
END $$;

-- 1. 建立 system_ai_config 表
CREATE TABLE IF NOT EXISTS aiproject.system_ai_config (
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
-- Row Level Security (RLS) 政策
-- ============================================

-- 5. 啟用 RLS
ALTER TABLE aiproject.system_ai_config ENABLE ROW LEVEL SECURITY;

-- 6. 政策：允許所有已認證使用者讀取（查看設定）
CREATE POLICY "Allow authenticated users to read system_ai_config"
ON aiproject.system_ai_config
FOR SELECT
TO authenticated
USING (true);

-- 7. 政策：允許所有已認證使用者新增設定
-- 注意：未來可改為僅允許系統管理員（role = 'admin'）
CREATE POLICY "Allow authenticated users to insert system_ai_config"
ON aiproject.system_ai_config
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 8. 政策：允許所有已認證使用者更新設定
-- 注意：未來可改為僅允許系統管理員（role = 'admin'）
CREATE POLICY "Allow authenticated users to update system_ai_config"
ON aiproject.system_ai_config
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 9. 政策：允許所有已認證使用者刪除設定
-- 注意：未來可改為僅允許系統管理員（role = 'admin'）
CREATE POLICY "Allow authenticated users to delete system_ai_config"
ON aiproject.system_ai_config
FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- 測試資料（可選）
-- ============================================
-- 注意：請勿在正式環境插入真實 API Key

-- INSERT INTO aiproject.system_ai_config (
--     provider, 
--     model, 
--     api_key, 
--     is_active, 
--     test_status
-- ) VALUES (
--     'openai',
--     'gpt-4.5-turbo',
--     'sk-DEMO_KEY_DO_NOT_USE_IN_PRODUCTION',
--     true,
--     'pending'
-- );

-- ============================================
-- 使用說明
-- ============================================
-- 1. Schema 名稱已設定為：aiproject
-- 2. 在 Supabase SQL Editor 中執行此 SQL
-- 3. 驗證：執行 SELECT * FROM aiproject.system_ai_config;
-- 4. 未來可透過 Supabase Vault 加密 API Key（參考：https://supabase.com/docs/guides/database/vault）
-- ============================================