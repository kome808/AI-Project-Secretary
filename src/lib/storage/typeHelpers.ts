/**
 * Type Helpers - 任務類型輔助函數
 * 根據 rules.md 定義的統一類型系統
 */

import { ItemType } from './types';

/**
 * 類型顯示名稱對應（遵循 rules.md 2.1）
 * - general -> 一般
 * - pending -> 待確認
 * - cr -> 變更
 * - decision -> 決議
 */
export const TYPE_LABELS: Record<ItemType, string> = {
  general: '一般',
  pending: '待確認',
  cr: '變更',
  decision: '決議',
};

/**
 * 反向對應：中文名稱 -> 類型值
 */
export const LABEL_TO_TYPE: Record<string, ItemType> = {
  '一般': 'general',
  '待確認': 'pending',
  '變更': 'cr',
  '決議': 'decision',
};

/**
 * 類型選項列表（供下拉選單使用）
 */
export const TYPE_OPTIONS: Array<{ value: ItemType; label: string }> = [
  { value: 'general', label: '一般' },
  { value: 'pending', label: '待確認' },
  { value: 'cr', label: '變更' },
  { value: 'decision', label: '決議' },
];

/**
 * 獲取類型的顯示名稱
 */
export function getTypeLabel(type: ItemType): string {
  return TYPE_LABELS[type] || type;
}

/**
 * 獲取類型的顏色樣式類別（使用 CSS 變數）
 */
export function getTypeColor(type: ItemType): string {
  switch (type) {
    case 'general':
      // 一般任務 - 使用 muted 配色
      return 'bg-muted text-muted-foreground border border-border';
    case 'pending':
      // 待確認 - 使用警告色調
      return 'bg-[#FFC107]/10 text-[#F57C00] border border-[#FFC107]/30';
    case 'cr':
      // 變更 - 使用橙色系（變更需要注意）
      return 'bg-[#FF9800]/10 text-[#E65100] border border-[#FF9800]/30';
    case 'decision':
      // 決議 - 使用藍色系（重要資訊）
      return 'bg-accent/10 text-accent border border-accent/30';
    default:
      return 'bg-muted text-muted-foreground border border-border';
  }
}

/**
 * 獲取類型的圖示類名（可搭配 lucide-react）
 */
export function getTypeIcon(type: ItemType): string {
  switch (type) {
    case 'general':
      return 'CheckSquare'; // 一般任務
    case 'pending':
      return 'MessageSquare'; // 待確認
    case 'cr':
      return 'GitBranch'; // 變更
    case 'decision':
      return 'FileCheck'; // 決議
    default:
      return 'CheckSquare';
  }
}
