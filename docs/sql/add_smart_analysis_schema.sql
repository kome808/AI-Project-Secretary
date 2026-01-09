-- ============================================
-- AI 秘書智慧文件分析 - 資料庫擴充遷移腳本
-- ============================================

-- 1. 新增 items.embedding 欄位
-- 用於存放任務的向量表示 (OpenAI text-embedding-3-small: 1536維)
ALTER TABLE aiproject.items 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- 2. 建立 items 向量索引 (IVFFlat)
-- 提升相似度搜尋效能
CREATE INDEX IF NOT EXISTS items_embedding_idx 
ON aiproject.items 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 3. 建立 match_tasks RPC 函數
-- 用於搜尋與查詢向量最相似的任務
CREATE OR REPLACE FUNCTION aiproject.match_tasks(
  query_embedding vector(1536),
  project_id uuid DEFAULT NULL,
  match_count int DEFAULT 5,
  match_threshold float DEFAULT 0.3
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  type text,
  is_feature_module boolean,
  similarity float
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.title,
    i.description,
    i.type,
    COALESCE((i.meta->>'isFeatureModule')::boolean, false) as is_feature_module,
    1 - (i.embedding <=> query_embedding) as similarity
  FROM aiproject.items i
  WHERE i.embedding IS NOT NULL
    AND (project_id IS NULL OR i.project_id = project_id)
    AND 1 - (i.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- 授權 RPC 給所有角色
GRANT EXECUTE ON FUNCTION aiproject.match_tasks TO authenticated, anon, service_role;

-- 4. 建立 ai_feedback 表 (UX 優化需求)
-- 用於記錄 PM 對 AI 映射結果的修正，作為未來優化 Prompt 的依據
CREATE TABLE IF NOT EXISTS aiproject.ai_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES aiproject.projects(id) ON DELETE CASCADE,
    artifact_id UUID REFERENCES aiproject.artifacts(id) ON DELETE SET NULL,
    chunk_text TEXT,                -- 原始切片文字
    original_mapping JSONB,         -- AI 原始建議 (JSON)
    corrected_mapping JSONB,        -- PM 修正後的結果 (JSON)
    feedback_type TEXT CHECK (feedback_type IN ('incorrect_target', 'missing_target', 'wrong_category', 'other')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ai_feedback 索引
CREATE INDEX IF NOT EXISTS idx_ai_feedback_project_id ON aiproject.ai_feedback(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_created_at ON aiproject.ai_feedback(created_at DESC);

-- ai_feedback RLS 權限
ALTER TABLE aiproject.ai_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to insert feedback"
ON aiproject.ai_feedback FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read feedback"
ON aiproject.ai_feedback FOR SELECT TO authenticated USING (true);

-- 5. 註解說明
COMMENT ON COLUMN aiproject.items.embedding IS '任務內容的向量表示 (1536維)';
COMMENT ON TABLE aiproject.ai_feedback IS 'AI 智慧分析的學習反饋記錄表';
