import React from 'react';
import { Item, PendingMeta } from '../../lib/storage/types';
import { PendingCard } from './PendingCard';
import { Clock } from 'lucide-react';

interface PendingListProps {
  items: Item[];
  onItemClick: (item: Item) => void;
}

export function PendingList({ items, onItemClick }: PendingListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-lg">
        <Clock className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-foreground mb-2">目前沒有待確認事項</h3>
        <p className="text-muted-foreground">所有等待事項都已處理完成</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <PendingCard
          key={item.id}
          item={item}
          onClick={() => onItemClick(item)}
        />
      ))}
    </div>
  );
}
