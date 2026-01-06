import React from 'react';
import { Item, Member } from '../../../lib/storage/types';
import { DraggableWBSCard } from './DraggableWBSCard';

interface WBSTreeGroupProps {
  rootItem: Item;
  allItems: Item[];
  members: Member[];
  expandedItems: Set<string>;
  onToggleExpand: (itemId: string) => void;
  onItemUpdate: (itemId: string, updates: Partial<Item>) => Promise<boolean>;
  onEditItem: (item: Item) => void;
  onDeleteItem: (itemId: string) => Promise<boolean>;
  onDrop?: (itemId: string, targetParentId: string) => void;
  onMoveItem?: (draggedId: string, targetId: string, position: 'before' | 'after' | 'inside') => void;
  onAddSubTask?: (parentItem: Item) => void;
}

export function WBSTreeGroup({
  rootItem,
  allItems,
  members,
  expandedItems,
  onToggleExpand,
  onItemUpdate,
  onEditItem,
  onDeleteItem,
  onDrop,
  onMoveItem,
  onAddSubTask,
}: WBSTreeGroupProps) {
  const isExpanded = expandedItems.has(rootItem.id);
  
  // 取得此根任務的所有子任務（並排序）
  const children = allItems
    .filter(item => item.parent_id === rootItem.id)
    .sort((a, b) => {
      // 使用 meta.order 排序，如果沒有則用 created_at
      const orderA = a.meta?.order ?? new Date(a.created_at).getTime();
      const orderB = b.meta?.order ?? new Date(b.created_at).getTime();
      return orderA - orderB;
    });
  const hasChildren = children.length > 0;
  
  // 遞迴渲染子任務
  const renderChildren = (parentId: string, level: number = 2): JSX.Element[] => {
    const childItems = allItems
      .filter(item => item.parent_id === parentId)
      .sort((a, b) => {
        const orderA = a.meta?.order ?? new Date(a.created_at).getTime();
        const orderB = b.meta?.order ?? new Date(b.created_at).getTime();
        return orderA - orderB;
      });
    
    return childItems.map((child, index) => {
      const childChildren = allItems.filter(item => item.parent_id === child.id);
      const hasGrandchildren = childChildren.length > 0;
      const isChildExpanded = expandedItems.has(child.id);
      
      return (
        <div key={child.id} className={`relative ${index > 0 ? 'mt-3' : ''}`}>
          {/* 縮排指示線 */}
          <div 
            className="absolute left-0 top-0 bottom-0 border-l-2 border-muted"
            style={{ marginLeft: `${(level - 1) * 1.5}rem` }}
          />
          
          {/* 子任務卡片（可拖曳） */}
          <div style={{ marginLeft: `${level * 1.5}rem` }} className="relative">
            {/* 水平連接線 */}
            <div className="absolute left-0 top-1/2 w-4 border-t-2 border-muted" style={{ marginLeft: '-1.5rem' }} />
            
            <DraggableWBSCard
              item={child}
              members={members}
              isExpanded={isChildExpanded}
              level={level}
              hasChildren={hasGrandchildren}
              onToggleExpand={onToggleExpand}
              onItemUpdate={onItemUpdate}
              onEditItem={onEditItem}
              onDeleteItem={onDeleteItem}
              onMoveItem={onMoveItem || (() => {})}
              onAddSubTask={onAddSubTask}
              renderChildren={hasGrandchildren ? () => renderChildren(child.id, level + 1) : undefined}
            />
          </div>
        </div>
      );
    });
  };
  
  return (
    <div 
      className={`
        transition-all
      `}
    >
      <DraggableWBSCard
        item={rootItem}
        members={members}
        isExpanded={isExpanded}
        level={1}
        hasChildren={hasChildren}
        onToggleExpand={onToggleExpand}
        onItemUpdate={onItemUpdate}
        onEditItem={onEditItem}
        onDeleteItem={onDeleteItem}
        onMoveItem={onMoveItem || (() => {})}
        renderChildren={hasChildren ? () => renderChildren(rootItem.id) : undefined}
        onAddSubTask={onAddSubTask}
      />
    </div>
  );
}