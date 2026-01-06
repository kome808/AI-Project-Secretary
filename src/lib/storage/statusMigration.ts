/**
 * Status Migration Utility
 * 將舊狀態值遷移為符合 rules.md 2.2 的標準狀態
 */

import { ItemStatus } from './types';

/**
 * 舊狀態到新狀態的對應規則
 * 注意：'rejected' 作為 ItemStatus 是合法的（已拒絕的建議）
 *       這裡的 'rejected' 僅指 CR 中的「已駁回」狀態
 */
const LEGACY_STATUS_MIGRATION_MAP: Record<string, ItemStatus> = {
  // 通用舊狀態
  'open': 'not_started',          // 開啟/待處理 → 未開始
  'active': 'in_progress',         // 活躍中 → 進行中
  'done': 'completed',             // 已完成 → 已完成
  'pending': 'awaiting_response',  // 待處理/等待中 → 待回覆
  'waiting': 'awaiting_response',  // 等待 → 待回覆
  'archived': 'completed',         // 已歸檔 → 已完成
  
  // CR (Change Request) 舊狀態
  'requested': 'in_progress',      // 已提出 → 進行中
  'reviewing': 'in_progress',      // 評估中 → 進行中
  'approved': 'completed',         // 已核准 → 已完成
  'implemented': 'completed',      // 已實作 → 已完成
  'canceled': 'completed',         // 已取消 → 已完成（結案）
  
  // Decision 舊狀態
  'superseded': 'completed',       // 已被取代 → 已完成
  'deprecated': 'completed',       // 已廢止 → 已完成
};

/**
 * 標準狀態列表（用於驗證）
 */
const STANDARD_STATUSES: ItemStatus[] = [
  'suggestion',        // AI 建議（收件匣專用）
  'rejected',          // 已拒絕的建議
  'not_started',
  'in_progress',
  'blocked',
  'awaiting_response',
  'completed'
];

/**
 * 判斷是否為舊狀態
 */
export function isLegacyStatus(status: string): boolean {
  return status in LEGACY_STATUS_MIGRATION_MAP;
}

/**
 * 將舊狀態轉換為新狀態
 */
export function migrateStatus(oldStatus: string): ItemStatus {
  // 如果已經是標準狀態，直接返回
  if (STANDARD_STATUSES.includes(oldStatus as ItemStatus)) {
    return oldStatus as ItemStatus;
  }
  
  // 如果是已知的舊狀態，返回對應的新狀態
  if (oldStatus in LEGACY_STATUS_MIGRATION_MAP) {
    return LEGACY_STATUS_MIGRATION_MAP[oldStatus];
  }
  
  // 完全未知的狀態，預設為「未開始」
  console.warn(`[StatusMigration] Unknown status "${oldStatus}", defaulting to "not_started"`);
  return 'not_started';
}

/**
 * 批次遷移所有 Items 的狀態（LocalStorage 版本）
 * @returns 遷移的項目數量
 */
export function migrateAllItemsStatus(): number {
  let migratedCount = 0;
  
  try {
    // 取得所有 localStorage keys
    const keys = Object.keys(localStorage);
    
    // 尋找所有 items_ 開頭的 key
    const itemKeys = keys.filter(key => key.startsWith('items_'));
    
    itemKeys.forEach(key => {
      try {
        const data = localStorage.getItem(key);
        if (!data) return;
        
        const items = JSON.parse(data);
        if (!Array.isArray(items)) return;
        
        let hasChanges = false;
        
        // 檢查並遷移每個 item 的狀態
        items.forEach((item: any) => {
          if (item.status && isLegacyStatus(item.status)) {
            const oldStatus = item.status;
            const newStatus = migrateStatus(oldStatus);
            
            if (oldStatus !== newStatus) {
              console.log(`[StatusMigration] Item "${item.title}": "${oldStatus}" → "${newStatus}"`);
              item.status = newStatus;
              hasChanges = true;
              migratedCount++;
            }
          }
        });
        
        // 如果有變更，寫回 localStorage
        if (hasChanges) {
          localStorage.setItem(key, JSON.stringify(items));
        }
      } catch (error) {
        console.error(`[StatusMigration] Error processing key "${key}":`, error);
      }
    });
    
    // 同樣處理 WorkPackages
    const wpKeys = keys.filter(key => key.startsWith('work_packages_'));
    wpKeys.forEach(key => {
      try {
        const data = localStorage.getItem(key);
        if (!data) return;
        
        const workPackages = JSON.parse(data);
        if (!Array.isArray(workPackages)) return;
        
        let hasChanges = false;
        
        workPackages.forEach((wp: any) => {
          if (wp.status && isLegacyStatus(wp.status)) {
            const oldStatus = wp.status;
            const newStatus = migrateStatus(oldStatus);
            
            if (oldStatus !== newStatus) {
              console.log(`[StatusMigration] WorkPackage "${wp.title}": "${oldStatus}" → "${newStatus}"`);
              wp.status = newStatus;
              hasChanges = true;
              migratedCount++;
            }
          }
        });
        
        if (hasChanges) {
          localStorage.setItem(key, JSON.stringify(workPackages));
        }
      } catch (error) {
        console.error(`[StatusMigration] Error processing work package key "${key}":`, error);
      }
    });
    
    // 標記遷移已完成
    if (migratedCount > 0) {
      localStorage.setItem('status_migration_completed', new Date().toISOString());
    }
    
  } catch (error) {
    console.error('[StatusMigration] Migration failed:', error);
  }
  
  return migratedCount;
}

/**
 * 檢查是否需要執行遷移
 * 改進版：總是掃描實際資料，不僅依賴標記
 */
export function needsMigration(): boolean {
  // 檢查是否存在舊狀態資料（總是掃描，確保完整）
  try {
    const keys = Object.keys(localStorage);
    const itemKeys = keys.filter(key => key.startsWith('items_') || key.startsWith('work_packages_'));
    
    for (const key of itemKeys) {
      const data = localStorage.getItem(key);
      if (!data) continue;
      
      const items = JSON.parse(data);
      if (!Array.isArray(items)) continue;
      
      // 檢查是否有舊狀態
      const hasLegacyStatus = items.some((item: any) => 
        item.status && isLegacyStatus(item.status)
      );
      
      if (hasLegacyStatus) {
        console.log(`  ℹ️ 在 ${key} 中發現舊狀態資料`);
        return true;
      }
    }
  } catch (error) {
    console.error('[StatusMigration] Error checking migration need:', error);
  }
  
  return false;
}