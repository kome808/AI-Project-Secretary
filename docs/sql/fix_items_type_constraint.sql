-- ============================================
-- 修正 items 表的 type 約束
-- ============================================
-- 問題：資料庫約束僅允許 4 種類型，但應用程式使用 7 種類型
-- 解決：更新約束以包含所有類型

-- 1. 移除舊的約束
ALTER TABLE aiproject.items 
DROP CONSTRAINT IF EXISTS items_type_check;

-- 2. 新增更新後的約束（包含所有 7 種類型）
ALTER TABLE aiproject.items 
ADD CONSTRAINT items_type_check 
CHECK (type IN ('general', 'pending', 'cr', 'decision', 'action', 'rule', 'todo'));

-- 3. 驗證約束
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'items_type_check';

-- 預期結果：
-- items_type_check | CHECK ((type = ANY (ARRAY['general'::text, 'pending'::text, 'cr'::text, 'decision'::text, 'action'::text, 'rule'::text, 'todo'::text])))
