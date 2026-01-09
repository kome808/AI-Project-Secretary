# 修復 Items 表 Status 約束問題

## 🔴 問題描述

如果您看到以下錯誤：

```
Error: new row for relation "items" violates check constraint "items_status_check"
Detail: Failing row contains (suggestion, ...)
```

或錯誤代碼：**23514** (違反檢查約束)

這表示資料庫中 `items` 表的 `status` 欄位 CHECK 約束不包含前端程式碼使用的所有狀態值。

---

## ✅ 快速修復方案（徹底清理版）

請在 **Supabase SQL Editor** 中執行以下 SQL 腳本：

```sql
-- ============================================
-- 徹底修復 Items 表 Status 約束
-- ============================================
-- 目的：清理所有舊約束並重建包含所有狀態值的新約束
-- ============================================

-- 步驟 1: 徹底清理所有 status 相關的 CHECK 約束
-- 這會掃描並移除所有名稱包含 'status' 的約束，防止重複約束問題
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT conname 
              FROM pg_constraint 
              WHERE conrelid = 'aiproject.items'::regclass 
              AND contype = 'c' 
              AND conname LIKE '%status%') 
    LOOP
        EXECUTE 'ALTER TABLE aiproject.items DROP CONSTRAINT ' || quote_ident(r.conname);
        RAISE NOTICE '已移除約束: %', r.conname;
    END LOOP;
END $$;

-- 步驟 2: 確保 status 欄位類型正確
ALTER TABLE aiproject.items ALTER COLUMN status TYPE TEXT;

-- 步驟 3: 重新建立包含所有狀態值的 CHECK 約束
ALTER TABLE aiproject.items 
ADD CONSTRAINT items_status_check 
CHECK (status IN (
    -- AI 建議與確認流程
    'suggestion',        -- AI 產生的建議（收件匣專用）
    'rejected',          -- 已拒絕的建議
    
    -- 通用任務狀態
    'open',              -- 開啟/待處理（任務預設狀態）
    'not_started',       -- 未開始
    'in_progress',       -- 進行中
    'blocked',           -- 受阻
    'pending',           -- 待處理/等待中
    'awaiting_response', -- 等待回應
    'done',              -- 已完成
    'completed',         -- 已完成（另一種表達）
    'archived',          -- 已歸檔
    
    -- CR 專用狀態
    'requested',         -- 已提出變更請求
    'approved',          -- 已核准
    'active'             -- 活躍中
));

-- 步驟 4: 同步更新 type 欄位的檢查約束（確保包含所有類型）
ALTER TABLE aiproject.items 
DROP CONSTRAINT IF EXISTS items_type_check;

ALTER TABLE aiproject.items 
ADD CONSTRAINT items_type_check 
CHECK (type IN (
    'action',   -- 行動項
    'pending',  -- 待回覆/待決議
    'cr',       -- 需求變更
    'decision', -- 決策
    'rule',     -- 規則
    'general'   -- 一般任務
));

-- 步驟 5: 更新預設值（建議使用 'suggestion'）
ALTER TABLE aiproject.items 
ALTER COLUMN status SET DEFAULT 'suggestion';

-- 步驟 6: 強制刷新 Schema Cache
NOTIFY pgrst, 'reload schema';

-- 完成提示
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Status 約束已徹底清理並重建！';
    RAISE NOTICE '========================================';
    RAISE NOTICE '現在支援的 status 值：';
    RAISE NOTICE '  AI 流程：suggestion, rejected';
    RAISE NOTICE '  任務狀態：open, not_started, in_progress, blocked, pending';
    RAISE NOTICE '           awaiting_response, done, completed, archived';
    RAISE NOTICE '  CR 狀態：requested, approved, active';
    RAISE NOTICE '========================================';
END $$;
```

---

## 🔍 驗證修復

執行完 SQL 後，請執行以下驗證：

### 1. 檢查約束是否正確更新

```sql
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'aiproject.items'::regclass 
  AND conname = 'items_status_check';
```

應該會看到包含所有 16 個狀態值的約束定義。

### 2. 確認沒有重複約束

```sql
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'aiproject.items'::regclass 
  AND contype = 'c';
```

應該只看到一個 `items_status_check` 約束。

### 3. 測試 AI 秘書功能

1. 返回應用程式並重新整理頁面
2. 在儀表板或收件匣的「AI秘書」區塊輸入對話
3. 確認成功建立建議卡，沒有錯誤
4. 嘗試確認建議卡，確認狀態可以正確更新

---

## 📋 完整 Status 狀態值說明

| Status 值 | 中文說明 | 使用場景 |
|-----------|---------|---------|
| **AI 建議與確認流程** |||
| `suggestion` | AI 建議 | AI 秘書產生的建議卡（收件匣） |
| `rejected` | 已拒絕 | 使用者拒絕的 AI 建議 |
| **通用任務狀態** |||
| `open` | 開啟/待處理 | 任務確認後的預設狀態 |
| `not_started` | 未開始 | 已確認但尚未開始執行的任務 |
| `in_progress` | 進行中 | 正在執行的任務 |
| `blocked` | 受阻 | 因某些原因無法繼續的任務 |
| `pending` | 待處理 | 等待處理的項目 |
| `awaiting_response` | 等待回應 | 等待他人回覆的待辦事項 |
| `done` | 已完成 | 已完成的任務（主要用） |
| `completed` | 已完成 | 已完成的任務（替代表達） |
| `archived` | 已歸檔 | 已歸檔的項目 |
| **CR 專用狀態** |||
| `requested` | 已提出 | 變更請求已提出 |
| `approved` | 已核准 | 變更請求已核准 |
| `active` | 活躍中 | 正在執行的變更 |

---

## 🎯 狀態流轉邏輯

### 收件匣（Inbox）→ 任務清單（Actions）
```
AI 產生 → suggestion
    ↓
使用者確認 → open / not_started / in_progress
    ↓
執行中 → in_progress / blocked / awaiting_response
    ↓
完成 → done / completed
    ↓
歸檔 → archived
```

### 變更請求（CR）流程
```
建立 CR → requested
    ↓
評估後 → approved / rejected
    ↓
執行中 → active
    ↓
完成 → done
```

---

## 💡 為什麼會有重複約束？

**常見原因：**
1. 多次執行 `ALTER TABLE ADD CONSTRAINT` 而沒有先檢查約束是否存在
2. Supabase 自動產生的約束名稱（如 `items_status_check1`, `items_status_check2`）
3. 手動修改表結構時遺留的舊約束

**解決方案：**
使用上方的 `DO $$` 腳本會掃描並移除所有相關約束，確保只保留一個最新的約束。

---

## ❓ 常見問題

### Q1: 執行後還是出現約束錯誤？
**A**: 
1. 確認 SQL 執行完畢沒有錯誤訊息
2. 執行驗證查詢，確認約束包含所有狀態值
3. 執行 `NOTIFY pgrst, 'reload schema';` 強制刷新快取
4. 完全關閉並重新開啟瀏覽器（清除前端快取）

### Q2: 如果我使用的不是 'aiproject' schema？
**A**: 將上方 SQL 中的所有 `aiproject` 替換為您實際使用的 Schema 名稱。

### Q3: 開發階段能否移除 CHECK 約束？
**A**: 可以！如果您還在調整狀態邏輯，可��暫時移除約束：
```sql
ALTER TABLE aiproject.items DROP CONSTRAINT IF EXISTS items_status_check;
```
等業務流程確定後再加回約束。

### Q4: 為什麼有 'done' 和 'completed' 兩個值？
**A**: 這是歷史遺留問題。前端不同模組使用了不同的表達方式，為了相容性都保留了。建議新功能統一使用 `'done'`。

---

## 📚 相關文件

- 完整建表 SQL: `/docs/SETUP_SUPABASE_TABLES.md`
- TypeScript 類型定義: `/src/lib/storage/types.ts`
- Guidelines: `/guidelines/Guidelines.md`

---

## 🎉 執行完畢

如果執行成功，您應該會看到：
- ✅ 所有舊的 status 約束已被移除
- ✅ 新的約束包含所有 16 個狀態值
- ✅ AI 秘書可以正常建立建議卡
- ✅ 建議卡確認後可以正常更新狀態
- ✅ 任務清單的看板拖曳功能正常運作