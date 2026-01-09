-- ============================================
-- 安全 RLS 政策更新腳本
-- ============================================
-- 建立日期：2026-01-10
-- 用途：強化已上線系統的 Row Level Security
-- 說明：基於專案成員資格的資料存取控制
-- ============================================

-- ⚠️ 重要：執行前請先備份資料

-- ============================================
-- 步驟 1：移除舊的寬鬆政策
-- ============================================

-- Projects 表
DROP POLICY IF EXISTS "Allow anon users to read projects" ON aiproject.projects;
DROP POLICY IF EXISTS "Allow anon users to insert projects" ON aiproject.projects;
DROP POLICY IF EXISTS "Allow anon users to update projects" ON aiproject.projects;
DROP POLICY IF EXISTS "Allow anon users to delete projects" ON aiproject.projects;
DROP POLICY IF EXISTS "Allow authenticated users to read projects" ON aiproject.projects;
DROP POLICY IF EXISTS "Allow authenticated users to insert projects" ON aiproject.projects;
DROP POLICY IF EXISTS "Allow authenticated users to update projects" ON aiproject.projects;
DROP POLICY IF EXISTS "Allow authenticated users to delete projects" ON aiproject.projects;

-- Members 表
DROP POLICY IF EXISTS "Allow anon users to read members" ON aiproject.members;
DROP POLICY IF EXISTS "Allow anon users to insert members" ON aiproject.members;
DROP POLICY IF EXISTS "Allow anon users to update members" ON aiproject.members;
DROP POLICY IF EXISTS "Allow anon users to delete members" ON aiproject.members;
DROP POLICY IF EXISTS "Allow authenticated users to read members" ON aiproject.members;
DROP POLICY IF EXISTS "Allow authenticated users to insert members" ON aiproject.members;
DROP POLICY IF EXISTS "Allow authenticated users to update members" ON aiproject.members;
DROP POLICY IF EXISTS "Allow authenticated users to delete members" ON aiproject.members;

-- Artifacts 表
DROP POLICY IF EXISTS "Allow anon users to read artifacts" ON aiproject.artifacts;
DROP POLICY IF EXISTS "Allow anon users to insert artifacts" ON aiproject.artifacts;
DROP POLICY IF EXISTS "Allow anon users to update artifacts" ON aiproject.artifacts;
DROP POLICY IF EXISTS "Allow anon users to delete artifacts" ON aiproject.artifacts;
DROP POLICY IF EXISTS "Allow authenticated users to read artifacts" ON aiproject.artifacts;
DROP POLICY IF EXISTS "Allow authenticated users to insert artifacts" ON aiproject.artifacts;
DROP POLICY IF EXISTS "Allow authenticated users to update artifacts" ON aiproject.artifacts;
DROP POLICY IF EXISTS "Allow authenticated users to delete artifacts" ON aiproject.artifacts;

-- Items 表
DROP POLICY IF EXISTS "Allow anon users to read items" ON aiproject.items;
DROP POLICY IF EXISTS "Allow anon users to insert items" ON aiproject.items;
DROP POLICY IF EXISTS "Allow anon users to update items" ON aiproject.items;
DROP POLICY IF EXISTS "Allow anon users to delete items" ON aiproject.items;
DROP POLICY IF EXISTS "Allow authenticated users to read items" ON aiproject.items;
DROP POLICY IF EXISTS "Allow authenticated users to insert items" ON aiproject.items;
DROP POLICY IF EXISTS "Allow authenticated users to update items" ON aiproject.items;
DROP POLICY IF EXISTS "Allow authenticated users to delete items" ON aiproject.items;

-- Item-Artifacts 表
DROP POLICY IF EXISTS "Allow anon users to read item_artifacts" ON aiproject.item_artifacts;
DROP POLICY IF EXISTS "Allow anon users to insert item_artifacts" ON aiproject.item_artifacts;
DROP POLICY IF EXISTS "Allow anon users to update item_artifacts" ON aiproject.item_artifacts;
DROP POLICY IF EXISTS "Allow anon users to delete item_artifacts" ON aiproject.item_artifacts;
DROP POLICY IF EXISTS "Allow authenticated users to read item_artifacts" ON aiproject.item_artifacts;
DROP POLICY IF EXISTS "Allow authenticated users to insert item_artifacts" ON aiproject.item_artifacts;
DROP POLICY IF EXISTS "Allow authenticated users to update item_artifacts" ON aiproject.item_artifacts;
DROP POLICY IF EXISTS "Allow authenticated users to delete item_artifacts" ON aiproject.item_artifacts;

-- ============================================
-- 步驟 2：建立輔助函數
-- ============================================

-- 取得當前用戶 Email
CREATE OR REPLACE FUNCTION aiproject.get_user_email()
RETURNS TEXT AS $$
BEGIN
  RETURN auth.jwt() ->> 'email';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 檢查用戶是否為某專案的成員
CREATE OR REPLACE FUNCTION aiproject.is_project_member(p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM aiproject.members
    WHERE project_id = p_project_id
    AND email = aiproject.get_user_email()
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 檢查用戶是否為某專案的 PM
CREATE OR REPLACE FUNCTION aiproject.is_project_pm(p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM aiproject.members
    WHERE project_id = p_project_id
    AND email = aiproject.get_user_email()
    AND role = 'pm'
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 步驟 3：Projects 表 - 新安全政策
-- ============================================

-- 讀取：只能讀取自己是成員的專案
CREATE POLICY "Members can read their projects"
ON aiproject.projects FOR SELECT TO authenticated
USING (
  id IN (
    SELECT project_id FROM aiproject.members
    WHERE email = aiproject.get_user_email()
    AND status = 'active'
  )
);

-- 新增：已認證用戶可建立專案（他們會自動成為 PM）
CREATE POLICY "Authenticated users can create projects"
ON aiproject.projects FOR INSERT TO authenticated
WITH CHECK (true);

-- 更新：只有專案 PM 可以更新專案
CREATE POLICY "PM can update their projects"
ON aiproject.projects FOR UPDATE TO authenticated
USING (aiproject.is_project_pm(id))
WITH CHECK (aiproject.is_project_pm(id));

-- 刪除：只有專案 PM 可以刪除專案
CREATE POLICY "PM can delete their projects"
ON aiproject.projects FOR DELETE TO authenticated
USING (aiproject.is_project_pm(id));

-- ============================================
-- 步驟 4：Members 表 - 新安全政策
-- ============================================

-- 讀取：只能讀取自己所屬專案的成員
CREATE POLICY "Members can read project members"
ON aiproject.members FOR SELECT TO authenticated
USING (
  project_id IN (
    SELECT project_id FROM aiproject.members
    WHERE email = aiproject.get_user_email()
    AND status = 'active'
  )
);

-- 新增：只有 PM 可以邀請成員
CREATE POLICY "PM can add members"
ON aiproject.members FOR INSERT TO authenticated
WITH CHECK (aiproject.is_project_pm(project_id));

-- 更新：只有 PM 可以更新成員資料
CREATE POLICY "PM can update members"
ON aiproject.members FOR UPDATE TO authenticated
USING (aiproject.is_project_pm(project_id))
WITH CHECK (aiproject.is_project_pm(project_id));

-- 刪除：只有 PM 可以移除成員
CREATE POLICY "PM can remove members"
ON aiproject.members FOR DELETE TO authenticated
USING (aiproject.is_project_pm(project_id));

-- ============================================
-- 步驟 5：Artifacts 表 - 新安全政策
-- ============================================

-- 讀取：只能讀取自己專案的文件
CREATE POLICY "Members can read project artifacts"
ON aiproject.artifacts FOR SELECT TO authenticated
USING (aiproject.is_project_member(project_id));

-- 新增：專案成員可以上傳文件
CREATE POLICY "Members can upload artifacts"
ON aiproject.artifacts FOR INSERT TO authenticated
WITH CHECK (aiproject.is_project_member(project_id));

-- 更新：專案成員可以更新文件（metadata）
CREATE POLICY "Members can update artifacts"
ON aiproject.artifacts FOR UPDATE TO authenticated
USING (aiproject.is_project_member(project_id))
WITH CHECK (aiproject.is_project_member(project_id));

-- 刪除：只有 PM 可以刪除文件
CREATE POLICY "PM can delete artifacts"
ON aiproject.artifacts FOR DELETE TO authenticated
USING (aiproject.is_project_pm(project_id));

-- ============================================
-- 步驟 6：Items 表 - 新安全政策
-- ============================================

-- 讀取：只能讀取自己專案的任務
CREATE POLICY "Members can read project items"
ON aiproject.items FOR SELECT TO authenticated
USING (aiproject.is_project_member(project_id));

-- 新增：專案成員可以建立任務
CREATE POLICY "Members can create items"
ON aiproject.items FOR INSERT TO authenticated
WITH CHECK (aiproject.is_project_member(project_id));

-- 更新：專案成員可以更新任務
CREATE POLICY "Members can update items"
ON aiproject.items FOR UPDATE TO authenticated
USING (aiproject.is_project_member(project_id))
WITH CHECK (aiproject.is_project_member(project_id));

-- 刪除：專案成員可以刪除任務
CREATE POLICY "Members can delete items"
ON aiproject.items FOR DELETE TO authenticated
USING (aiproject.is_project_member(project_id));

-- ============================================
-- 步驟 7：Item-Artifacts 關聯表 - 新安全政策
-- ============================================

-- 讀取：透過 item 檢查權限
CREATE POLICY "Members can read item_artifacts"
ON aiproject.item_artifacts FOR SELECT TO authenticated
USING (
  item_id IN (
    SELECT id FROM aiproject.items
    WHERE aiproject.is_project_member(project_id)
  )
);

-- 新增
CREATE POLICY "Members can link item_artifacts"
ON aiproject.item_artifacts FOR INSERT TO authenticated
WITH CHECK (
  item_id IN (
    SELECT id FROM aiproject.items
    WHERE aiproject.is_project_member(project_id)
  )
);

-- 刪除
CREATE POLICY "Members can unlink item_artifacts"
ON aiproject.item_artifacts FOR DELETE TO authenticated
USING (
  item_id IN (
    SELECT id FROM aiproject.items
    WHERE aiproject.is_project_member(project_id)
  )
);

-- ============================================
-- 步驟 8：System AI Config - 系統管理員專用
-- ============================================

-- 先移除舊政策
DROP POLICY IF EXISTS "Allow anon users to read config" ON aiproject.system_ai_config;
DROP POLICY IF EXISTS "Allow anon users to insert config" ON aiproject.system_ai_config;
DROP POLICY IF EXISTS "Allow anon users to update config" ON aiproject.system_ai_config;
DROP POLICY IF EXISTS "Allow authenticated users to read config" ON aiproject.system_ai_config;
DROP POLICY IF EXISTS "Allow authenticated users to insert config" ON aiproject.system_ai_config;
DROP POLICY IF EXISTS "Allow authenticated users to update config" ON aiproject.system_ai_config;
DROP POLICY IF EXISTS "authenticated_read_ai_config" ON aiproject.system_ai_config;
DROP POLICY IF EXISTS "authenticated_insert_ai_config" ON aiproject.system_ai_config;
DROP POLICY IF EXISTS "authenticated_update_ai_config" ON aiproject.system_ai_config;

-- 只有系統管理員可以管理 AI 設定
-- 注意：這裡用硬編碼的 admin email，可以改為從設定表讀取
CREATE POLICY "Admin can read AI config"
ON aiproject.system_ai_config FOR SELECT TO authenticated
USING (aiproject.get_user_email() = 'kome808@gmail.com');

CREATE POLICY "Admin can insert AI config"
ON aiproject.system_ai_config FOR INSERT TO authenticated
WITH CHECK (aiproject.get_user_email() = 'kome808@gmail.com');

CREATE POLICY "Admin can update AI config"
ON aiproject.system_ai_config FOR UPDATE TO authenticated
USING (aiproject.get_user_email() = 'kome808@gmail.com')
WITH CHECK (aiproject.get_user_email() = 'kome808@gmail.com');

CREATE POLICY "Admin can delete AI config"
ON aiproject.system_ai_config FOR DELETE TO authenticated
USING (aiproject.get_user_email() = 'kome808@gmail.com');

-- ============================================
-- 步驟 9：System Prompts - 系統管理員專用
-- ============================================

DROP POLICY IF EXISTS "Allow authenticated read prompts" ON aiproject.system_prompts;
DROP POLICY IF EXISTS "Allow authenticated insert prompts" ON aiproject.system_prompts;
DROP POLICY IF EXISTS "Allow authenticated update prompts" ON aiproject.system_prompts;

CREATE POLICY "Admin can read system prompts"
ON aiproject.system_prompts FOR SELECT TO authenticated
USING (aiproject.get_user_email() = 'kome808@gmail.com');

CREATE POLICY "Admin can insert system prompts"
ON aiproject.system_prompts FOR INSERT TO authenticated
WITH CHECK (aiproject.get_user_email() = 'kome808@gmail.com');

CREATE POLICY "Admin can update system prompts"
ON aiproject.system_prompts FOR UPDATE TO authenticated
USING (aiproject.get_user_email() = 'kome808@gmail.com')
WITH CHECK (aiproject.get_user_email() = 'kome808@gmail.com');

-- ============================================
-- 完成訊息
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════';
    RAISE NOTICE '✅ 安全 RLS 政策更新完成！';
    RAISE NOTICE '═══════════════════════════════════════════';
    RAISE NOTICE '安全原則：';
    RAISE NOTICE '  - 匿名用戶（anon）無法存取任何資料';
    RAISE NOTICE '  - 已認證用戶只能存取自己是成員的專案';
    RAISE NOTICE '  - PM 擁有專案管理權限（成員管理、刪除文件）';
    RAISE NOTICE '  - AI 相關設定只有管理員可調整';
    RAISE NOTICE '═══════════════════════════════════════════';
    RAISE NOTICE '驗證步驟：';
    RAISE NOTICE '  1. 用非管理員帳號登入';
    RAISE NOTICE '  2. 確認只能看到自己是成員的專案';
    RAISE NOTICE '  3. 確認無法存取其他人的資料';
    RAISE NOTICE '═══════════════════════════════════════════';
END $$;

-- ============================================
-- 驗證指令
-- ============================================

-- 列出所有 RLS 政策
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'aiproject'
ORDER BY tablename, policyname;
