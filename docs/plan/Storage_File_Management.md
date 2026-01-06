# 文件庫檔案儲存架構規劃

## 1. 目標
將文件庫的檔案（圖片、PDF、Word、Excel 等）改用 Supabase Storage 儲存，而非存放在資料庫的 `original_content` 欄位中。

## 2. 儲存架構設計

### 2.1 Bucket 結構
- **Bucket 名稱**：`aiproject-files`
- **Bucket 設定**：Private（需透過 signed URL 存取）
- **路徑結構**：
  ```
  aiproject-files/
  ├── {project_id}/
  │   ├── {artifact_id}/
  │   │   ├── original_filename.pdf
  │   │   ├── image.png
  │   │   └── document.docx
  ```

### 2.2 為什麼用 project_id 分類？
- ✅ **隔離性**：不同專案的檔案完全分開
- ✅ **安全性**：可透過 RLS 限制專案成員只能存取自己專案的檔案
- ✅ **管理性**：刪除專案時可批次清除該專案所有檔案
- ✅ **擴展性**：未來可設定專案配額（儲存空間限制）

### 2.3 檔案類型分類

| 類型 | 儲存位置 | 說明 |
|------|---------|------|
| **純文字** | 資料庫 `original_content` | 會議記錄、LINE 訊息等，直接存 DB |
| **對話記錄** | 資料庫 `original_content` | AI 對話、聊天紀錄，直接存 DB |
| **連結** | 資料庫 `original_content` | URL 連結，直接存 DB |
| **檔案** | Supabase Storage | PDF、Word、Excel 等文件 |
| **圖檔** | Supabase Storage | PNG、JPG、GIF 等圖片 |

---

## 3. 資料庫 Schema 調整

### 3.1 Artifact 表格欄位

```sql
-- 新增欄位
ALTER TABLE aiproject.artifacts 
ADD COLUMN storage_path TEXT,           -- Storage 路徑 (e.g., "project_id/artifact_id/file.pdf")
ADD COLUMN file_url TEXT,               -- Signed URL (有時效性，需定期更新)
ADD COLUMN file_size BIGINT,            -- 檔案大小 (bytes)
ADD COLUMN file_hash TEXT;              -- 檔案 hash (用於去重與驗證)

-- 欄位說明
COMMENT ON COLUMN aiproject.artifacts.storage_path IS 'Supabase Storage 路徑（僅檔案與圖片）';
COMMENT ON COLUMN aiproject.artifacts.file_url IS 'Signed URL（暫存，有效期 1 小時）';
COMMENT ON COLUMN aiproject.artifacts.file_size IS '檔案大小（bytes）';
COMMENT ON COLUMN aiproject.artifacts.file_hash IS '檔案 SHA-256 hash（用於去重）';
```

### 3.2 欄位使用規則

| content_type | original_content | storage_path | 說明 |
|--------------|------------------|--------------|------|
| `text/plain` | ✅ 文字內容 | ❌ NULL | 純文字直接存 DB |
| `text/conversation` | ✅ 對話內容 | ❌ NULL | 對話記錄存 DB |
| `text/uri-list` | ✅ URL | ❌ NULL | 連結存 DB |
| `application/pdf` | ❌ 空字串或 NULL | ✅ Storage 路徑 | 檔案存 Storage |
| `image/png` | ❌ 空字串或 NULL | ✅ Storage 路徑 | 圖片存 Storage |

---

## 4. 上傳流程設計

### 4.1 檔案上傳 (Frontend → Storage)

```typescript
// Step 1: 使用者選擇檔案
const file = event.target.files[0];

// Step 2: 計算檔案 hash (可選，用於去重)
const hash = await calculateFileHash(file);

// Step 3: 產生 artifact_id (UUID)
const artifactId = crypto.randomUUID();

// Step 4: 上傳到 Supabase Storage
const storagePath = `${projectId}/${artifactId}/${file.name}`;
const { data, error } = await supabase.storage
  .from('aiproject-files')
  .upload(storagePath, file, {
    cacheControl: '3600',
    upsert: false
  });

// Step 5: 取得 signed URL (1 小時有效)
const { data: urlData } = await supabase.storage
  .from('aiproject-files')
  .createSignedUrl(storagePath, 3600);

// Step 6: 建立 Artifact 記錄
await storage.createArtifact({
  id: artifactId,
  project_id: projectId,
  content_type: file.type,
  original_content: '', // 檔案不存 DB
  storage_path: storagePath,
  file_url: urlData.signedUrl,
  meta: {
    file_name: file.name,
    file_size: file.size,
    file_hash: hash,
    uploader_id: userId,
    channel: 'upload'
  }
});
```

### 4.2 檔案下載/預覽 (Frontend)

```typescript
// Step 1: 取得 Artifact
const artifact = await storage.getArtifactById(artifactId);

// Step 2: 檢查 signed URL 是否過期
if (!artifact.file_url || isUrlExpired(artifact.file_url)) {
  // Step 3: 重新產生 signed URL
  const { data } = await supabase.storage
    .from('aiproject-files')
    .createSignedUrl(artifact.storage_path, 3600);
  
  // Step 4: 更新 Artifact (可選，減少重複請求)
  await storage.updateArtifact(artifactId, {
    file_url: data.signedUrl
  });
  
  artifact.file_url = data.signedUrl;
}

// Step 5: 使用 signed URL 顯示或下載
window.open(artifact.file_url, '_blank');
```

---

## 5. RLS 權限設定

### 5.1 Storage Bucket Policy

```sql
-- 建立 Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('aiproject-files', 'aiproject-files', false);

-- 政策：專案成員可上傳到自己的專案資料夾
CREATE POLICY "Project members can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'aiproject-files' AND
  (storage.foldername(name))[1] IN (
    SELECT p.id::text FROM aiproject.projects p
    JOIN aiproject.members m ON m.project_id = p.id
    WHERE m.email = auth.jwt() ->> 'email'
    AND m.status = 'active'
  )
);

-- 政策：專案成員可讀取自己專案的檔案
CREATE POLICY "Project members can read files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'aiproject-files' AND
  (storage.foldername(name))[1] IN (
    SELECT p.id::text FROM aiproject.projects p
    JOIN aiproject.members m ON m.project_id = p.id
    WHERE m.email = auth.jwt() ->> 'email'
    AND m.status = 'active'
  )
);

-- 政策：專案 PM 可刪除專案檔案
CREATE POLICY "Project PM can delete files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'aiproject-files' AND
  (storage.foldername(name))[1] IN (
    SELECT p.id::text FROM aiproject.projects p
    JOIN aiproject.members m ON m.project_id = p.id
    WHERE m.email = auth.jwt() ->> 'email'
    AND m.role = 'pm'
    AND m.status = 'active'
  )
);
```

---

## 6. Local Phase 處理

### 6.1 Local Adapter 策略

**問題**：Local Phase 沒有 Supabase Storage，檔案要存哪裡？

**解決方案**：
- **純文字/對話/連結**：繼續存 localStorage（與目前一致）
- **檔案/圖片**：
  - 轉換為 Base64 Data URL
  - 儲存在 `original_content` 欄位（僅限 Local Phase）
  - 切換到 Supabase 時提示使用者：「本地檔案需重新上傳」

**提示訊息**：
```
⚠️ 注意：本地模式下的檔案將以 Base64 格式暫存。
   切換到 Supabase 後，請重新上傳檔案以使用完整儲存功能。
```

### 6.2 Local → Supabase 遷移

使用者切換到 Supabase 時：
1. 系統偵測到 Local Phase 的檔案 Artifact (content_type 為 application/* 或 image/*)
2. 顯示提示：「發現 X 個本地檔案，是否要上傳到 Supabase Storage？」
3. 使用者確認後，批次上傳並更新 Artifact 記錄

---

## 7. UI/UX 調整

### 7.1 CreateSourceDialog（上傳對話框）

**變更**：
- ✅ 新增檔案選擇器（支援拖放）
- ✅ 檔案類型限制：PDF、Word、Excel、圖片（可設定）
- ✅ 檔案大小限制：50MB（可調整）
- ✅ 上傳進度條
- ✅ 上傳成功後顯示預覽

**範例 UI**：
```
┌─────────────────────────────────────────┐
│ 匯入文件                        [X]      │
├─────────────────────────────────────────┤
│                                         │
│ 類型：                                   │
│ ○ 文字/對話  ● 檔案上傳  ○ 連結          │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │  拖放檔案到這裡，或點擊選擇           │ │
│ │  📎 支援：PDF, Word, Excel, 圖片     │ │
│ │  📊 大小限制：50MB                   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 已選擇：report.pdf (2.5 MB)             │
│ ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░ 50%              │
│                                         │
│              [取消]  [上傳]             │
└─────────────────────────────────────────┘
```

### 7.2 SourceCard（檔案卡片）

**變更**：
- ✅ 顯示檔案圖示（PDF、Word、Excel、圖片）
- ✅ 顯示檔案大小（例如：2.5 MB）
- ✅ 圖片顯示縮圖預覽
- ✅ 點擊下載或預覽

### 7.3 SourceDetailPanel（詳情面板）

**變更**：
- ✅ 檔案預覽（圖片直接顯示）
- ✅ 下載按鈕
- ✅ 檔案資訊：大小、上傳時間、上傳者
- ✅ 引用列表（與現有一致）

---

## 8. 錯誤處理

### 8.1 上傳失敗

| 錯誤類型 | 處理方式 |
|---------|---------|
| 檔案過大 | 提示：「檔案超過 50MB 限制，請壓縮後再上傳」 |
| 格式不支援 | 提示：「不支援的檔案格式，請上傳 PDF、Word、Excel 或圖片」 |
| 網路錯誤 | 提示：「上傳失敗，請檢查網路連線後重試」 |
| 配額已滿 | 提示：「專案儲存空間已滿，請聯繫管理員」 |

### 8.2 下載/預覽失敗

| 錯誤類型 | 處理方式 |
|---------|---------|
| URL 過期 | 自動重新產生 signed URL |
| 檔案不存在 | 提示：「檔案已被刪除或移動」 |
| 權限不足 | 提示：「您沒有權限存取此檔案」 |

---

## 9. 實作步驟

### Phase 1：Schema & Storage 設定
- [ ] 執行 SQL：新增 Artifact 欄位
- [ ] 建立 Supabase Storage Bucket
- [ ] 設定 RLS 政策

### Phase 2：Adapter 擴充
- [ ] LocalAdapter：支援 Base64 檔案暫存
- [ ] SupabaseAdapter：新增檔案上傳/下載方法
- [ ] StorageAdapter 介面：新增 `uploadFile()`, `getFileUrl()` 方法

### Phase 3：UI 元件更新
- [ ] CreateSourceDialog：檔案上傳功能
- [ ] SourceCard：檔案預覽與大小顯示
- [ ] SourceDetailPanel：檔案下載與完整資訊

### Phase 4：測試與優化
- [ ] 測試檔案上傳/下載
- [ ] 測試 RLS 權限
- [ ] 測試 Local → Supabase 遷移
- [ ] 效能優化（signed URL 快取）

---

## 10. 配額管理（未來功能）

### 10.1 專案儲存配額
- 設定每個專案的儲存空間上限（例如：1GB）
- 儀表板顯示已使用空間百分比
- 超過配額時禁止上傳

### 10.2 全系統配額
- 管理員可查看全系統儲存使用量
- 設定全域上限（例如：100GB）

---

**文件版本**：V1.0  
**建立日期**：2024-12-23  
**狀態**：待實作
