-- ============================================
-- 精簡版觸發器（只傳資料，Edge Function 處理模板）
-- ============================================

DROP TRIGGER IF EXISTS trigger_notify_task_change ON aiproject.items;
DROP FUNCTION IF EXISTS aiproject.notify_task_change();

CREATE OR REPLACE FUNCTION aiproject.notify_task_change()
RETURNS TRIGGER AS $$
DECLARE
  assignee_email TEXT;
  project_name TEXT;
  edge_function_url TEXT;
  task_url TEXT;
  due_text TEXT;
  email_type TEXT;
  json_payload TEXT;
BEGIN
  edge_function_url := 'https://kaeghmhaxcmxakncxzvl.supabase.co/functions/v1/send-notification';

  SELECT name INTO project_name FROM aiproject.projects WHERE id = NEW.project_id;
  task_url := 'https://ai-project-secretary.vercel.app/#/app/features/' || NEW.id;
  due_text := COALESCE(TO_CHAR(NEW.due_date, 'YYYY-MM-DD'), 'Not set');

  -- 判斷通知類型
  IF (TG_OP = 'INSERT' AND NEW.assignee_id IS NOT NULL) THEN
    email_type := 'new_task';
  ELSIF (TG_OP = 'UPDATE' AND OLD.assignee_id IS DISTINCT FROM NEW.assignee_id AND NEW.assignee_id IS NOT NULL) THEN
    email_type := 'task_assigned';
  ELSIF (TG_OP = 'UPDATE' AND NEW.assignee_id IS NOT NULL AND OLD.assignee_id IS NOT DISTINCT FROM NEW.assignee_id AND
         (OLD.title IS DISTINCT FROM NEW.title OR OLD.due_date IS DISTINCT FROM NEW.due_date)) THEN
    email_type := 'task_updated';
  ELSE
    RETURN NEW;
  END IF;

  -- 取得負責人 email
  SELECT email INTO assignee_email 
  FROM aiproject.members 
  WHERE id::text = NEW.assignee_id OR email = NEW.assignee_id;

  IF assignee_email IS NULL THEN
    RETURN NEW;
  END IF;

  -- 只傳遞資料，不傳遞中文模板
  json_payload := '{"to":"' || assignee_email 
    || '","type":"' || email_type 
    || '","project":"' || COALESCE(project_name, 'Project') 
    || '","title":"' || replace(NEW.title, '"', '''') 
    || '","due":"' || due_text 
    || '","url":"' || task_url || '"}';
  
  PERFORM net.http_post(
    url := edge_function_url,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := json_payload::jsonb
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_task_change
AFTER INSERT OR UPDATE ON aiproject.items
FOR EACH ROW
EXECUTE FUNCTION aiproject.notify_task_change();

SELECT 'Trigger updated - data only, template in Edge Function' as result;
