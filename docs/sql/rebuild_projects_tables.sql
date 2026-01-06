-- ============================================
-- 重建專案管理資料表 - Supabase Schema
-- ============================================
-- 建立日期：2024-12-23
-- 用途：安全地重建專案相關資料表
-- Schema 名稱：aiproject
-- ============================================

-- ============================================
-- 步驟 1: 刪除舊的表格（如果存在）
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '🧹 開始清理舊的資料表...';
END $$;

-- 先刪除關聯表（避免外鍵約束錯誤）
DROP TABLE IF EXISTS aiproject.item_artifacts CASCADE;
DROP TABLE IF EXISTS aiproject.items CASCADE;
DROP TABLE IF EXISTS aiproject.artifacts CASCADE;
DROP TABLE IF EXISTS aiproject.members CASCADE;
DROP TABLE IF EXISTS aiproject.projects CASCADE;

-- 刪除舊的觸發器函數（如果存在）
DROP FUNCTION IF EXISTS aiproject.update_projects_updated_at() CASCADE;
DROP FUNCTION IF EXISTS aiproject.update_items_updated_at() CASCADE;

DO $$
BEGIN
    RAISE NOTICE '✅ 舊資料表已清理完成';
    RAISE NOTICE '';
END $$;

-- ============================================
-- 步驟 2: 建立新的資料表
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '🔨 開始建立新的資料表...';
END $$;

-- ============================================
-- 1. Projects 表（專案）
-- ============================================

CREATE TABLE aiproject.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'pending_deletion', 'deleted')),
    pm_id TEXT, -- Project Manager ID
    deleted_at TIMESTAMPTZ,
    purge_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX idx_projects_status ON aiproject.projects(status);
CREATE INDEX idx_projects_created_at ON aiproject.projects(created_at DESC);

-- 註解
COMMENT ON TABLE aiproject.projects IS '專案主表';
COMMENT ON COLUMN aiproject.projects.status IS '專案狀態：active(啟用)/archived(封存)/pending_deletion(待刪除)/deleted(已刪除)';
COMMENT ON COLUMN aiproject.projects.pm_id IS '專案經理 ID';
COMMENT ON COLUMN aiproject.projects.deleted_at IS '標記刪除時間';
COMMENT ON COLUMN aiproject.projects.purge_at IS '永久刪除時間（deleted_at + 30 天）';

DO $$
BEGIN
    RAISE NOTICE '  ✅ aiproject.projects 建立完成';
END $$;

-- ============================================
-- 2. Members 表（專案成員）
-- ============================================

CREATE TABLE aiproject.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES aiproject.projects(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('client', 'pm', 'designer', 'engineer', 'other')),
    role_display_name TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'disabled')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_project_member_email UNIQUE (project_id, email)
);

-- 索引
CREATE INDEX idx_members_project_id ON aiproject.members(project_id);
CREATE INDEX idx_members_email ON aiproject.members(email);
CREATE INDEX idx_members_status ON aiproject.members(status);

-- 註解
COMMENT ON TABLE aiproject.members IS '專案成員表';
COMMENT ON COLUMN aiproject.members.role IS '成員角色：client(客戶)/pm(專案經理)/designer(設計師)/engineer(工程師)/other(其他)';
COMMENT ON COLUMN aiproject.members.status IS '成員狀態：invited(已邀請)/active(啟用)/disabled(停用)';

DO $$
BEGIN
    RAISE NOTICE '  ✅ aiproject.members 建立完成';
END $$;

-- ============================================
-- 3. Artifacts 表（文件/證據）
-- ============================================

CREATE TABLE aiproject.artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES aiproject.projects(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL,
    original_content TEXT NOT NULL,
    masked_content TEXT,
    archived BOOLEAN DEFAULT false,
    meta JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_artifacts_project_id ON aiproject.artifacts(project_id);
CREATE INDEX idx_artifacts_created_at ON aiproject.artifacts(created_at DESC);
CREATE INDEX idx_artifacts_archived ON aiproject.artifacts(archived);
CREATE INDEX idx_artifacts_content_type ON aiproject.artifacts(content_type);

-- 註解
COMMENT ON TABLE aiproject.artifacts IS '文件/證據表（支援文字、檔案、對話記錄等）';
COMMENT ON COLUMN aiproject.artifacts.content_type IS 'MIME type（例如：text/plain, text/conversation, text/uri-list, application/pdf）';
COMMENT ON COLUMN aiproject.artifacts.original_content IS '原始內容（建立後不可修改）';
COMMENT ON COLUMN aiproject.artifacts.masked_content IS '遮罩敏感資訊後的內容';
COMMENT ON COLUMN aiproject.artifacts.meta IS 'JSON 格式的 metadata（channel, summary, source_info, uploader_id 等）';

DO $$
BEGIN
    RAISE NOTICE '  ✅ aiproject.artifacts 建立完成';
END $$;

-- ============================================
-- 4. Items 表（任務/需求項目）
-- ============================================

CREATE TABLE aiproject.items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES aiproject.projects(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('general', 'pending', 'cr', 'decision')),
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'blocked', 'awaiting_response', 'completed')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    source_artifact_id UUID REFERENCES aiproject.artifacts(id) ON DELETE SET NULL,
    assignee_id TEXT,
    work_package_id UUID,
    parent_id UUID REFERENCES aiproject.items(id) ON DELETE SET NULL,
    due_date TIMESTAMPTZ,
    priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
    notes TEXT,
    notes_updated_at TIMESTAMPTZ,
    notes_updated_by TEXT,
    meta JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_items_project_id ON aiproject.items(project_id);
CREATE INDEX idx_items_type ON aiproject.items(type);
CREATE INDEX idx_items_status ON aiproject.items(status);
CREATE INDEX idx_items_assignee_id ON aiproject.items(assignee_id);
CREATE INDEX idx_items_work_package_id ON aiproject.items(work_package_id);
CREATE INDEX idx_items_parent_id ON aiproject.items(parent_id);
CREATE INDEX idx_items_due_date ON aiproject.items(due_date);
CREATE INDEX idx_items_created_at ON aiproject.items(created_at DESC);

-- 註解
COMMENT ON TABLE aiproject.items IS '任務/需求項目表';
COMMENT ON COLUMN aiproject.items.type IS '項目類型：general(一般)/pending(待回覆)/cr(需求變更)/decision(決策)';
COMMENT ON COLUMN aiproject.items.status IS '項目狀態：not_started(未開始)/in_progress(進行中)/blocked(受阻)/awaiting_response(等待回覆)/completed(已完成)';
COMMENT ON COLUMN aiproject.items.parent_id IS '父項目 ID（用於樹狀結構）';
COMMENT ON COLUMN aiproject.items.meta IS 'JSON 格式的彈性欄位（tags, confidence, pending_meta, decision_meta 等）';

DO $$
BEGIN
    RAISE NOTICE '  ✅ aiproject.items 建立完成';
END $$;

-- ============================================
-- 5. Item-Artifact 關聯表（多對多）
-- ============================================

CREATE TABLE aiproject.item_artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES aiproject.items(id) ON DELETE CASCADE,
    artifact_id UUID NOT NULL REFERENCES aiproject.artifacts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_item_artifact UNIQUE (item_id, artifact_id)
);

-- 索引
CREATE INDEX idx_item_artifacts_item_id ON aiproject.item_artifacts(item_id);
CREATE INDEX idx_item_artifacts_artifact_id ON aiproject.item_artifacts(artifact_id);

-- 註解
COMMENT ON TABLE aiproject.item_artifacts IS 'Item 與 Artifact 的多對多關聯表';

DO $$
BEGIN
    RAISE NOTICE '  ✅ aiproject.item_artifacts 建立完成';
    RAISE NOTICE '';
END $$;

-- ============================================
-- 步驟 3: 建立觸發器函數
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '⚙️  建立觸發器函數...';
END $$;

-- Projects 更新時間觸發器
CREATE FUNCTION aiproject.update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_projects_updated_at
BEFORE UPDATE ON aiproject.projects
FOR EACH ROW
EXECUTE FUNCTION aiproject.update_projects_updated_at();

-- Items 更新時間觸發器
CREATE FUNCTION aiproject.update_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_items_updated_at
BEFORE UPDATE ON aiproject.items
FOR EACH ROW
EXECUTE FUNCTION aiproject.update_items_updated_at();

DO $$
BEGIN
    RAISE NOTICE '  ✅ 觸發器已建立';
    RAISE NOTICE '';
END $$;

-- ============================================
-- 步驟 4: 設定 Row Level Security (RLS)
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '🔐 設定 Row Level Security...';
END $$;

-- 1. Projects 表 RLS
ALTER TABLE aiproject.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon users to read projects" ON aiproject.projects;
DROP POLICY IF EXISTS "Allow anon users to insert projects" ON aiproject.projects;
DROP POLICY IF EXISTS "Allow anon users to update projects" ON aiproject.projects;
DROP POLICY IF EXISTS "Allow anon users to delete projects" ON aiproject.projects;
DROP POLICY IF EXISTS "Allow authenticated users to read projects" ON aiproject.projects;
DROP POLICY IF EXISTS "Allow authenticated users to insert projects" ON aiproject.projects;
DROP POLICY IF EXISTS "Allow authenticated users to update projects" ON aiproject.projects;
DROP POLICY IF EXISTS "Allow authenticated users to delete projects" ON aiproject.projects;

CREATE POLICY "Allow anon users to read projects"
ON aiproject.projects FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon users to insert projects"
ON aiproject.projects FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon users to update projects"
ON aiproject.projects FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon users to delete projects"
ON aiproject.projects FOR DELETE TO anon USING (true);

CREATE POLICY "Allow authenticated users to read projects"
ON aiproject.projects FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert projects"
ON aiproject.projects FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update projects"
ON aiproject.projects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete projects"
ON aiproject.projects FOR DELETE TO authenticated USING (true);

-- 2. Members 表 RLS
ALTER TABLE aiproject.members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon users to read members" ON aiproject.members;
DROP POLICY IF EXISTS "Allow anon users to insert members" ON aiproject.members;
DROP POLICY IF EXISTS "Allow anon users to update members" ON aiproject.members;
DROP POLICY IF EXISTS "Allow anon users to delete members" ON aiproject.members;
DROP POLICY IF EXISTS "Allow authenticated users to read members" ON aiproject.members;
DROP POLICY IF EXISTS "Allow authenticated users to insert members" ON aiproject.members;
DROP POLICY IF EXISTS "Allow authenticated users to update members" ON aiproject.members;
DROP POLICY IF EXISTS "Allow authenticated users to delete members" ON aiproject.members;

CREATE POLICY "Allow anon users to read members"
ON aiproject.members FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon users to insert members"
ON aiproject.members FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon users to update members"
ON aiproject.members FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon users to delete members"
ON aiproject.members FOR DELETE TO anon USING (true);

CREATE POLICY "Allow authenticated users to read members"
ON aiproject.members FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert members"
ON aiproject.members FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update members"
ON aiproject.members FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete members"
ON aiproject.members FOR DELETE TO authenticated USING (true);

-- 3. Artifacts 表 RLS
ALTER TABLE aiproject.artifacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon users to read artifacts" ON aiproject.artifacts;
DROP POLICY IF EXISTS "Allow anon users to insert artifacts" ON aiproject.artifacts;
DROP POLICY IF EXISTS "Allow anon users to update artifacts" ON aiproject.artifacts;
DROP POLICY IF EXISTS "Allow anon users to delete artifacts" ON aiproject.artifacts;
DROP POLICY IF EXISTS "Allow authenticated users to read artifacts" ON aiproject.artifacts;
DROP POLICY IF EXISTS "Allow authenticated users to insert artifacts" ON aiproject.artifacts;
DROP POLICY IF EXISTS "Allow authenticated users to update artifacts" ON aiproject.artifacts;
DROP POLICY IF EXISTS "Allow authenticated users to delete artifacts" ON aiproject.artifacts;

CREATE POLICY "Allow anon users to read artifacts"
ON aiproject.artifacts FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon users to insert artifacts"
ON aiproject.artifacts FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon users to update artifacts"
ON aiproject.artifacts FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon users to delete artifacts"
ON aiproject.artifacts FOR DELETE TO anon USING (true);

CREATE POLICY "Allow authenticated users to read artifacts"
ON aiproject.artifacts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert artifacts"
ON aiproject.artifacts FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update artifacts"
ON aiproject.artifacts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete artifacts"
ON aiproject.artifacts FOR DELETE TO authenticated USING (true);

-- 4. Items 表 RLS
ALTER TABLE aiproject.items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon users to read items" ON aiproject.items;
DROP POLICY IF EXISTS "Allow anon users to insert items" ON aiproject.items;
DROP POLICY IF EXISTS "Allow anon users to update items" ON aiproject.items;
DROP POLICY IF EXISTS "Allow anon users to delete items" ON aiproject.items;
DROP POLICY IF EXISTS "Allow authenticated users to read items" ON aiproject.items;
DROP POLICY IF EXISTS "Allow authenticated users to insert items" ON aiproject.items;
DROP POLICY IF EXISTS "Allow authenticated users to update items" ON aiproject.items;
DROP POLICY IF EXISTS "Allow authenticated users to delete items" ON aiproject.items;

CREATE POLICY "Allow anon users to read items"
ON aiproject.items FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon users to insert items"
ON aiproject.items FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon users to update items"
ON aiproject.items FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon users to delete items"
ON aiproject.items FOR DELETE TO anon USING (true);

CREATE POLICY "Allow authenticated users to read items"
ON aiproject.items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert items"
ON aiproject.items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update items"
ON aiproject.items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete items"
ON aiproject.items FOR DELETE TO authenticated USING (true);

-- 5. Item-Artifact 關聯表 RLS
ALTER TABLE aiproject.item_artifacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon users to read item_artifacts" ON aiproject.item_artifacts;
DROP POLICY IF EXISTS "Allow anon users to insert item_artifacts" ON aiproject.item_artifacts;
DROP POLICY IF EXISTS "Allow anon users to update item_artifacts" ON aiproject.item_artifacts;
DROP POLICY IF EXISTS "Allow anon users to delete item_artifacts" ON aiproject.item_artifacts;
DROP POLICY IF EXISTS "Allow authenticated users to read item_artifacts" ON aiproject.item_artifacts;
DROP POLICY IF EXISTS "Allow authenticated users to insert item_artifacts" ON aiproject.item_artifacts;
DROP POLICY IF EXISTS "Allow authenticated users to update item_artifacts" ON aiproject.item_artifacts;
DROP POLICY IF EXISTS "Allow authenticated users to delete item_artifacts" ON aiproject.item_artifacts;

CREATE POLICY "Allow anon users to read item_artifacts"
ON aiproject.item_artifacts FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon users to insert item_artifacts"
ON aiproject.item_artifacts FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon users to update item_artifacts"
ON aiproject.item_artifacts FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon users to delete item_artifacts"
ON aiproject.item_artifacts FOR DELETE TO anon USING (true);

CREATE POLICY "Allow authenticated users to read item_artifacts"
ON aiproject.item_artifacts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert item_artifacts"
ON aiproject.item_artifacts FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update item_artifacts"
ON aiproject.item_artifacts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete item_artifacts"
ON aiproject.item_artifacts FOR DELETE TO authenticated USING (true);

DO $$
BEGIN
    RAISE NOTICE '  ✅ RLS 政策已設定完成';
    RAISE NOTICE '';
END $$;

-- ============================================
-- 完成訊息
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════';
    RAISE NOTICE '🎉 專案管理資料表重建完成！';
    RAISE NOTICE '═══════════════════════════════════════════';
    RAISE NOTICE '已建立的資料表：';
    RAISE NOTICE '  ✅ aiproject.projects（專案）';
    RAISE NOTICE '  ✅ aiproject.members（專案成員）';
    RAISE NOTICE '  ✅ aiproject.artifacts（文件/證據）';
    RAISE NOTICE '  ✅ aiproject.items（任務/需求項目）';
    RAISE NOTICE '  ✅ aiproject.item_artifacts（Item-Artifact 關聯）';
    RAISE NOTICE '';
    RAISE NOTICE '已建立的功能：';
    RAISE NOTICE '  ✅ 自動更新時間觸發器（projects, items）';
    RAISE NOTICE '  ✅ RLS 權限政策（全部表格，anon + authenticated）';
    RAISE NOTICE '  ✅ 外鍵約束（CASCADE 刪除）';
    RAISE NOTICE '  ✅ 唯一性約束（member email, item-artifact）';
    RAISE NOTICE '  ✅ 索引優化（查詢效能）';
    RAISE NOTICE '═══════════════════════════════════════════';
    RAISE NOTICE '下一步：';
    RAISE NOTICE '  1. 執行驗證：SELECT COUNT(*) FROM aiproject.projects;';
    RAISE NOTICE '  2. 重新整理應用程式';
    RAISE NOTICE '  3. 測試「載入模擬資料」功能';
    RAISE NOTICE '═══════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- ============================================
-- 驗證查詢（自動執行）
-- ============================================

-- 顯示所有已建立的表格
SELECT 
    '已建立的表格:' as info,
    table_name 
FROM information_schema.tables 
WHERE table_schema = 'aiproject'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 顯示 RLS 狀態
SELECT 
    'RLS 狀態:' as info,
    tablename,
    CASE WHEN rowsecurity THEN '✅ 已啟用' ELSE '❌ 未啟用' END as rls_status
FROM pg_tables 
WHERE schemaname = 'aiproject'
ORDER BY tablename;
