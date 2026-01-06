# 🚀 快速開始：ADMIN 身分設定

## ✅ 問題已修復

已解決以下問題：
- ✅ localStorage key 名稱統一為 `current_user`
- ✅ ProjectContext 正確讀取 `current_user`
- ✅ 自動觸發事件通知所有元件更新
- ✅ 頁面頂部顯示當前用戶 Badge

---

## 🔥 立即測試（3 步驟）

### 步驟 1：重新整理頁面

按 **F5** 或 **Ctrl+R** 重新整理頁面

### 步驟 2：檢查 Console

開啟瀏覽器開發者工具（F12），應該看到：

```
✅ 已設置測試用戶: {
  id: "test-admin-id",
  email: "test-admin@example.com", 
  name: "系統管理員",
  role: "admin"
}
```

### 步驟 3：確認 UI

1. **頁面右上角**應該顯示：
   ```
   🛡️ 系統管理員
   ```
   （紅色 Badge）

2. **前往「設定」頁面**：
   - 應該能看到「身分切換」卡片
   - 「系統設定」標籤應該可見（標記為 Admin）

---

## 🎯 驗證 ADMIN 權限

### 測試 1：存取系統設定

1. 前往「設定」
2. 點擊「**系統設定**」標籤（有 Admin 標記）
3. ✅ 應該能成功進入（只有 ADMIN 可見）

### 測試 2：編輯所有任務

1. 前往「任務清單」
2. 點擊任何任務
3. ✅ 應該能編輯所有任務狀態

### 測試 3：查看完整權限

前往「設定」→ 查看「身分切換」卡片中的權限說明：

```
權限：完整存取權限、可編輯系統設定
```

---

## 🔄 切換其他角色測試

### 方法 A：使用 UI（推薦）

1. 前往「**設定**」頁面
2. 找到「**身分切換**」卡片
3. 點擊任何角色（例如：工程師）
4. 頁面會自動重新整理

### 方法 B：使用 Console

```javascript
// 切換為工程師（測試權限限制）
window.devUser.setEngineer()

// 重新整理頁面
location.reload()

// 切換回 ADMIN
window.devUser.setAdmin()
location.reload()
```

---

## 🐛 如果還是沒有權限

### Debug 步驟：

#### 1. 檢查 localStorage

在 Console 輸入：

```javascript
localStorage.getItem('current_user')
```

應該回傳：

```json
{"id":"test-admin-id","email":"test-admin@example.com","name":"系統管理員","role":"admin"}
```

#### 2. 手動設定 ADMIN

```javascript
window.devUser.setAdmin()
```

應該顯示：

```
✅ 已設置測試用戶: { role: "admin", ... }
```

#### 3. 強制重新整理

```javascript
location.reload()
```

#### 4. 檢查 ProjectContext

在 Console 輸入：

```javascript
// 應該會在 Console 看到
✅ ProjectContext: 用戶已更新 { role: "admin", ... }
```

---

## 📋 快速指令參考

```javascript
// 查看當前用戶
window.devUser.whoami()

// 切換為 ADMIN
window.devUser.setAdmin()

// 切換為 PM
window.devUser.setPM()

// 切換為工程師
window.devUser.setEngineer()

// 切換為設計師
window.devUser.setDesigner()

// 切換為客戶
window.devUser.setClient()

// 登出
window.devUser.logout()

// 重新整理
location.reload()
```

---

## 🎨 UI 變化一覽

| 角色 | 右上角 Badge | 設定頁面存取 | 系統設定標籤 |
|------|-------------|------------|------------|
| **ADMIN** | 🛡️ 系統管理員（紅） | ✅ 可存取 | ✅ 可見 |
| **PM** | 👥 專案經理（藍） | ✅ 可存取 | ❌ 不可見 |
| **工程師** | 💻 工程師（綠） | ❌ 顯示「存取限制」 | ❌ 不可見 |
| **設計師** | 🎨 設計師（紫） | ❌ 顯示「存取限制」 | ❌ 不可見 |
| **客戶** | 👤 客戶（琥珀） | ❌ 顯示「存取限制」 | ❌ 不可見 |

---

## 📚 相關文件

- [完整角色管理文件](/docs/User_Role_Management.md)
- [權限規則文件](/docs/plan/Status_Permission_Rules.md)
- [開發工具原始碼](/src/lib/permissions/devTools.ts)

---

## ✨ 新功能

### 1. 即時用戶 Badge

頁面右上角會顯示當前登入用戶：
- ✅ 即時更新（切換角色時自動變更）
- ✅ 使用團隊設計系統的顏色
- ✅ 顯示對應圖示

### 2. 自動初始化

- ✅ 首次進入自動設定為 ADMIN
- ✅ 重新整理後保持登入狀態
- ✅ 跨頁面同步用戶資訊

### 3. 事件驅動更新

- ✅ 使用 `userChanged` 自定義事件
- ✅ 所有元件即時響應角色變更
- ✅ 無需手動重新整理（除了切換時）

---

**建立日期**：2024-12-23  
**狀態**：✅ 已完成  
**測試**：✅ 已驗證
