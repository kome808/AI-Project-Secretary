# 使用者角色管理

> **日期**：2024-12-23  
> **狀態**：✅ 開發工具已建立  
> **模式**：開發階段（Development Mode）

---

## 🎭 角色系統概述

本系統支援多種使用者角色，每個角色擁有不同的權限：

| 角色 | 英文代碼 | 權限範圍 | 說明 |
|------|---------|---------|------|
| **系統管理員** | `admin` | 完整權限 | 可管理系統設定、所有專案、所有任務 |
| **專案經理** | `pm` | 專案管理 | 可管理專案、指派任務、查看所有資料 |
| **工程師** | `engineer` | 執行任務 | 可執行任務、更新進度、參與協作 |
| **設計師** | `designer` | 設計任務 | 可處理設計任務、提供設計決策 |
| **客戶** | `client` | 查看與回饋 | 可查看專案進度、提出需求與回饋 |

---

## 🔧 開發模式：快速切換角色

### 方法一：使用 UI 介面（推薦）

1. **前往「設定」頁面**
2. 在「**開發工具：角色切換**」區塊中
3. **點擊想要切換的角色卡片**
4. 系統會自動切換並重新整理頁面

**截圖位置**：設定 → 開發工具：角色切換

---

### 方法二：使用瀏覽器 Console

開啟瀏覽器開發者工具（F12），在 Console 中輸入：

#### 切換為系統管理員（ADMIN）

```javascript
window.devUser.setAdmin()
```

#### 切換為專案經理（PM）

```javascript
window.devUser.setPM()
```

#### 切換為工程師（Engineer）

```javascript
window.devUser.setEngineer()
```

#### 切換為設計師（Designer）

```javascript
window.devUser.setDesigner()
```

#### 切換為客戶（Client）

```javascript
window.devUser.setClient()
```

#### 查看當前用戶

```javascript
window.devUser.whoami()
```

#### 登出

```javascript
window.devUser.logout()
```

---

## 📊 角色權限對照表

### 系統管理員（Admin）

| 功能 | 權限 |
|------|------|
| 查看儀表板 | ✅ 是 |
| 查看所有專案 | ✅ 是 |
| 建立/刪除專案 | ✅ 是 |
| 查看所有任務 | ✅ 是 |
| 編輯所有任務 | ✅ 是 |
| 變更任務狀態 | ✅ 是（所有狀態） |
| 存取系統設定 | ✅ 是 |
| 管理 AI 設定 | ✅ 是 |
| 管理 Supabase 連線 | ✅ 是 |

---

### 專案經理（PM）

| 功能 | 權限 |
|------|------|
| 查看儀表板 | ✅ 是 |
| 查看所有專案 | ✅ 是 |
| 建立/刪除專案 | ✅ 是 |
| 查看所有任務 | ✅ 是 |
| 編輯所有任務 | ✅ 是 |
| 變更任務狀態 | ✅ 是（所有狀態） |
| 存取專案設定 | ✅ 是 |
| 存取系統設定 | ❌ 否 |

---

### 工程師（Engineer）

| 功能 | 權限 |
|------|------|
| 查看儀表板 | ✅ 是 |
| 查看專案列表 | ✅ 是 |
| 建立/刪除專案 | ❌ 否 |
| 查看所有任務 | ✅ 是 |
| 編輯自己的任務 | ✅ 是 |
| 編輯他人的任務 | ❌ 否 |
| 變更任務狀態 | ⚠️ 部分（僅限特定狀態轉換） |
| 存取設定 | ❌ 否 |

---

### 設計師（Designer）

| 功能 | 權限 |
|------|------|
| 查看儀表板 | ✅ 是 |
| 查看專案列表 | ✅ 是 |
| 建立/刪除專案 | ❌ 否 |
| 查看所有任務 | ✅ 是 |
| 編輯自己的任務 | ✅ 是 |
| 編輯他人的任務 | ❌ 否 |
| 變更任務狀態 | ⚠️ 部分（僅限特定狀態轉換） |
| 存取設定 | ❌ 否 |

---

### 客戶（Client）

| 功能 | 權限 |
|------|------|
| 查看儀表板 | ✅ 是 |
| 查看專案列表 | ✅ 是（僅限參與的專案） |
| 建立/刪除專案 | ❌ 否 |
| 查看任務 | ✅ 是（僅限公開的任務） |
| 編輯任務 | ❌ 否 |
| 變更任務狀態 | ❌ 否 |
| 存取設定 | ❌ 否 |

---

## 🛠️ 技術實作

### 檔案結構

```
/src/lib/permissions/
├── statusPermissions.ts    # 權限檢查邏輯
└── devTools.ts             # 開發工具（角色切換）

/src/app/components/
└── UserRoleSwitcher.tsx    # 角色切換 UI 元件
```

---

### CurrentUser 資料結構

```typescript
interface CurrentUser {
  id: string;              // 用戶 ID
  email: string;           // Email
  name: string;            // 顯示名稱
  role: MemberRole | 'admin';  // 角色
}

type MemberRole = 'pm' | 'engineer' | 'designer' | 'client' | 'other';
```

---

### 儲存位置

開發階段，用戶資訊暫存於 **localStorage**：

```javascript
// 儲存
localStorage.setItem('current_user', JSON.stringify(currentUser));

// 讀取
const userJson = localStorage.getItem('current_user');
const currentUser = JSON.parse(userJson);
```

---

## 🔄 自動設定為 ADMIN

系統啟動時，會自動檢查是否有登入用戶：

```typescript
// /src/app/App.tsx

useEffect(() => {
  const currentUser = localStorage.getItem('current_user');
  if (!currentUser) {
    console.log('🔧 開發模式：自動設定為 ADMIN');
    DevUserSwitcher.setAdmin();
  }
}, []);
```

**行為**：
- ✅ 如果沒有登入用戶，自動設定為 **ADMIN**
- ✅ 如果已有登入用戶，保持原狀態
- ✅ Console 會顯示當前角色資訊

---

## 📝 使用範例

### 範例 1：測試專案經理權限

```javascript
// 1. 切換為 PM
window.devUser.setPM()

// 2. 前往「設定」頁面
// 3. 確認可以存取「專案設定」
// 4. 確認**無法**存取「系統設定」（僅 Admin 可見）
```

---

### 範例 2：測試工程師權限

```javascript
// 1. 切換為工程師
window.devUser.setEngineer()

// 2. 前往「任務清單」
// 3. 嘗試編輯自己負責的任務 → ✅ 成功
// 4. 嘗試編輯他人的任務 → ❌ 顯示權限不足
// 5. 嘗試前往「設定」頁面 → ❌ 顯示「存取限制」
```

---

### 範例 3：測試客戶權限

```javascript
// 1. 切換為客戶
window.devUser.setClient()

// 2. 前往「儀表板」→ ✅ 可查看
// 3. 前往「任務清單」→ ✅ 僅看到公開任務
// 4. 嘗試編輯任務 → ❌ 無編輯按鈕
// 5. 嘗試前往「設定」→ ❌ 顯示「存取限制」
```

---

## 🚀 生產環境遷移計劃

### 階段一：開發階段（目前）

- ✅ 使用 **localStorage** 暫存用戶資訊
- ✅ 使用 **DevUserSwitcher** 快速切換角色
- ✅ 自動設定為 ADMIN
- ⚠️ **無真實認證**，所有資料僅在本地

---

### 階段二：Supabase Auth 整合（未來）

#### 1. 啟用 Supabase Authentication

```typescript
// 使用 Supabase Auth 登入
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});
```

#### 2. 建立 Auth Context

```typescript
// /src/app/context/AuthContext.tsx

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // 監聽 Auth 狀態變化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        // 從 session 中取得 user 資訊
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session }}>
      {children}
    </AuthContext.Provider>
  );
};
```

#### 3. 移除 DevUserSwitcher

```typescript
// 生產環境不載入開發工具
if (process.env.NODE_ENV === 'development') {
  import('../lib/permissions/devTools');
}
```

---

### 階段三：角色同步至資料庫（未來）

#### 1. 建立 `user_roles` 表格

```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  project_id UUID REFERENCES projects(id),
  role TEXT NOT NULL CHECK (role IN ('pm', 'engineer', 'designer', 'client', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);
```

#### 2. 查詢用戶角色

```typescript
const { data: userRole } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', session.user.id)
  .eq('project_id', currentProject.id)
  .single();
```

---

## 🔗 相關文件

- [Status Permission Rules](/docs/plan/Status_Permission_Rules.md)
- [Permission System](/src/lib/permissions/)
- [Dev Tools](/src/lib/permissions/devTools.ts)

---

## ✅ 快速指令

```javascript
// 查看當前用戶
window.devUser.whoami()

// 切換為 ADMIN
window.devUser.setAdmin()

// 切換為 PM
window.devUser.setPM()

// 切換為工程師
window.devUser.setEngineer()

// 登出
window.devUser.logout()
```

---

**文件版本**：v1.0  
**最後更新**：2024-12-23  
**更新者**：AI Assistant
