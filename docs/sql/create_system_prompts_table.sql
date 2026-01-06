-- ============================================
-- System Prompts 表 - Supabase Schema
-- ============================================
-- 建立日期：2024-12-24
-- 用途：儲存全系統 AI Prompts（系統層級）
-- Schema 名稱：aiproject（全小寫，符合 PostgreSQL 慣例）
-- ============================================

-- 1. 建立 system_prompts 表
CREATE TABLE IF NOT EXISTS aiproject.system_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 專案 ID（UUID 類型）
    -- 使用 '00000000-0000-0000-0000-000000000000' 代表系統層級設定
    project_id UUID NOT NULL,
    
    -- 三個 System Prompts
    wbs_parser TEXT,
    intent_classification TEXT,
    few_shot_examples TEXT,
    
    -- 元資料
    last_updated_at TIMESTAMPTZ,
    updated_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 約束：每個 project_id 只能有一筆記錄
    CONSTRAINT unique_project_prompts UNIQUE (project_id)
);

-- 2. 建立索引
CREATE INDEX idx_system_prompts_project_id 
ON aiproject.system_prompts(project_id);

-- 3. 建立更新時間自動觸發器
CREATE OR REPLACE FUNCTION aiproject.update_system_prompts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_system_prompts_updated_at
BEFORE UPDATE ON aiproject.system_prompts
FOR EACH ROW
EXECUTE FUNCTION aiproject.update_system_prompts_updated_at();

-- 4. 註解說明
COMMENT ON TABLE aiproject.system_prompts IS '系統層級 AI Prompts 設定';
COMMENT ON COLUMN aiproject.system_prompts.project_id IS '專案 ID（00000000-0000-0000-0000-000000000000 代表系統層級）';
COMMENT ON COLUMN aiproject.system_prompts.wbs_parser IS 'WBS 解析 Prompt';
COMMENT ON COLUMN aiproject.system_prompts.intent_classification IS '意圖分類 Prompt';
COMMENT ON COLUMN aiproject.system_prompts.few_shot_examples IS 'Few-Shot 範例 Prompt';
COMMENT ON COLUMN aiproject.system_prompts.last_updated_at IS '最後更新時間（業務層記錄）';
COMMENT ON COLUMN aiproject.system_prompts.updated_by IS '更新者 Email';

-- ============================================
-- Row Level Security (RLS) 政策
-- ============================================

-- 5. 啟用 RLS
ALTER TABLE aiproject.system_prompts ENABLE ROW LEVEL SECURITY;

-- 6. 政策：允許所有已認證使用者讀取
CREATE POLICY "Allow authenticated users to read system_prompts"
ON aiproject.system_prompts
FOR SELECT
TO authenticated
USING (true);

-- 7. 政策：允許所有已認證使用者新增
-- 注意：未來可改為僅允許系統管理員（role = 'admin'）
CREATE POLICY "Allow authenticated users to insert system_prompts"
ON aiproject.system_prompts
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 8. 政策：允許所有已認證使用者更新
-- 注意：未來可改為僅允許系統管理員（role = 'admin'）
CREATE POLICY "Allow authenticated users to update system_prompts"
ON aiproject.system_prompts
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 9. 政策：允許所有已認證使用者刪除
-- 注意：未來可改為僅允許系統管理員（role = 'admin'）
CREATE POLICY "Allow authenticated users to delete system_prompts"
ON aiproject.system_prompts
FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- 初始化系統層級預設值（可選）
-- ============================================
-- 注意：這裡不插入預設值，讓 UI 自動處理
-- 當系統管理員第一次開啟「提示詞管理」頁面時，
-- 系統會自動顯示 prompts.ts 的預設值供編輯

-- ============================================
-- 驗證
-- ============================================
-- 執行以下 SQL 確認表格已建立：
-- SELECT * FROM aiproject.system_prompts;

-- 確認系統層級設定：
-- SELECT * FROM aiproject.system_prompts 
-- WHERE project_id = '00000000-0000-0000-0000-000000000000';

-- ============================================
-- 使用說明
-- ============================================
-- 1. Schema 名稱已設定為：aiproject
-- 2. 在 Supabase SQL Editor 中執行此 SQL
-- 3. 驗證：執行 SELECT * FROM aiproject.system_prompts;
-- 4. 系統層級設定的 project_id 固定為：00000000-0000-0000-0000-000000000000
-- ============================================
