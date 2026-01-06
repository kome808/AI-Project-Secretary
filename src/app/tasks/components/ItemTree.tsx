import React, { useState, useMemo } from 'react';
import { Item, Member, WorkPackage } from '../../../lib/storage/types';
import { CompactItemCard } from './CompactItemCard';

interface ItemTreeProps {
  items: Item[];
  members: Member[];
  workPackages?: WorkPackage[];
  onUpdate: (itemId: string, updates: Partial<Item>) => Promise<boolean>;
  showAssignee?: boolean;
  showWorkPackage?: boolean;
}

export function ItemTree({
  items,
  members,
  workPackages,
  onUpdate,
  showAssignee = true,
  showWorkPackage = false,
}: ItemTreeProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Build tree structure
  const { rootItems, childrenMap } = useMemo(() => {
    const roots: Item[] = [];
    const childMap = new Map<string, Item[]>();

    items.forEach(item => {
      if (!item.parent_id) {
        roots.push(item);
      } else {
        const siblings = childMap.get(item.parent_id) || [];
        childMap.set(item.parent_id, [...siblings, item]);
      }
    });

    return { rootItems: roots, childrenMap: childMap };
  }, [items]);

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const renderItem = (item: Item, level: number = 0): React.ReactNode => {
    const children = childrenMap.get(item.id) || [];
    const isExpanded = expandedItems.has(item.id);

    return (
      <div key={item.id} className="space-y-2">
        <CompactItemCard
          item={item}
          members={members}
          workPackages={workPackages}
          children={children}
          level={level}
          onUpdate={onUpdate}
          showAssignee={showAssignee}
          showWorkPackage={showWorkPackage}
          onToggleExpand={toggleExpand}
          isExpanded={isExpanded}
        />
        
        {/* Render children if expanded */}
        {isExpanded && children.length > 0 && (
          <div className="space-y-2">
            {children.map(child => renderItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {rootItems.map(item => renderItem(item, 0))}
    </div>
  );
}
