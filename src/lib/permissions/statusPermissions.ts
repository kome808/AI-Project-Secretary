/**
 * 狀態變更權限檢查模組
 * 
 * 根據 /docs/plan/Status_Permission_Rules.md 定義的規則
 * 檢查用戶是否有權限變更特定任務的狀態
 */

import { Item, Project, Member, MemberRole } from '../storage/types';

/**
 * 當前用戶資訊（暫時簡化版本）
 * 未來整合真實認證系統時，可從 Auth Context 中獲取
 */
export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: MemberRole | 'admin'; // admin 為系統管理員
}

/**
 * 從 localStorage 獲取當前用戶資訊（臨時方案）
 * 未來應該從 AuthContext 或 Session 中獲取
 */
export function getCurrentUser(): CurrentUser | null {
  try {
    const userJson = localStorage.getItem('current_user');
    if (!userJson) return null;
    return JSON.parse(userJson);
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}

/**
 * 設定當前用戶（開發階段使用）
 * 未來應該由認證系統自動設定
 */
export function setCurrentUser(user: CurrentUser): void {
  console.log('📝 setCurrentUser 被呼叫:', user);
  localStorage.setItem('current_user', JSON.stringify(user));
  console.log('✅ localStorage 已更新');
  
  // 觸發自定義事件，通知所有監聽器
  if (typeof window !== 'undefined') {
    console.log('📢 觸發 userChanged 事件');
    window.dispatchEvent(new Event('userChanged'));
  }
}

/**
 * 清除當前用戶
 */
export function clearCurrentUser(): void {
  localStorage.removeItem('current_user');
}

/**
 * 檢查用戶是否為專案的 PM
 */
export function isProjectPM(user: CurrentUser, project: Project): boolean {
  return project.pm_id === user.id;
}

/**
 * 檢查用戶是否為任務的負責人
 * 注意：types.ts 中定義為 assignee_id，但實際使用中可能是 assignee (email)
 */
export function isItemAssignee(user: CurrentUser, item: Item): boolean {
  // 支援兩種格式：assignee_id 或 assignee (email)
  const assigneeId = (item as any).assignee_id || (item as any).assignee;
  if (!assigneeId) return false;
  
  // 可能是 ID 或 email
  return assigneeId === user.id || assigneeId === user.email;
}

/**
 * 檢查用戶是否為系統管理員
 */
export function isSystemAdmin(user: CurrentUser): boolean {
  return user.role === 'admin';
}

/**
 * 主要權限檢查函數：檢查用戶是否可以編輯任務狀態
 * 
 * 權限規則：
 * 
 * A) Action / Pending（工作類）
 *    - PM 可編輯
 *    - 負責人可編輯
 *    - Admin 可編輯
 *    - 例外：未指派負責人時，僅 PM/Admin 可編輯
 *    - 例外：專案封存時，一律不可編輯
 * 
 * B) Change Request（CR）
 *    - 僅 PM 可編輯
 *    - Admin 可編輯
 * 
 * C) Decision / Rule（決議紀錄 / 規則）
 *    - 不提供狀態變更功能（永遠返回 false）
 * 
 * @param item - 要編輯的任務項目
 * @param currentUser - 當前用戶
 * @param project - 所屬專案
 * @returns true 表示有權限，false 表示無權限
 */
export function canEditStatus(
  item: Item,
  currentUser: CurrentUser | null,
  project: Project
): boolean {
  // 沒有登入用戶，無權限
  if (!currentUser) return false;

  // 專案封存時，一律不可編輯（唯讀模式）
  if (project.status === 'archived') return false;

  // Decision / Rule 類型不提供狀態變更
  if (item.type === 'decision' || item.type === 'rule') return false;

  // Admin 擁有所有權限（除了 Decision/Rule）
  if (isSystemAdmin(currentUser)) return true;

  // PM 擁有所有工作類 + CR 的權限
  if (isProjectPM(currentUser, project)) return true;

  // CR（需求變更）僅 PM/Admin 可編輯，其他人到這裡已經被過濾掉
  if (item.type === 'cr') return false;

  // Action / Pending：負責人可編輯
  if (item.type === 'action' || item.type === 'pending') {
    // 檢查是否為負責人
    return isItemAssignee(currentUser, item);
  }

  // 其他情況：無權限
  return false;
}

/**
 * 獲取無權限的原因（用於 UI 提示）
 */
export function getPermissionDeniedReason(
  item: Item,
  currentUser: CurrentUser | null,
  project: Project
): string {
  if (!currentUser) {
    return '請先登入';
  }

  if (project.status === 'archived') {
    return '專案已封存，無法編輯';
  }

  if (item.type === 'decision' || item.type === 'rule') {
    return '決議紀錄不提供狀態變更';
  }

  if (item.type === 'cr') {
    return '僅專案 PM 或系統管理員可變更 CR 狀態';
  }

  if (item.type === 'action' || item.type === 'pending') {
    const assigneeId = (item as any).assignee_id || (item as any).assignee;
    if (!assigneeId) {
      return '任務尚未指派負責人，僅 PM 或管理員可編輯';
    }
    return '僅負責人、PM 或管理員可變更狀態';
  }

  return '您沒有權限編輯此項目';
}

/**
 * 檢查用戶是否可以編輯任務的其他欄位（標題、描述等）
 * 目前與狀態編輯權限相同，但未來可能有不同規則
 */
export function canEditItem(
  item: Item,
  currentUser: CurrentUser | null,
  project: Project
): boolean {
  // 目前與狀態編輯權限相同
  return canEditStatus(item, currentUser, project);
}

/**
 * 檢查用戶是否可以刪除任務
 * 規則：僅 PM 和 Admin 可刪除
 */
export function canDeleteItem(
  item: Item,
  currentUser: CurrentUser | null,
  project: Project
): boolean {
  if (!currentUser) return false;
  if (project.status === 'archived') return false;
  
  // 僅 PM 或 Admin 可刪除
  return isSystemAdmin(currentUser) || isProjectPM(currentUser, project);
}