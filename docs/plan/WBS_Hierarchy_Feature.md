# WBS 層級架構自動繼承功能規劃

> 版本：V1.0  
> 日期：2024-12-26  
> 狀態：已實作

## 1. 功能概述

當使用者上傳 WBS 文件（圖片、PDF、Excel、Word）時，系統能夠自動識別任務之間的層級關係，並在建立任務卡時自動保留這些層級結構，減少手動調整層級的時間。

## 2. 核心價值

- **自動化層級識別**：AI 自動解析 WBS 文件中的層級結構（1, 1.1, 1.1.1 等）
- **父子關係繼承**：根據 WBS 編號自動建立任務之間的父子關聯
- **正確排序**：確保父任務先建立，子任務後建立，避免關聯錯誤
- **層級資訊保留**：將層級資訊（level, parent_id）儲存在資料庫中供後續使用

## 3. 技術實作

### 3.1 資料結構擴充

**Item 資料結構（已存在）**：
```typescript
interface Item {
  id: string;
  project_id: string;
  parent_id?: string; // 父任務 ID（已存在）
  meta?: {
    level?: number;      // 🔥 新增：層級（1=根任務，2=第二層）
    wbs_code?: string;   // WBS 編號（例如 "1.1.2"）
    original_order?: number; // 🔥 新增：原始排序
    ...
  };
  ...
}
```

### 3.2 AI Prompt 要求

在 `WBS_PARSER_PROMPT` 中，已定義 AI 必須輸出以下欄位：

```typescript
{
  "tasks": [
    {
      "id": "task_001",           // AI 產生的臨時 ID
      "title": "需求分析",
      "description": "...",
      "parent_id": null,          // 根任務無父任務
      "level": 1,                 // 層級 1
      "order": 1,                 // 排序
      ...
    },
    {
      "id": "task_002",
      "title": "使用者訪談",
      "description": "...",
      "parent_id": "task_001",    // 父任務是 task_001
      "level": 2,                 // 層級 2（子任務）
      "order": 1,
      ...
    }
  ]
}
```

### 3.3 建立任務流程改進

**DashboardPage.tsx 中的改進**：

1. **ID 映射表建立**：
   ```typescript
   const idMapping = new Map<string, string>();
   // AI 的臨時 ID -> 實際資料庫 ID
   ```

2. **按層級排序**：
   ```typescript
   const sortedItems = [...items].sort((a, b) => {
     const levelA = a.meta?.level || 1;
     const levelB = b.meta?.level || 1;
     return levelA - levelB; // 層級小的（父任務）先建立
   });
   ```

3. **parent_id 轉換**：
   ```typescript
   let finalParentId: string | undefined = undefined;
   if (item.parent_id && idMapping.has(item.parent_id)) {
     finalParentId = idMapping.get(item.parent_id);
   }
   ```

4. **建立任務並記錄映射**：
   ```typescript
   const itemRes = await storage.createItem({
     ...
     parent_id: finalParentId, // 🔥 設定父任務關聯
     meta: {
       level: item.meta?.level || 1, // 🔥 儲存層級
       original_order: item.meta?.order, // 🔥 儲存排序
       ...
     }
   });
   
   if (!itemRes.error && itemRes.data && item.id) {
     idMapping.set(item.id, itemRes.data.id); // 記錄映射
   }
   ```

## 4. 使用情境範例

### 情境 1：上傳 WBS 圖片

**使用者操作**：
1. 在儀表板上傳一張包含層級結構的 WBS 圖片
2. 圖片內容如下：
   ```
   1. 專案啟動
     1.1 需求訪談
     1.2 範圍確認
   2. 設計階段
     2.1 UI 設計
       2.1.1 線框圖
       2.1.2 視覺設計
     2.2 資料庫設計
   ```

**系統行為**：
1. AI 解析圖片，識別出 7 個任務和它們的層級關係
2. 系統按層級順序建立任務：
   - 第 1 層：「專案啟動」、「設計階段」
   - 第 2 層：「需求訪談」（父：專案啟動）、「範圍確認」（父：專案啟動）、「UI 設計」（父：設計階段）、「資料庫設計」（父：設計階段）
   - 第 3 層：「線框圖」（父：UI 設計）、「視覺設計」（父：UI 設計）
3. 所有任務進入收件匣，保留層級關係

**結果**：
- 使用者在收件匣確認時，可以看到任務之間已經建立正確的父子關聯
- 不需要手動調整層級或父子關係
- 可直接確認入庫，任務清單中會顯示正確的層級結構

### 情境 2：上傳 Excel WBS

**使用者操作**：
1. 上傳一個 Excel 檔案，包含 WBS 編號欄位（例如 "1.1.2"）
2. AI 從 WBS 編號推斷層級關係

**系統行為**：
1. AI 解析 Excel，從 WBS 編號計算層級：
   - "1" → level 1
   - "1.1" → level 2, parent_id 對應到 "1"
   - "1.1.2" → level 3, parent_id 對應到 "1.1"
2. 按層級順序建立任務
3. 自動建立父子關聯

## 5. 資料驗證規則

### 5.1 層級一致性檢查

- ✅ level 必須 >= 1
- ✅ 子任務的 level 必須 = 父任務的 level + 1
- ✅ parent_id 指向的任務必須在子任務之前建立

### 5.2 WBS 編號格式

支援的 WBS 編號格式：
- 數字型：`1`, `1.1`, `1.1.1`, `1.1.1.1`
- 字母型：`A`, `A.1`, `A.1.a`
- 混合型：`1-A`, `A-1`

### 5.3 錯誤處理

**情境：AI 返回無效的 parent_id**
- 如果 `parent_id` 在 idMapping 中找不到 → 設為 `null`（視為根任務）
- 系統會在 meta 中保留原始的 parent_id 供後續追蹤

**情境：AI 未返回 level**
- 預設 level = 1（視為根任務）

## 6. UI 顯示規劃（後續階段）

### 6.1 收件匣顯示

在收件匣中，建議卡應顯示：
- 層級縮排（根據 meta.level）
- WBS 編號 badge
- 父任務關聯提示

```
📋 專案啟動 [WBS: 1]
  📋 需求訪談 [WBS: 1.1] ↳ 父任務：專案啟動
  📋 範圍確認 [WBS: 1.2] ↳ 父任務：專案啟動
📋 設計階段 [WBS: 2]
  📋 UI 設計 [WBS: 2.1] ↳ 父任務：設計階段
    📋 線框圖 [WBS: 2.1.1] ↳ 父任務：UI 設計
```

### 6.2 任務清單顯示

在任務清單中：
- 提供「層級視圖」切換
- 可摺疊/展開子任務
- 顯示任務深度（例如 L1, L2, L3）

### 6.3 專案工作視圖

在專案工作視圖中：
- 以樹狀結構顯示任務
- 支援拖曳調整層級
- 可批次移動整個分支

## 7. 測試案例

### TC-01: 基本層級識別

**前置條件**：上傳包含 3 層級的 WBS 圖片

**預期結果**：
- 所有任務正確建立
- parent_id 正確指向父任務
- meta.level 正確設定

### TC-02: WBS 編號提取

**前置條件**：上傳包含 "1.1 需求訪談" 格式標題的文件

**預期結果**：
- WBS 編號 "1.1" 被提取到 meta.wbs_code
- 標題變為 "需求訪談"
- level 自動設為 2

### TC-03: 複雜層級結構

**前置條件**：上傳包含 5 層級、30+ 任務的大型 WBS

**預期結果**：
- 所有任務按正確順序建立
- 無孤兒任務（所有子任務都能找到父任務）
- 建立時間 < 30 秒

### TC-04: 錯誤處理

**前置條件**：AI 返回無效的 parent_id

**預期結果**：
- 系統不會崩潰
- 無效的任務被設為根任務（parent_id = null）
- 顯示警告訊息

## 8. 效能考量

### 8.1 批次建立優化

目前實作採用「循序建立」（Sequential Creation）：
- 優點：確保父任務 ID 可用，邏輯簡單
- 缺點：大量任務時速度較慢

**未來優化方向**（V2.0）：
- 實作「批次建立 + 事後關聯」
- 先批次建立所有任務（不設 parent_id）
- 再批次更新 parent_id
- 預期效能提升 3-5 倍

### 8.2 資料庫查詢優化

當顯示層級結構時：
- 使用 Recursive CTE（Common Table Expression）查詢整個樹
- 避免 N+1 查詢問題
- 考慮增加 `path` 欄位加速查詢（例如 "1/2/5"）

## 9. 相關文件

- `/docs/spac/rules.md` - 全域業務規則
- `/docs/plan/Tasks_View_ProjectWork.md` - 專案工作視圖規劃
- `/src/lib/ai/prompts.ts` - WBS_PARSER_PROMPT 定義
- `/src/app/dashboard/DashboardPage.tsx` - 實作程式碼

## 10. 附錄：資料範例

### AI 返回的任務結構範例

```json
{
  "project_title": "官網改版專案",
  "tasks": [
    {
      "id": "tmp_001",
      "title": "需求分析",
      "description": "收集並分析使用者需求",
      "parent_id": null,
      "level": 1,
      "order": 1,
      "type": "general",
      "priority": "high",
      "meta": {
        "wbs_code": "1",
        "estimated_days": 5
      }
    },
    {
      "id": "tmp_002",
      "title": "使用者訪談",
      "description": "訪談 10 位目標使用者",
      "parent_id": "tmp_001",
      "level": 2,
      "order": 1,
      "type": "general",
      "priority": "medium",
      "meta": {
        "wbs_code": "1.1",
        "estimated_days": 3
      }
    },
    {
      "id": "tmp_003",
      "title": "競品分析",
      "description": "分析 5 個競爭對手網站",
      "parent_id": "tmp_001",
      "level": 2,
      "order": 2,
      "type": "general",
      "priority": "medium",
      "meta": {
        "wbs_code": "1.2",
        "estimated_days": 2
      }
    }
  ],
  "reasoning": "根據 WBS 圖檔識別出 3 個任務，其中「使用者訪談」和「競品分析」是「需求分析」的子任務"
}
```

---

**END OF DOCUMENT**
