# WBS 樹狀結構建立流程說明

> 本文件說明從上傳 WBS 圖檔到確認入庫，系統如何建立並保持完整的樹狀階層結構。

---

## 📊 整體流程圖

```
1. 上傳 WBS 圖檔
   ↓
2. AI 解析（Vision API）
   ↓
3. 產生建議卡（帶有 parent_id 和 level）
   ↓
4. 收件匣確認
   ↓
5. 任務清單顯示（樹狀結構）
```

---

## 1️⃣ 上傳 WBS 圖檔（DashboardPage.tsx）

### 1.1 觸發位置
- **頁面**：儀表板（Dashboard）
- **元件**：AI 秘書輸入框 → 檔案上傳按鈕
- **支援格式**：圖片（PNG, JPG）、PDF、Excel、Word

### 1.2 處理流程

```typescript
// 步驟 1: 上傳檔案到 Supabase Storage
const uploadRes = await storage.uploadFile(projectId, file);

// 步驟 2: 建立 Artifact（證據來源）
const artifactRes = await storage.createArtifact({
  project_id: projectId,
  content_type: file.type,
  storage_path: uploadRes.data.storagePath,
  file_url: uploadRes.data.fileUrl,
  meta: { channel: 'upload', is_temporary: true }
});
```

---

## 2️⃣ AI 解析 WBS 圖檔（AIService.ts）

### 2.1 Vision API 呼叫

```typescript
// 將圖片轉為 Base64
const base64Data = await convertToBase64(file);

// 呼叫 Vision API
const aiResult = await aiService.analyzeDocumentForTasks(
  { type: 'image', content: base64Data },
  projectId
);
```

### 2.2 AI 回應格式

AI 會根據 `WBS_PARSER_PROMPT` 回傳以下 JSON 格式：

```json
{
  "project_title": "國美館網站改版專案",
  "tasks": [
    {
      "id": "temp-1",  // 🔥 臨時 ID，供子任務引用
      "title": "第一階段（駐點）",
      "description": "專案第一階段的整體工作",
      "type": "action",
      "priority": "high",
      "parent_id": null,  // 🔥 第一層，沒有父任務
      "level": 1,  // 🔥 層級 = 1
      "meta": {
        "wbs_code": "1",
        "estimated_days": 30
      }
    },
    {
      "id": "temp-2",
      "title": "需求訪談",
      "description": "與館方進行需求討論",
      "type": "action",
      "priority": "high",
      "due_date": "2025-11-27",
      "parent_id": "temp-1",  // 🔥 指向父任務的臨時 ID
      "level": 2,  // 🔥 層級 = 2
      "meta": {
        "wbs_code": "1.1",
        "estimated_days": 3
      }
    },
    {
      "id": "temp-3",
      "title": "需求規格書撰寫",
      "type": "action",
      "parent_id": "temp-1",  // 🔥 同樣指向 temp-1
      "level": 2,
      "meta": { "wbs_code": "1.2" }
    },
    {
      "id": "temp-4",
      "title": "第二階段（系統開發計畫書）",
      "type": "action",
      "parent_id": null,  // 🔥 第一層
      "level": 1,
      "meta": { "wbs_code": "2" }
    },
    {
      "id": "temp-5",
      "title": "系統架構設計",
      "type": "action",
      "parent_id": "temp-4",  // 🔥 指向第二階段
      "level": 2,
      "meta": { "wbs_code": "2.1" }
    }
  ],
  "reasoning": "從 WBS 圖中識別出 2 個階段（第一層），共 3 個具體任務（第二層）"
}
```

### 2.3 關鍵欄位說明

| 欄位 | 說明 | 範例 |
|------|------|------|
| `id` | 臨時 ID（AI 產生） | `temp-1`, `temp-2` |
| `parent_id` | 父任務的臨時 ID | `temp-1`（指向階段） |
| `level` | 層級（1=階段, 2=任務, 3=子任務） | `1`, `2`, `3` |
| `meta.wbs_code` | WBS 編號 | `1.1`, `1.2`, `2.1` |

---

## 3️⃣ 產生建議卡（DashboardPage.tsx）

### 3.1 ID 映射表機制

```typescript
// 🔥 建立映射表：AI 臨時 ID → 實際 DB ID
const idMapping = new Map<string, string>();

// 🔥 依照 level 排序，確保父任務先建立
const sortedItems = [...items].sort((a, b) => {
  const levelA = a.meta?.level || 1;
  const levelB = b.meta?.level || 1;
  return levelA - levelB;
});

// 🔥 按順序建立任務
for (const item of sortedItems) {
  // 如果有父任務，從映射表取得實際 DB ID
  let finalParentId = undefined;
  if (item.parent_id && idMapping.has(item.parent_id)) {
    finalParentId = idMapping.get(item.parent_id);
  }
  
  // 建立任務
  const itemRes = await storage.createItem({
    project_id: projectId,
    type: item.type || 'action',
    status: 'suggestion',  // 🔥 建議卡狀態
    title: item.title,
    parent_id: finalParentId,  // 🔥 設定父任務 ID
    meta: {
      level: item.meta?.level || 1,  // 🔥 儲存層級
      wbs_code: item.meta?.wbs_code
    }
  });
  
  // 🔥 記錄映射關係：AI 臨時 ID → 實際 DB ID
  if (item.id && itemRes.data) {
    idMapping.set(item.id, itemRes.data.id);
  }
}
```

### 3.2 建立結果

建立完成後，資料庫中的任務結構：

| id (DB) | title | parent_id | level | status |
|---------|-------|-----------|-------|--------|
| uuid-1 | 第一階段（駐點） | null | 1 | suggestion |
| uuid-2 | 需求訪談 | uuid-1 | 2 | suggestion |
| uuid-3 | 需求規格書撰寫 | uuid-1 | 2 | suggestion |
| uuid-4 | 第二階段（系統開發計畫書） | null | 1 | suggestion |
| uuid-5 | 系統架構設計 | uuid-4 | 2 | suggestion |

✅ **parent_id 已經正確指向實際的資料庫 ID**

---

## 4️⃣ 收件匣確認（InboxPage.tsx）

### 4.1 單筆確認

```typescript
const handleConfirm = async (item: Item) => {
  // 將狀態從 'suggestion' 改為 'not_started'
  await storage.updateItem(item.id, {
    status: 'not_started'
  });
  
  // ✅ parent_id 和 level 保持不變，樹狀結構維持
};
```

### 4.2 批次確認（重要！）

```typescript
const handleBatchConfirm = async () => {
  const selectedItems = items.filter(i => selectedIds.includes(i.id));
  
  // 🔥 依照 level 排序，確保父任務先確認
  const sortedItems = [...selectedItems].sort((a, b) => {
    const levelA = a.meta?.level || 1;
    const levelB = b.meta?.level || 1;
    return levelA - levelB;
  });
  
  // 🔥 按順序確認每一筆
  for (const item of sortedItems) {
    await storage.updateItem(item.id, {
      status: 'not_started',
      parent_id: item.parent_id,  // 🔥 保持父子關聯
      meta: { ...item.meta }  // 🔥 保留 level 等資訊
    });
  }
};
```

### 4.3 為什麼要按層級排序？

**原因**：雖然 `updateItem` 不會改變 `parent_id`，但依層級順序處理可以：
1. 確保邏輯一致性（父任務先確認，子任務後確認）
2. 避免未來可能的外鍵約束問題
3. Console 日誌更清晰易讀

---

## 5️⃣ 任務清單顯示（TasksPage.tsx）

### 5.1 資料查詢

```typescript
// 查詢所有已確認的任務（排除建議卡）
const { data: items } = await storage.getItems(projectId);
const confirmedItems = items.filter(item => item.status !== 'suggestion');
```

### 5.2 專案工作視圖（ProjectWorkView.tsx）

專案工作視圖會自動識別 WBS 結構並顯示樹狀層級：

```typescript
// 🔥 識別 WBS 樹狀結構的任務
// WBS 任務特徵：有 parent_id 或 meta.level
const wbsItems = uncategorizedItems.filter(item => 
  item.parent_id || item.meta?.level
);

// 🔥 取得 WBS 根任務（第一層）
const wbsRootItems = wbsItems.filter(item => !item.parent_id);

// 🔥 真正的未分類任務（非 WBS 結構）
const trulyUncategorizedItems = uncategorizedItems.filter(item => 
  !item.parent_id && !item.meta?.level
);
```

**顯示邏輯：**
1. **手動建立的專案工作**（有 work_package_id）→ 顯示在專案工作區塊
2. **WBS 任務**（有 parent_id 或 meta.level）→ 直接顯示為樹狀結構，**不在未分類區**
3. **真正的未分類任務**（無 work_package_id、無 parent_id、無 level）→ 顯示在「未分類」區

### 5.3 WBS 樹狀結構渲染（WBSTreeGroup.tsx）

使用專門的 `WBSTreeGroup` 組件渲染樹狀結構：

```typescript
// 遞迴渲染子任務
const renderChildren = (parentId: string, level: number): JSX.Element[] => {
  const childItems = allItems.filter(item => item.parent_id === parentId);
  
  return childItems.map(child => {
    const grandchildren = allItems.filter(item => item.parent_id === child.id);
    const hasGrandchildren = grandchildren.length > 0;
    
    return (
      <div style={{ marginLeft: `${level * 1.5}rem` }}>
        <TaskCard item={child} />
        {hasGrandchildren && renderChildren(child.id, level + 1)}
      </div>
    );
  });
};
```

### 5.4 顯示結果

```
專案工作視圖：

┌─────────────────────────────────────────┐
│ [手動建立的專案工作容器]                 │
│ ├─ 任務 A                                │
│ └─ 任務 B                                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 📁 第一階段（駐點）  [WBS 樹狀結構]     │
│   ├─ ✓ 專案啟動會議                      │
│   ├─ ✓ 需求訪談                          │
│   └─ ✓ 需求規格書撰寫                    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 📁 第二階段（系統開發計畫書）            │
│   ├─ ✓ 系統架構設計                      │
│   └─ ✓ 資料庫設計                        │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 未分類 (虛線框)                          │
│ ├─ 其他單獨建立的任務                    │
│ └─ 沒有層級關係的任務                    │
└─────────────────────────────────────────┘
```

✅ **WBS 任務不會出現在「未分類」區域**  
✅ **每個 WBS 階段都是獨立的樹狀結構卡片**  
✅ **可以展開/收合查看子任務**

---

## 🔍 關鍵技術點總結

### ✅ 1. AI 必須提供臨時 ID
AI 在解析 WBS 時，必須為每個任務提供唯一的臨時 ID（如 `temp-1`, `temp-2`），讓子任務可以透過 `parent_id` 引用父任務。

### ✅ 2. 映射表機制
建立建議卡時，使用 `Map` 記錄「AI 臨時 ID → 實際 DB ID」的映射關係，讓子任務的 `parent_id` 正確指向父任務的資料庫 ID。

### ✅ 3. 層級排序
建立和確認時都要按 `level` 排序，確保父任務先處理，子任務後處理，避免孤兒任務。

### ✅ 4. Meta 資訊保留
`meta.level` 和 `meta.wbs_code` 必須正確保存，供後續顯示和排序使用。

### ✅ 5. 狀態轉換
- 建議卡：`status = 'suggestion'`
- 確認入庫後：`status = 'not_started'`
- `parent_id` 和 `level` 在狀態轉換時保持不變

---

## 🐛 常見問題排查

### Q1: 為什麼樹狀結構不完整？

**可能原因**：
1. AI 沒有識別第一層（階段）任務 → 檢查 `WBS_PARSER_PROMPT` 是否強調「不可省略第一層」
2. AI 沒有提供臨時 ID → 檢查 AI 回應的 JSON 格式
3. 映射表沒有正確記錄 → 檢查建立建議卡的日誌

### Q2: 子任務的 parent_id 為什麼是 null？

**可能原因**：
1. 父任務還在建議卡狀態（沒有確認） → 需要同時確認父任務和子任務
2. 映射表沒有找到父任務的實際 ID → 檢查 `idMapping.has(item.parent_id)` 的結果

### Q3: 批次確認後任務順序錯亂？

**可能原因**：
1. 沒有按 `level` 排序 → 檢查 `handleBatchConfirm` 的排序邏輯
2. `meta.wbs_code` 沒有正確提取 → 檢查 AI 回應和後處理邏輯

---

## 📝 開發檢查清單

開發或修改 WBS 相關功能時，請確認以下項目：

- [ ] WBS_PARSER_PROMPT 是否要求 AI 識別所有層級？
- [ ] AI 回應是否包含 `id`, `parent_id`, `level` 欄位？
- [ ] 建立建議卡時是否使用映射表？
- [ ] 建立建議卡時是否按 `level` 排序？
- [ ] 批次確認時是否按 `level` 排序？
- [ ] `meta.level` 和 `meta.wbs_code` 是否正確保存？
- [ ] Console 是否有清晰的日誌輸出？
- [ ] 任務清單的專案工作視圖是否正確顯示樹狀結構？

---

**最後更新**：2025-12-26  
**文件版本**：V1.0