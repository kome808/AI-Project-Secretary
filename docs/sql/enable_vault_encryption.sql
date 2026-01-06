-- ============================================
-- Supabase Vault 加密：API Key 安全升級腳本
-- ============================================
-- 建立日期：2024-12-23
-- 用途：將 system_ai_config.api_key 從明文改為加密儲存
-- 參考：https://supabase.com/docs/guides/database/vault
-- ============================================

-- ⚠️ 重要提醒：
-- 1. 請在測試環境先執行，確認無誤後再於正式環境執行
-- 2. 此腳本會修改表結構，請務必先備份資料
-- 3. 加密後的 API Key 無法直接透過 SQL 查詢明文，需透過應用程式解密

-- ============================================
-- 步驟 1：啟用 pgsodium 擴充（Supabase Vault 基礎）
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgsodium;

-- 驗證擴充是否成功啟用
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pgsodium'
    ) THEN
        RAISE NOTICE '✅ pgsodium 擴充已啟用';
    ELSE
        RAISE EXCEPTION '❌ pgsodium 擴充啟用失敗，請檢查 Supabase 專案設定';
    END IF;
END $$;

-- ============================================
-- 步驟 2：建立加密金鑰（儲存於 Supabase Vault）
-- ============================================

-- 檢查金鑰是否已存在
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM vault.secrets WHERE name = 'api_key_encryption_key'
    ) THEN
        -- 產生 256-bit 加密金鑰並儲存
        INSERT INTO vault.secrets (name, secret)
        VALUES ('api_key_encryption_key', encode(gen_random_bytes(32), 'base64'));
        
        RAISE NOTICE '✅ 加密金鑰已建立：api_key_encryption_key';
    ELSE
        RAISE NOTICE '⚠️ 加密金鑰已存在，跳過建立';
    END IF;
END $$;

-- ============================================
-- 步驟 3：備份現有資料
-- ============================================

-- 建立備份表（包含明文 API Key，僅供緊急復原使用）
CREATE TABLE IF NOT EXISTS aiproject.system_ai_config_backup AS 
SELECT 
    id,
    provider,
    model,
    api_key,
    api_endpoint,
    is_active,
    last_tested_at,
    test_status,
    created_at,
    updated_at,
    NOW() AS backup_at
FROM aiproject.system_ai_config;

-- 驗證備份
DO $$
DECLARE
    backup_count INT;
    original_count INT;
BEGIN
    SELECT COUNT(*) INTO backup_count FROM aiproject.system_ai_config_backup;
    SELECT COUNT(*) INTO original_count FROM aiproject.system_ai_config;
    
    IF backup_count = original_count THEN
        RAISE NOTICE '✅ 備份完成：已備份 % 筆資料', backup_count;
    ELSE
        RAISE EXCEPTION '❌ 備份失敗：備份資料筆數 (%) 與原始資料 (%) 不符', backup_count, original_count;
    END IF;
END $$;

-- ============================================
-- 步驟 4：新增加密欄位
-- ============================================

-- 新增加密欄位（暫時與明文欄位並存）
ALTER TABLE aiproject.system_ai_config 
ADD COLUMN IF NOT EXISTS api_key_encrypted BYTEA;

RAISE NOTICE '✅ 已新增加密欄位：api_key_encrypted';

-- ============================================
-- 步驟 5：將現有明文 API Key 加密並遷移
-- ============================================

-- 使用 pgsodium.crypto_secretbox 加密
UPDATE aiproject.system_ai_config
SET api_key_encrypted = pgsodium.crypto_secretbox_noncegen(
    api_key::bytea,
    (SELECT decrypted_secret FROM vault.decrypted_secrets 
     WHERE name = 'api_key_encryption_key')::bytea
)
WHERE api_key IS NOT NULL AND api_key_encrypted IS NULL;

-- 驗證加密是否成功
DO $$
DECLARE
    encrypted_count INT;
BEGIN
    SELECT COUNT(*) INTO encrypted_count 
    FROM aiproject.system_ai_config 
    WHERE api_key_encrypted IS NOT NULL;
    
    RAISE NOTICE '✅ 已加密 % 筆 API Key', encrypted_count;
END $$;

-- ============================================
-- 步驟 6：建立解密函數（供應用程式使用）
-- ============================================

CREATE OR REPLACE FUNCTION aiproject.decrypt_api_key(encrypted_key BYTEA)
RETURNS TEXT AS $$
BEGIN
    -- 使用 Vault 金鑰解密
    RETURN convert_from(
        pgsodium.crypto_secretbox_open(
            encrypted_key,
            (SELECT decrypted_secret FROM vault.decrypted_secrets 
             WHERE name = 'api_key_encryption_key')::bytea
        ),
        'UTF8'
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION '解密失敗：%', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 設定函數權限（僅允許 authenticated 使用者呼叫）
REVOKE ALL ON FUNCTION aiproject.decrypt_api_key(BYTEA) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION aiproject.decrypt_api_key(BYTEA) TO authenticated;

RAISE NOTICE '✅ 解密函數已建立：aiproject.decrypt_api_key()';

-- ============================================
-- 步驟 7：測試加密與解密
-- ============================================

DO $$
DECLARE
    test_encrypted BYTEA;
    test_decrypted TEXT;
    test_original TEXT := 'sk-test-1234567890abcdef';
BEGIN
    -- 測試加密
    test_encrypted := pgsodium.crypto_secretbox_noncegen(
        test_original::bytea,
        (SELECT decrypted_secret FROM vault.decrypted_secrets 
         WHERE name = 'api_key_encryption_key')::bytea
    );
    
    -- 測試解密
    test_decrypted := aiproject.decrypt_api_key(test_encrypted);
    
    IF test_decrypted = test_original THEN
        RAISE NOTICE '✅ 加密/解密測試成功';
    ELSE
        RAISE EXCEPTION '❌ 加密/解密測試失敗：解密結果不符';
    END IF;
END $$;

-- ============================================
-- 步驟 8：重新命名欄位（將加密欄位設為主要欄位）
-- ============================================

-- ⚠️ 警告：此步驟會刪除明文 API Key，請確認加密欄位已正確運作

-- 1. 重新命名明文欄位為 api_key_plaintext（保留一段時間以便回滾）
ALTER TABLE aiproject.system_ai_config 
RENAME COLUMN api_key TO api_key_plaintext;

-- 2. 重新命名加密欄位為 api_key
ALTER TABLE aiproject.system_ai_config 
RENAME COLUMN api_key_encrypted TO api_key;

RAISE NOTICE '✅ 欄位重新命名完成：api_key 現在為加密欄位';
RAISE NOTICE '⚠️ 明文 API Key 已重新命名為 api_key_plaintext（建議 7 天後刪除）';

-- ============================================
-- 步驟 9：更新註解
-- ============================================

COMMENT ON COLUMN aiproject.system_ai_config.api_key IS 'API Key（已使用 Supabase Vault 加密，使用 aiproject.decrypt_api_key() 解密）';
COMMENT ON COLUMN aiproject.system_ai_config.api_key_plaintext IS '【待刪除】明文 API Key（已棄用，僅供緊急回滾使用）';

-- ============================================
-- 步驟 10：建立定期清理腳本（選用）
-- ============================================

-- 此函數用於清理明文備份欄位（建議 7 天後執行）
CREATE OR REPLACE FUNCTION aiproject.cleanup_plaintext_api_keys()
RETURNS VOID AS $$
BEGIN
    -- 刪除明文備份欄位
    ALTER TABLE aiproject.system_ai_config DROP COLUMN IF EXISTS api_key_plaintext;
    
    -- 刪除備份表（如果存在且已超過 30 天）
    -- DROP TABLE IF EXISTS aiproject.system_ai_config_backup;
    
    RAISE NOTICE '✅ 明文 API Key 清理完成';
END;
$$ LANGUAGE plpgsql;

-- ⚠️ 執行此函數前，請確認系統運作正常至少 7 天
-- SELECT aiproject.cleanup_plaintext_api_keys();

-- ============================================
-- 完成提示
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE '✅ Supabase Vault 加密升級完成！';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '';
    RAISE NOTICE '後續步驟：';
    RAISE NOTICE '1. 修改應用程式碼，使用 aiproject.decrypt_api_key() 解密';
    RAISE NOTICE '2. 測試 AI 連線功能是否正常運作';
    RAISE NOTICE '3. 確認無誤後，7 天後執行清理：';
    RAISE NOTICE '   SELECT aiproject.cleanup_plaintext_api_keys();';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ 重要提醒：';
    RAISE NOTICE '- 備份表已建立：aiproject.system_ai_config_backup';
    RAISE NOTICE '- 明文欄位已重新命名：api_key_plaintext';
    RAISE NOTICE '- 如需回滾，請聯繫系統管理員';
    RAISE NOTICE '==========================================';
END $$;

-- ============================================
-- 使用範例
-- ============================================

-- 查詢加密後的 API Key（顯示為亂碼）
-- SELECT id, provider, model, api_key FROM aiproject.system_ai_config;

-- 解密 API Key（僅供應用程式後端使用）
-- SELECT id, provider, model, aiproject.decrypt_api_key(api_key) AS decrypted_key
-- FROM aiproject.system_ai_config;

-- ============================================
-- 回滾腳本（緊急情況使用）
-- ============================================

-- 如需回滾到明文儲存：
-- ALTER TABLE aiproject.system_ai_config RENAME COLUMN api_key TO api_key_encrypted;
-- ALTER TABLE aiproject.system_ai_config RENAME COLUMN api_key_plaintext TO api_key;
-- RAISE NOTICE '⚠️ 已回滾到明文儲存模式';
