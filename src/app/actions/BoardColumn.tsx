import React from 'react';
import { useDrop } from 'react-dnd';
import { Item, ItemStatus } from '../../lib/storage/types';
import { ActionCard } from './ActionCard';

interface BoardColumnProps {
  title: string;
  status: ItemStatus;
  items: Item[];
  onDrop: (itemId: string, newStatus: ItemStatus) => void;
  onItemClick: (item: Item) => void;
}

export function BoardColumn({ title, status, items, onDrop, onItemClick }: BoardColumnProps) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'ACTION_CARD',
    drop: (item: { id: string }) => {
      onDrop(item.id, status);
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  // Sort: blocked/pending first in To Do column
  const sortedItems = [...items].sort((a, b) => {
    if (status === 'not_started') {
      const aBlocked = a.status === 'blocked' || a.status === 'awaiting_response';
      const bBlocked = b.status === 'blocked' || b.status === 'awaiting_response';
      if (aBlocked && !bBlocked) return -1;
      if (!aBlocked && bBlocked) return 1;
    }
    return 0;
  });

  return (
    <div className="flex flex-col h-full min-w-[300px]">
      {/* Column Header */}
      <div className="mb-4 flex items-center justify-between px-2">
        <h3 className="flex items-center gap-2 font-bold text-[var(--foreground)]">
          {title}
          <span className="text-[var(--muted-foreground)] text-sm font-normal bg-[var(--muted)] px-2 py-0.5 rounded-full">
            {items.length}
          </span>
        </h3>
      </div>

      {/* Column Content */}
      <div
        ref={drop}
        className={`flex-1 p-3 bg-[var(--muted)]/20 border-2 rounded-[var(--radius-lg)] min-h-[500px] transition-all duration-200 ${
          isOver 
            ? 'border-[var(--primary)] bg-[var(--primary)]/5 scale-[1.01]' 
            : 'border-transparent'
        }`}
      >
        <div className="space-y-4">
          {sortedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-[var(--muted-foreground)] border-2 border-dashed border-[var(--border)] rounded-[var(--radius-lg)]">
              <p className="text-sm">尚無任務</p>
            </div>
          ) : (
            sortedItems.map((item) => (
              <ActionCard
                key={item.id}
                item={item}
                onClick={() => onItemClick(item)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}