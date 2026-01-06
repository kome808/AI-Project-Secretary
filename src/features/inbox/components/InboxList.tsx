import React, { useState } from 'react';
import { Item, ItemType } from '../../../lib/storage/types';
import { SuggestionCardV2 } from './SuggestionCardV2';
import { Inbox, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface InboxListProps {
  items: Item[];
  selectedIds: string[];
  onToggleSelect: (itemId: string) => void;
  onConfirm: (item: Item) => void;
  onReject: (itemId: string) => void;
  onEdit: (item: Item) => void;
  onViewSource: (artifactId: string) => void;
}

// 只保留四個核心分類
const TYPE_FILTERS: Array<{ value: 'all' | ItemType; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'action', label: '待辦' },
  { value: 'pending', label: '待回覆' },
  { value: 'decision', label: '決議' },
  { value: 'cr', label: '變更' }
];

export function InboxList({ 
  items, 
  selectedIds,
  onToggleSelect,
  onConfirm, 
  onReject, 
  onEdit,
  onViewSource 
}: InboxListProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | ItemType>('all');

  const filteredItems = activeFilter === 'all' 
    ? items 
    : items.filter(item => item.type === activeFilter);

  const getCountByType = (type: 'all' | ItemType) => {
    if (type === 'all') return items.length;
    return items.filter(item => item.type === type).length;
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Inbox className="h-16 w-16 text-muted-foreground opacity-30 mb-4" />
        <h3 className="mb-2"><label>收件匣是空的</label></h3>
        <p className="text-muted-foreground max-w-md">
          <label>在上方輸入內容或上傳檔案，AI 會自動產生建議卡</label>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 shrink-0">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <label className="text-muted-foreground text-sm">篩選：</label>
        </div>
        {TYPE_FILTERS.map(filter => {
          const count = getCountByType(filter.value);
          return (
            <Badge
              key={filter.value}
              variant={activeFilter === filter.value ? 'default' : 'outline'}
              className="cursor-pointer whitespace-nowrap transition-colors"
              onClick={() => setActiveFilter(filter.value)}
            >
              <label className="cursor-pointer">
                {filter.label} ({count})
              </label>
            </Badge>
          );
        })}
      </div>

      {/* Cards List */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <label>
            此類別沒有建議卡
          </label>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map(item => (
            <SuggestionCardV2
              key={item.id}
              item={item}
              isSelected={selectedIds.includes(item.id)}
              onToggleSelect={onToggleSelect}
              onConfirm={onConfirm}
              onReject={onReject}
              onEdit={onEdit}
              onViewSource={onViewSource}
            />
          ))}
        </div>
      )}
    </div>
  );
}