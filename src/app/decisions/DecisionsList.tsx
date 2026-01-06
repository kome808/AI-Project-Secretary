import React from 'react';
import { Item } from '../../lib/storage/types';
import { DecisionCard } from './DecisionCard';
import { Gavel } from 'lucide-react';

interface DecisionsListProps {
  items: Item[];
  onItemClick: (item: Item) => void;
}

export function DecisionsList({ items, onItemClick }: DecisionsListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-2xl border border-dashed border-border/60">
        <div className="p-5 bg-muted rounded-2xl mb-5 shadow-inner">
          <Gavel className="h-10 w-10 text-muted-foreground/50" />
        </div>
        <h3 className="mb-2 text-xl font-bold">尚無決議記錄</h3>
        <p className="text-muted-foreground max-w-sm text-center leading-relaxed">
          任何經由收件匣確認入庫或待確認事項轉換而來的決議或規則，將會顯示在此處供隨時查閱與引用。
        </p>
      </div>
    );
  }

  // Sort by created_at desc
  const sortedItems = [...items].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {sortedItems.map((item) => (
        <DecisionCard 
          key={item.id} 
          decision={item} 
          onClick={onItemClick} 
        />
      ))}
    </div>
  );
}