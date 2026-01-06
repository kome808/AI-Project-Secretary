/**
 * 開發工具：用於測試權限系統
 * 
 * 這個文件提供便利函數來設置測試用戶，方便在開發階段測試不同權限情況。
 * 生產環境應該由真實的認證系統來管理用戶資訊。
 */

import { CurrentUser, setCurrentUser, clearCurrentUser } from './statusPermissions';
import { MemberRole } from '../storage/types';

/**
 * 創建測試用戶
 */
export function createTestUser(
  role: MemberRole | 'admin',
  options?: {
    name?: string;
    email?: string;
  }
): CurrentUser {
  const roleNames = {
    pm: 'PM',
    admin: '系統管理員',
    client: '客戶',
    designer: '設計師',
    engineer: '工程師',
    other: '其他成員',
  };

  const baseEmail = options?.email || `test-${role}@example.com`;
  const baseName = options?.name || roleNames[role];

  return {
    id: `test-${role}-id`,
    email: baseEmail,
    name: baseName,
    role,
  };
}

/**
 * 快速設置測試用戶並記錄到 localStorage
 */
export function setTestUser(role: MemberRole | 'admin', options?: { name?: string; email?: string }): CurrentUser {
  const user = createTestUser(role, options);
  setCurrentUser(user);
  
  // 觸發自定義事件，通知 ProjectContext 更新
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('userChanged'));
  }
  
  console.log(`✅ 已設置測試用戶:`, user);
  return user;
}

/**
 * 開發用：快速切換用戶角色
 */
export const DevUserSwitcher = {
  /** 設置為 PM */
  setPM: () => setTestUser('pm', { name: '專案經理' }),
  
  /** 設置為系統管理員 */
  setAdmin: () => setTestUser('admin', { name: '系統管理員' }),
  
  /** 設置為一般成員（工程師） */
  setEngineer: (email?: string) => setTestUser('engineer', { name: '工程師', email }),
  
  /** 設置為設計師 */
  setDesigner: (email?: string) => setTestUser('designer', { name: '設計師', email }),
  
  /** 設置為客戶 */
  setClient: () => setTestUser('client', { name: '客戶' }),
  
  /** 清除當前用戶（登出） */
  logout: () => {
    clearCurrentUser();
    
    // 觸發自定義事件
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('userChanged'));
    }
    
    console.log('🚪 已登出');
  },
  
  /** 顯示當前用戶資訊 */
  whoami: () => {
    try {
      const userJson = localStorage.getItem('current_user');
      if (!userJson) {
        console.log('❌ 目前沒有登入用戶');
        return null;
      }
      const user = JSON.parse(userJson);
      console.log('👤 當前用戶:', user);
      return user;
    } catch (error) {
      console.error('❌ 無法讀取用戶資訊:', error);
      return null;
    }
  },
};

/**
 * 在瀏覽器 console 中使用的全域工具
 * 
 * 使用方式：
 * ```js
 * // 在瀏覽器 console 中
 * window.devUser.setPM()        // 切換為 PM
 * window.devUser.setEngineer()  // 切換為工程師
 * window.devUser.whoami()       // 查看當前用戶
 * window.devUser.logout()       // 登出
 * ```
 */
if (typeof window !== 'undefined') {
  (window as any).devUser = DevUserSwitcher;
  console.log('🔧 開發工具已載入。使用 window.devUser 來快速切換測試用戶。');
  console.log('   例如：window.devUser.setPM() 或 window.devUser.setEngineer()');
}

export default DevUserSwitcher;
