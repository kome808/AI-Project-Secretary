-- ============================================
-- Artifact 表格：新增檔案儲存欄位
-- ============================================
-- 建立日期：2024-12-23
-- 用途：支援 Supabase Storage 檔案儲存
-- ============================================

-- 1. 新增欄位到 artifacts 表
ALTER TABLE aiproject.artifacts 
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS file_hash TEXT;

-- 2. 欄位說明
COMMENT ON COLUMN aiproject.artifacts.storage_path IS 'Supabase Storage 路徑（僅檔案與圖片），格式：project_id/artifact_id/filename';
COMMENT ON COLUMN aiproject.artifacts.file_url IS 'Signed URL（暫存，有效期 1 小時，需定期更新）';
COMMENT ON COLUMN aiproject.artifacts.file_size IS '檔案大小（bytes）';
COMMENT ON COLUMN aiproject.artifacts.file_hash IS '檔案 SHA-256 hash（用於去重與完整性驗證）';

-- 3. 建立索引（提升查詢效能）
CREATE INDEX IF NOT EXISTS idx_artifacts_storage_path ON aiproject.artifacts(storage_path);
CREATE INDEX IF NOT EXISTS idx_artifacts_file_hash ON aiproject.artifacts(file_hash);

-- ============================================
-- Supabase Storage Bucket 建立
-- ============================================

-- 4. 建立私有 Bucket（如果不存在）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'aiproject-files',
  'aiproject-files',
  false, -- 私有 bucket，需透過 signed URL 存取
  52428800, -- 50MB 檔案大小限制
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/markdown',
    'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Storage RLS 權限政策
-- ============================================

-- 5. 刪除舊政策（如果存在）
DROP POLICY IF EXISTS "Project members can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Project members can read files" ON storage.objects;
DROP POLICY IF EXISTS "Project members can update files" ON storage.objects;
DROP POLICY IF EXISTS "Project PM can delete files" ON storage.objects;

-- 6. 新增政策：專案成員可上傳檔案到自己的專案資料夾
CREATE POLICY "Project members can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'aiproject-files' AND
  (storage.foldername(name))[1] IN (
    SELECT p.id::text FROM aiproject.projects p
    JOIN aiproject.members m ON m.project_id = p.id
    WHERE m.email = (auth.jwt() ->> 'email')
    AND m.status = 'active'
  )
);

-- 7. 新增政策：專案成員可讀取自己專案的檔案
CREATE POLICY "Project members can read files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'aiproject-files' AND
  (storage.foldername(name))[1] IN (
    SELECT p.id::text FROM aiproject.projects p
    JOIN aiproject.members m ON m.project_id = p.id
    WHERE m.email = (auth.jwt() ->> 'email')
    AND m.status = 'active'
  )
);

-- 8. 新增政策：專案成員可更新自己專案的檔案（重新上傳）
CREATE POLICY "Project members can update files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'aiproject-files' AND
  (storage.foldername(name))[1] IN (
    SELECT p.id::text FROM aiproject.projects p
    JOIN aiproject.members m ON m.project_id = p.id
    WHERE m.email = (auth.jwt() ->> 'email')
    AND m.status = 'active'
  )
)
WITH CHECK (
  bucket_id = 'aiproject-files' AND
  (storage.foldername(name))[1] IN (
    SELECT p.id::text FROM aiproject.projects p
    JOIN aiproject.members m ON m.project_id = p.id
    WHERE m.email = (auth.jwt() ->> 'email')
    AND m.status = 'active'
  )
);

-- 9. 新增政策：專案 PM 可刪除專案檔案
CREATE POLICY "Project PM can delete files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'aiproject-files' AND
  (storage.foldername(name))[1] IN (
    SELECT p.id::text FROM aiproject.projects p
    JOIN aiproject.members m ON m.project_id = p.id
    WHERE m.email = (auth.jwt() ->> 'email')
    AND m.role = 'pm'
    AND m.status = 'active'
  )
);

-- ============================================
-- 輔助函數：產生 Signed URL（透過 Edge Function）
-- ============================================

-- 注意：Signed URL 需在應用層產生（前端或 Edge Function）
-- 因為 SQL 無法直接呼叫 Storage API

-- ============================================
-- 資料遷移：將現有檔案標記（可選）
-- ============================================

-- 10. 標記現有的檔案類型 Artifact（用於遷移提示）
-- 這些是在 Local Phase 以 Base64 儲存的檔案

UPDATE aiproject.artifacts
SET meta = jsonb_set(
  COALESCE(meta, '{}'::jsonb),
  '{needs_migration}',
  'true'::jsonb
)
WHERE (
  content_type LIKE 'application/%' OR 
  content_type LIKE 'image/%'
) 
AND storage_path IS NULL
AND original_content IS NOT NULL
AND original_content != '';

-- ============================================
-- 驗證查詢
-- ============================================

-- 查詢所有檔案類型的 Artifact
-- SELECT 
--   id,
--   content_type,
--   storage_path,
--   file_size,
--   CASE 
--     WHEN storage_path IS NOT NULL THEN 'Supabase Storage'
--     WHEN meta->>'needs_migration' = 'true' THEN 'Local (需遷移)'
--     ELSE 'Database'
--   END as storage_location,
--   created_at
-- FROM aiproject.artifacts
-- WHERE content_type LIKE 'application/%' OR content_type LIKE 'image/%'
-- ORDER BY created_at DESC;

-- 查詢專案儲存空間使用量
-- SELECT 
--   p.id,
--   p.name,
--   COUNT(a.id) as file_count,
--   COALESCE(SUM(a.file_size), 0) as total_bytes,
--   pg_size_pretty(COALESCE(SUM(a.file_size), 0)) as total_size
-- FROM aiproject.projects p
-- LEFT JOIN aiproject.artifacts a ON a.project_id = p.id AND a.storage_path IS NOT NULL
-- GROUP BY p.id, p.name
-- ORDER BY total_bytes DESC;

-- ============================================
-- 使用說明
-- ============================================
-- 1. 在 Supabase SQL Editor 中執行此 SQL
-- 2. 驗證：檢查 storage.buckets 是否有 'aiproject-files'
-- 3. 驗證：檢查 storage.objects 的 RLS policies 是否生效
-- 4. 前端實作：使用 supabase.storage.from('aiproject-files').upload()
-- ============================================
