/**
 * Status Helpers - 狀態對應輔助函數
 * 根據 rules.md 定義的統一狀態系統
 */

import { ItemStatus } from './types';

/**
 * 狀態顯示名稱對應（遵循 rules.md 2.2）
 * - 未開始 -> not_started
 * - 進行中 -> in_progress
 * - 卡關 -> blocked
 * - 待回覆 -> awaiting_response
 * - 已完成 -> completed
 * - 建議中 -> suggestion (收件匣專用)
 * - 已拒絕 -> rejected (已拒絕的建議)
 */
export const STATUS_LABELS: Record<ItemStatus, string> = {
  // AI 建議流程
  suggestion: '建議中',
  rejected: '已拒絕',
  
  // 標準任務狀態
  not_started: '未開始',
  in_progress: '進行中',
  blocked: '卡關',
  awaiting_response: '待回覆',
  completed: '已完成',
  on_hold: '暫停',
};

/**
 * 反向對應：中文名稱 -> 狀態值
 */
export const LABEL_TO_STATUS: Record<string, ItemStatus> = {
  '建議中': 'suggestion',
  '已拒絕': 'rejected',
  '未開始': 'not_started',
  '進行中': 'in_progress',
  '卡關': 'blocked',
  '待回覆': 'awaiting_response',
  '已完成': 'completed',
};

/**
 * 狀態選項列表（供下拉選單使用）
 */
export const STATUS_OPTIONS: Array<{ value: ItemStatus; label: string }> = [
  { value: 'not_started', label: '未開始' },
  { value: 'in_progress', label: '進行中' },
  { value: 'blocked', label: '卡關' },
  { value: 'awaiting_response', label: '待回覆' },
  { value: 'completed', label: '已完成' },
  { value: 'suggestion', label: '建議中' },
  { value: 'rejected', label: '已拒絕' },
];

/**
 * 獲取狀態的顯示名稱
 * 包含向後相容處理，可處理尚未遷移的舊狀態
 */
export function getStatusLabel(status: string): string {
  // 舊狀態自動對應到新狀態的標籤（向後相容）
  // 注意：'rejected' 是合法狀態，不在此列
  const legacyStatusMap: Record<string, ItemStatus> = {
    'open': 'not_started',
    'active': 'in_progress',
    'done': 'completed',
    'pending': 'awaiting_response',
    'waiting': 'awaiting_response',
    'archived': 'completed',
    'requested': 'in_progress',
    'reviewing': 'in_progress',
    'approved': 'completed',
    'implemented': 'completed',
    'canceled': 'completed',
    'superseded': 'completed',
    'deprecated': 'completed',
  };
  
  // 如果是舊狀態，自動對應到新狀態
  let itemStatus = status;
  if (status in legacyStatusMap) {
    itemStatus = legacyStatusMap[status];
    console.warn(`[Status] Legacy status detected: "${status}" → showing as "${itemStatus}". Please run migration.`);
  }
  
  // 支援標準狀態
  if (itemStatus in STATUS_LABELS) {
    return STATUS_LABELS[itemStatus as ItemStatus];
  }
  
  // 如果是未知狀態，記錄警告並返回原值
  console.warn(`[Status] Unknown status: "${status}"`);
  return status;
}

/**
 * 獲取狀態的顏色樣式類別
 * 包含向後相容處理，可處理尚未遷移的舊狀態
 */
export function getStatusColor(status: string): string {
  // 舊狀態自動對應到新狀態的顏色（向後相容）
  const legacyStatusMap: Record<string, ItemStatus> = {
    'open': 'not_started',
    'active': 'in_progress',
    'done': 'completed',
    'pending': 'awaiting_response',
    'waiting': 'awaiting_response',
    'archived': 'completed',
    'requested': 'in_progress',
    'reviewing': 'in_progress',
    'approved': 'completed',
    'implemented': 'completed',
    'canceled': 'completed',
    'superseded': 'completed',
    'deprecated': 'completed',
  };
  
  // 如果是舊狀態，自動對應到新狀態
  let itemStatus = status as ItemStatus;
  if (status in legacyStatusMap) {
    itemStatus = legacyStatusMap[status];
    console.warn(`[Status] Legacy status detected: "${status}" → using "${itemStatus}" color. Please run migration.`);
  }
  
  switch (itemStatus) {
    // AI 建議流程狀態
    case 'suggestion':
      return 'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400';
    case 'rejected':
      return 'bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-400';
    
    // 標準任務狀態
    case 'not_started':
      return 'bg-muted text-muted-foreground border border-border';
    case 'in_progress':
      return 'bg-accent/10 text-accent border border-accent/30';
    case 'blocked':
      return 'bg-destructive/10 text-destructive border border-destructive/30';
    case 'awaiting_response':
      return 'bg-[#FFC107]/10 text-[#F57C00] border border-[#FFC107]/30';
    case 'completed':
      return 'bg-[#4CAF50]/10 text-[#2E7D32] border border-[#4CAF50]/30';
    case 'on_hold':
      return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400';
    
    default:
      // 未知狀態使用警告色
      console.warn(`[Status] Unknown status color: "${status}"`);
      return 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400';
  }
}

/**
 * 判斷狀態是否為「已完成」（用於過濾）
 */
export function isCompletedStatus(status: ItemStatus): boolean {
  return status === 'completed';
}

/**
 * 判斷狀態是否為「進行中」（包含卡關和待回覆）
 */
export function isActiveStatus(status: ItemStatus): boolean {
  return ['in_progress', 'blocked', 'awaiting_response'].includes(status);
}