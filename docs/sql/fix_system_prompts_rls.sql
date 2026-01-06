-- ============================================
-- 修正 System Prompts RLS 政策 - 允許匿名存取
-- ============================================
-- 原因：目前前端可能未透過 Supabase Auth 登入，導致無法寫入資料庫（Error 42501）。
-- 修正：暫時開放 anon 角色存取權限，以便原型開發與測試。
-- 注意：這會讓任何擁有 Anon Key 的人都能修改 Prompt，生產環境請務必改回 authenticated 限制。
-- ============================================

-- 1. 確保 Schema 權限（允許 anon 角色使用 aiproject Schema）
GRANT USAGE ON SCHEMA aiproject TO anon;
GRANT USAGE ON SCHEMA aiproject TO authenticated;
GRANT USAGE ON SCHEMA aiproject TO service_role;

GRANT ALL ON ALL TABLES IN SCHEMA aiproject TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA aiproject TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA aiproject TO service_role;

GRANT ALL ON ALL SEQUENCES IN SCHEMA aiproject TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA aiproject TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA aiproject TO service_role;

-- 2. 刪除舊的政策（針對 authenticated）
DROP POLICY IF EXISTS "Allow authenticated users to read system_prompts" ON aiproject.system_prompts;
DROP POLICY IF EXISTS "Allow authenticated users to insert system_prompts" ON aiproject.system_prompts;
DROP POLICY IF EXISTS "Allow authenticated users to update system_prompts" ON aiproject.system_prompts;
DROP POLICY IF EXISTS "Allow authenticated users to delete system_prompts" ON aiproject.system_prompts;

-- 3. 建立新的寬鬆政策（允許 public/anon）

-- 讀取：允許所有人
CREATE POLICY "Allow public to read system_prompts"
ON aiproject.system_prompts
FOR SELECT
TO public
USING (true);

-- 新增：允許所有人
CREATE POLICY "Allow public to insert system_prompts"
ON aiproject.system_prompts
FOR INSERT
TO public
WITH CHECK (true);

-- 更新：允許所有人
CREATE POLICY "Allow public to update system_prompts"
ON aiproject.system_prompts
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- 刪除：允許所有人
CREATE POLICY "Allow public to delete system_prompts"
ON aiproject.system_prompts
FOR DELETE
TO public
USING (true);

-- ============================================
-- 驗證說明
-- ============================================
-- 執行完畢後，請重新整理應用程式頁面並嘗試儲存。
