import React from 'react';
import { useDrop } from 'react-dnd';
import { Item, Member } from '../../../lib/storage/types';
import { WBSTreeGroup } from './WBSTreeGroup';
import { Package } from 'lucide-react';

interface WorkPackageGroupProps {
  workPackageId: string | null;
  items: Item[];
  members: Member[];
  expandedItems: Set<string>;
  onItemUpdate: (itemId: string, updates: Partial<Item>) => Promise<boolean>;
  onDrop: (itemId: string, targetWorkPackageId: string | null) => void;
  onEditItem: (item: Item) => void;
  onDeleteItem: (itemId: string) => Promise<boolean>;
  onMoveItem: (draggedId: string, targetId: string, position: 'before' | 'after' | 'inside') => void;
  onAddSubTask: (parentItem: Item) => void;
  onToggleExpand: (itemId: string) => void;
}

export function WorkPackageGroup({
  workPackageId,
  items,
  members,
  expandedItems,
  onItemUpdate,
  onDrop,
  onEditItem,
  onDeleteItem,
  onMoveItem,
  onAddSubTask,
  onToggleExpand,
}: WorkPackageGroupProps) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ['TASK_CARD', 'WBS_CARD'],
    drop: (item: { id: string; currentWorkPackageId: string | null }) => {
      // Allow dropping if not already in this WP
      if (item.currentWorkPackageId !== workPackageId) {
        onDrop(item.id, workPackageId);
      }
    },
    canDrop: (item: { id: string; currentWorkPackageId: string | null }) => {
      return item.currentWorkPackageId !== workPackageId;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [workPackageId, onDrop]);

  const isActive = isOver && canDrop;

  // Identify root items within this Work Package
  // Roots are items that either have no parent OR their parent is not in this WP
  const rootItems = items.filter(item => {
    if (!item.parent_id) return true;
    const parentInGroup = items.some(i => i.id === item.parent_id);
    return !parentInGroup;
  }).sort((a, b) => {
    const orderA = a.meta?.order ?? new Date(a.created_at).getTime();
    const orderB = b.meta?.order ?? new Date(b.created_at).getTime();
    return orderA - orderB;
  });

  return (
    <div
      ref={drop}
      className={`
        min-h-24 p-4 rounded-lg border-2 border-dashed transition-all
        ${isActive 
          ? 'border-primary bg-primary/5' 
          : canDrop && isOver
          ? 'border-primary/50 bg-primary/5'
          : 'border-transparent bg-muted/20'
        }
      `}
    >
      {items.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <label>
            {isActive 
              ? '放開以移動任務到此群組' 
              : '目前沒有任務'
            }
          </label>
        </div>
      ) : (
        <div className="space-y-3">
          {rootItems.map((rootItem) => (
            <WBSTreeGroup
              key={rootItem.id}
              rootItem={rootItem}
              allItems={items}
              members={members}
              expandedItems={expandedItems}
              onToggleExpand={onToggleExpand}
              onItemUpdate={onItemUpdate}
              onEditItem={onEditItem}
              onDeleteItem={onDeleteItem}
              onMoveItem={onMoveItem}
              onAddSubTask={onAddSubTask}
            />
          ))}
        </div>
      )}
    </div>
  );
}
