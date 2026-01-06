# Singleton Pattern 修復測試指南

## 🧪 測試目的
驗證修復後，系統確實只創建一個 Supabase Client 實例，不再出現 Multiple GoTrueClient 警告。

---

## 📋 測試步驟

### 步驟 1：清理瀏覽器狀態
1. 按 **F12** 打開開發者工具
2. 切換到 **Console** 標籤
3. 點擊 **清空 Console** 按鈕（垃圾桶圖示）
4. 切換到 **Application** 標籤
5. 展開 **Local Storage**
6. 選擇你的網站
7. 刪除所有以 `sb-` 開頭的項目（清理舊的 auth session）

### 步驟 2：重新整理頁面
1. 按 **F5** 或 **Ctrl+R** 重新整理頁面
2. 等待頁面完全載入

### 步驟 3：檢查初始化日誌
在 Console 中，你應該看到：

```
📦 使用 LocalAdapter (Local Phase)
```

**或**（如果已設定 Supabase）：

```
✅ Supabase 已設定，使用 SupabaseAdapter
✅ [第 1 次] 創建 Supabase Client (Singleton)
   - Project ID: kaeghmhaxcmxakncxzvl
   - Storage Key: sb-kaeghmhaxcmxakncxzvl-auth-token
```

**✅ 成功指標**：只看到 **一次** 創建訊息

**❌ 失敗指標**：看到 **多次** 創建訊息或警告

---

### 步驟 4：測試 Supabase 連線
1. 前往「設定 → 系統管理 → Supabase 連線」
2. 填寫連線資訊：
   - Supabase Project URL
   - Anon / Public Key
   - Schema Name（`aiproject`）
3. 點擊「**測試連線**」按鈕

### 步驟 5：檢查測試連線日誌
在 Console 中，你應該看到：

```
🔄 StorageFactory.resetInstance() 被調用
✅ Supabase 已設定，使用 SupabaseAdapter
🔄 Supabase 連線資訊已改變，準備重新創建 Client
✅ [第 2 次] 創建 Supabase Client (Singleton)
   - Project ID: kaeghmhaxcmxakncxzvl
   - Storage Key: sb-kaeghmhaxcmxakncxzvl-auth-token
```

**✅ 成功指標**：
- 創建次數為 **第 2 次**（因為從 Local 切換到 Supabase）
- **沒有** Multiple GoTrueClient 警告

**❌ 失敗指標**：
- 看到創建次數為 **第 3 次以上**
- 出現 Multiple GoTrueClient 警告

---

### 步驟 6：再次測試連線（重要！）
1. 點擊「**測試連線**」按鈕（第二次）

### 步驟 7：檢查重複測試日誌
在 Console 中，你應該看到：

```
🔄 StorageFactory.resetInstance() 被調用
✅ Supabase 已設定，使用 SupabaseAdapter
♻️  重用現有的 Supabase Client (Singleton 模式)
```

**✅ 成功指標**：
- 看到「**重用現有的 Supabase Client**」訊息
- **沒有** 創建新的實例
- **沒有** Multiple GoTrueClient 警告

**❌ 失敗指標**：
- 又創建了新的實例（第 3 次）
- 出現警告

---

## 🎯 預期結果總結

### ✅ 正常行為（成功）
| 操作 | Console 訊息 | 實例數量 |
|------|-------------|---------|
| 頁面載入（Local Phase） | `📦 使用 LocalAdapter` | 0 |
| 頁面載入（Supabase 已設定） | `✅ [第 1 次] 創建 Supabase Client` | 1 |
| 第一次測試連線 | `✅ [第 2 次] 創建 Supabase Client`（模式切換） | 1 |
| 第二次測試連線 | `♻️  重用現有的 Supabase Client` | 1 |
| 切換到其他頁面 | `♻️  重用現有的 Supabase Client` | 1 |

**整個過程中，最多只創建 1-2 個實例（取決於是否切換模式）**

---

### ❌ 異常行為（失敗）
- 看到 `[第 3 次]` 或更高的創建次數
- 出現警告：`Multiple GoTrueClient instances detected...`
- 在同一個連線狀態下重複創建實例

---

## 🔧 故障排除

### 問題 1：仍然看到 Multiple GoTrueClient 警告
**原因**：可能有其他組件也在調用 `StorageFactory.getAdapter()`

**解決方案**：
1. 檢查 Console 中的 Stack Trace，找出哪個組件調用了
2. 確認該組件是否使用了 `useMemo` 包裝 `getAdapter()`
3. 搜尋專案中所有 `StorageFactory.getAdapter()` 的調用

### 問題 2：創建次數過多
**原因**：React 組件重新渲染導致

**解決方案**：
1. 確保在 `ProjectProvider` 中使用了 `useMemo`
2. 檢查其他使用 `getAdapter()` 的組件
3. 考慮將 adapter 透過 Context 傳遞，而不是每次重新獲取

### 問題 3：localStorage 中有多個 auth session
**原因**：之前的實例留下的舊資料

**解決方案**：
1. 打開 Application → Local Storage
2. 刪除所有以 `sb-` 開頭的項目
3. 重新整理頁面

---

## 📝 測試檢查表

完成以下檢查後，才算通過測試：

- [ ] 頁面載入時，只創建一次 Supabase Client
- [ ] 測試連線時，正確處理模式切換
- [ ] 重複測試連線時，重用現有實例
- [ ] Console 中沒有 Multiple GoTrueClient 警告
- [ ] localStorage 中只有一組 auth session（`sb-xxx-auth-token`）
- [ ] 切換頁面時，不會重複創建實例

---

**測試日期**：2024-12-23  
**測試人員**：請記錄測試結果  
**測試狀態**：⏳ 待測試
