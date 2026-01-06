-- ============================================
-- AI 秘書對話功能 - Conversations Schema
-- ============================================
-- 建立日期：2024-12-23
-- 用途：儲存使用者與 AI 秘書的對話歷史
-- Schema 名稱：aiproject
-- ============================================

-- 1. 建立 conversations 表（對話會話）
CREATE TABLE IF NOT EXISTS aiproject.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES aiproject.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    title TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 建立 messages 表（對話訊息）
CREATE TABLE IF NOT EXISTS aiproject.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES aiproject.conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    intent TEXT CHECK (intent IN ('CREATE', 'QUERY', 'UPDATE', 'RELATE', 'CLARIFY')),
    confidence DECIMAL(3,2),
    citations JSONB,
    meta JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. 建立索引
CREATE INDEX idx_conversations_project ON aiproject.conversations(project_id);
CREATE INDEX idx_conversations_user ON aiproject.conversations(user_id);
CREATE INDEX idx_conversations_status ON aiproject.conversations(status);
CREATE INDEX idx_conversations_updated ON aiproject.conversations(updated_at DESC);

CREATE INDEX idx_messages_conversation ON aiproject.messages(conversation_id);
CREATE INDEX idx_messages_role ON aiproject.messages(role);
CREATE INDEX idx_messages_created ON aiproject.messages(created_at);

-- 4. 建立更新時間自動觸發器
CREATE OR REPLACE FUNCTION aiproject.update_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversations_updated_at
BEFORE UPDATE ON aiproject.conversations
FOR EACH ROW
EXECUTE FUNCTION aiproject.update_conversations_updated_at();

-- 5. 建立自動更新 conversation.updated_at 的觸發器（當新增 message 時）
CREATE OR REPLACE FUNCTION aiproject.update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE aiproject.conversations
    SET updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_on_message
AFTER INSERT ON aiproject.messages
FOR EACH ROW
EXECUTE FUNCTION aiproject.update_conversation_on_message();

-- 6. 註解說明
COMMENT ON TABLE aiproject.conversations IS 'AI 秘書對話會話記錄';
COMMENT ON COLUMN aiproject.conversations.project_id IS '所屬專案 ID';
COMMENT ON COLUMN aiproject.conversations.user_id IS '發起使用者 ID（對應 auth.users）';
COMMENT ON COLUMN aiproject.conversations.title IS '對話標題（自動產生或使用者命名）';
COMMENT ON COLUMN aiproject.conversations.status IS '會話狀態：active（進行中）/ archived（已封存）';
COMMENT ON COLUMN aiproject.conversations.updated_at IS '最後訊息時間（自動更新）';

COMMENT ON TABLE aiproject.messages IS 'AI 對話訊息記錄';
COMMENT ON COLUMN aiproject.messages.conversation_id IS '所屬對話會話 ID';
COMMENT ON COLUMN aiproject.messages.role IS '訊息角色：user（使用者）/ assistant（AI）/ system（系統）';
COMMENT ON COLUMN aiproject.messages.content IS '訊息內容（最多 10000 字）';
COMMENT ON COLUMN aiproject.messages.intent IS 'AI 判斷的意圖類型（僅 assistant 訊息）';
COMMENT ON COLUMN aiproject.messages.confidence IS '意圖信心分數 0-1（僅 assistant 訊息）';
COMMENT ON COLUMN aiproject.messages.citations IS '引用來源列表 JSON [{artifact_id, item_id, text}]';
COMMENT ON COLUMN aiproject.messages.meta IS '額外資訊（建議卡 IDs、搜尋結果等）';

-- ============================================
-- Row Level Security (RLS) 政策
-- ============================================

-- 7. 啟用 RLS
ALTER TABLE aiproject.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE aiproject.messages ENABLE ROW LEVEL SECURITY;

-- 8. Conversations 政策

-- 政策：使用者可查看自己的對話
CREATE POLICY "Users can view own conversations"
ON aiproject.conversations
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 政策：PM 可查看專案內所有對話（稽核用途）
CREATE POLICY "PM can view project conversations"
ON aiproject.conversations
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM aiproject.members
        WHERE members.project_id = conversations.project_id
        AND members.email = auth.jwt() ->> 'email'
        AND members.role = 'pm'
        AND members.status = 'active'
    )
);

-- 政策：使用者可建立對話
CREATE POLICY "Users can create conversations"
ON aiproject.conversations
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 政策：使用者可更新自己的對話
CREATE POLICY "Users can update own conversations"
ON aiproject.conversations
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 政策：使用者可刪除自己的對話
CREATE POLICY "Users can delete own conversations"
ON aiproject.conversations
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- 9. Messages 政策

-- 政策：使用者可查看自己對話的訊息
CREATE POLICY "Users can view own messages"
ON aiproject.messages
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM aiproject.conversations
        WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
);

-- 政策：PM 可查看專案內所有訊息
CREATE POLICY "PM can view project messages"
ON aiproject.messages
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM aiproject.conversations c
        JOIN aiproject.members m ON m.project_id = c.project_id
        WHERE c.id = messages.conversation_id
        AND m.email = auth.jwt() ->> 'email'
        AND m.role = 'pm'
        AND m.status = 'active'
    )
);

-- 政策：使用者可新增訊息到自己的對話
CREATE POLICY "Users can create messages in own conversations"
ON aiproject.messages
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM aiproject.conversations
        WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
);

-- ============================================
-- 測試資料（可選）
-- ============================================

-- 注意：請先確保有專案資料，再執行測試資料插入

-- INSERT INTO aiproject.conversations (
--     project_id,
--     user_id,
--     title,
--     status
-- ) VALUES (
--     '你的專案ID',
--     auth.uid(),
--     '查詢登入方式決議',
--     'active'
-- );

-- ============================================
-- 使用說明
-- ============================================
-- 1. 在 Supabase SQL Editor 中執行此 SQL
-- 2. 驗證：執行 SELECT * FROM aiproject.conversations;
-- 3. 確認 RLS 政策生效：以一般使用者身分查詢，應只能看到自己的對話
-- ============================================
