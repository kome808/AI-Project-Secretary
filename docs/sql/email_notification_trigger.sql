-- ============================================
-- 郵件通知觸發器 SQL 腳本
-- ============================================
-- 建立日期：2026-01-10
-- 用途：當任務指派或內容變更時，呼叫 Edge Function 發送郵件
-- ============================================

-- ⚠️ 請先執行以下步驟：
-- 1. 部署 send-notification Edge Function
-- 2. 設定 Secrets: GMAIL_USER, GMAIL_APP_PASSWORD
-- 3. 將下方 YOUR_PROJECT_ID 替換為實際專案 ID

-- ============================================
-- Step 1: 啟用 pg_net 擴展
-- ============================================
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================
-- Step 2: 建立通知函數
-- ============================================
CREATE OR REPLACE FUNCTION aiproject.notify_task_change()
RETURNS TRIGGER AS $$
DECLARE
  assignee_email TEXT;
  project_name TEXT;
  edge_function_url TEXT;
  email_subject TEXT;
  email_body TEXT;
  supabase_anon_key TEXT;
BEGIN
  -- 📌 請替換為您的 Supabase 專案 ID
  edge_function_url := 'https://kaeghmhaxcmxakncxzvl.supabase.co/functions/v1/send-notification';
  
  -- 📌 請替換為您的 Supabase Anon Key（用於驗證）
  supabase_anon_key := current_setting('app.settings.supabase_anon_key', true);

  -- 取得專案名稱
  SELECT name INTO project_name 
  FROM aiproject.projects 
  WHERE id = NEW.project_id;

  -- ========================================
  -- 情況 1：新任務且有負責人
  -- ========================================
  IF (TG_OP = 'INSERT' AND NEW.assignee_id IS NOT NULL) THEN
    -- 從 members 表取得負責人 email
    SELECT email INTO assignee_email 
    FROM aiproject.members 
    WHERE id::text = NEW.assignee_id OR email = NEW.assignee_id;
    
    IF assignee_email IS NOT NULL THEN
      email_subject := '[' || COALESCE(project_name, '專案') || '] 您有新任務';
      email_body := '<!DOCTYPE html><html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">'
        || '<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0;">'
        || '<h2 style="color: white; margin: 0;">📋 新任務通知</h2></div>'
        || '<div style="border: 1px solid #e0e0e0; border-top: none; padding: 20px; border-radius: 0 0 10px 10px;">'
        || '<p><strong>任務：</strong>' || NEW.title || '</p>'
        || '<p><strong>說明：</strong>' || COALESCE(LEFT(NEW.description, 200), '無') || '</p>'
        || '<p><strong>期限：</strong>' || COALESCE(TO_CHAR(NEW.due_date, 'YYYY-MM-DD'), '未設定') || '</p>'
        || '<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">'
        || '<p style="color: #888; font-size: 12px;">此郵件由 AI 專案秘書自動發送</p>'
        || '</div></body></html>';
      
      PERFORM net.http_post(
        url := edge_function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || COALESCE(supabase_anon_key, '')
        ),
        body := jsonb_build_object(
          'to', assignee_email,
          'subject', email_subject,
          'html', email_body
        )
      );
      
      RAISE NOTICE '📧 Sent new task notification to %', assignee_email;
    END IF;
  END IF;

  -- ========================================
  -- 情況 2：負責人變更
  -- ========================================
  IF (TG_OP = 'UPDATE' AND OLD.assignee_id IS DISTINCT FROM NEW.assignee_id AND NEW.assignee_id IS NOT NULL) THEN
    SELECT email INTO assignee_email 
    FROM aiproject.members 
    WHERE id::text = NEW.assignee_id OR email = NEW.assignee_id;
    
    IF assignee_email IS NOT NULL THEN
      email_subject := '[' || COALESCE(project_name, '專案') || '] 您被指派了任務';
      email_body := '<!DOCTYPE html><html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">'
        || '<div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 10px 10px 0 0;">'
        || '<h2 style="color: white; margin: 0;">📌 任務指派通知</h2></div>'
        || '<div style="border: 1px solid #e0e0e0; border-top: none; padding: 20px; border-radius: 0 0 10px 10px;">'
        || '<p><strong>任務：</strong>' || NEW.title || '</p>'
        || '<p><strong>期限：</strong>' || COALESCE(TO_CHAR(NEW.due_date, 'YYYY-MM-DD'), '未設定') || '</p>'
        || '<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">'
        || '<p style="color: #888; font-size: 12px;">此郵件由 AI 專案秘書自動發送</p>'
        || '</div></body></html>';
      
      PERFORM net.http_post(
        url := edge_function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || COALESCE(supabase_anon_key, '')
        ),
        body := jsonb_build_object(
          'to', assignee_email,
          'subject', email_subject,
          'html', email_body
        )
      );
      
      RAISE NOTICE '📧 Sent assignment notification to %', assignee_email;
    END IF;
  END IF;

  -- ========================================
  -- 情況 3：內容/期限變更（通知負責人）
  -- ========================================
  IF (TG_OP = 'UPDATE' AND NEW.assignee_id IS NOT NULL AND 
      OLD.assignee_id IS NOT DISTINCT FROM NEW.assignee_id AND
      (OLD.title IS DISTINCT FROM NEW.title OR 
       OLD.description IS DISTINCT FROM NEW.description OR
       OLD.due_date IS DISTINCT FROM NEW.due_date)) THEN
    
    SELECT email INTO assignee_email 
    FROM aiproject.members 
    WHERE id::text = NEW.assignee_id OR email = NEW.assignee_id;
    
    IF assignee_email IS NOT NULL THEN
      email_subject := '[' || COALESCE(project_name, '專案') || '] 任務內容已更新';
      email_body := '<!DOCTYPE html><html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">'
        || '<div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 10px 10px 0 0;">'
        || '<h2 style="color: white; margin: 0;">🔄 任務更新通知</h2></div>'
        || '<div style="border: 1px solid #e0e0e0; border-top: none; padding: 20px; border-radius: 0 0 10px 10px;">'
        || '<p><strong>任務：</strong>' || NEW.title || '</p>'
        || '<p>任務內容已被更新，請查看最新資訊。</p>'
        || '<p><strong>新期限：</strong>' || COALESCE(TO_CHAR(NEW.due_date, 'YYYY-MM-DD'), '未設定') || '</p>'
        || '<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">'
        || '<p style="color: #888; font-size: 12px;">此郵件由 AI 專案秘書自動發送</p>'
        || '</div></body></html>';
      
      PERFORM net.http_post(
        url := edge_function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || COALESCE(supabase_anon_key, '')
        ),
        body := jsonb_build_object(
          'to', assignee_email,
          'subject', email_subject,
          'html', email_body
        )
      );
      
      RAISE NOTICE '📧 Sent update notification to %', assignee_email;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Step 3: 建立觸發器
-- ============================================
DROP TRIGGER IF EXISTS trigger_notify_task_change ON aiproject.items;

CREATE TRIGGER trigger_notify_task_change
AFTER INSERT OR UPDATE ON aiproject.items
FOR EACH ROW
EXECUTE FUNCTION aiproject.notify_task_change();

-- ============================================
-- 完成訊息
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════';
    RAISE NOTICE '✅ 郵件通知觸發器建立完成！';
    RAISE NOTICE '═══════════════════════════════════════════';
    RAISE NOTICE '觸發條件：';
    RAISE NOTICE '  - 新任務指派負責人 → 通知負責人';
    RAISE NOTICE '  - 負責人變更 → 通知新負責人';
    RAISE NOTICE '  - 內容/期限變更 → 通知負責人';
    RAISE NOTICE '═══════════════════════════════════════════';
END $$;
