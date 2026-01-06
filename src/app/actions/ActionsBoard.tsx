import React, { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Item, ItemStatus } from '../../lib/storage/types';
import { ActionCard } from './ActionCard';
import { ActionDetail } from './ActionDetail';
import { getStorageClient } from '../../lib/storage';
import { toast } from 'sonner';
import { BoardColumn } from './BoardColumn';

interface ActionsBoardProps {
  items: Item[];
  onUpdate: () => void;
}

export function ActionsBoard({ items, onUpdate }: ActionsBoardProps) {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  // Group items by status
  const todoItems = items.filter(item => item.status === 'not_started' || item.status === 'awaiting_response' || item.status === 'blocked');
  const doingItems = items.filter(item => item.status === 'in_progress');
  const doneItems = items.filter(item => item.status === 'completed');

  const handleDrop = async (itemId: string, newStatus: ItemStatus) => {
    const storage = getStorageClient();
    const { error } = await storage.updateItem(itemId, { status: newStatus });

    if (error) {
      toast.error('更新狀態失敗');
      return;
    }

    toast.success('狀態已更新');
    onUpdate();
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex gap-6 overflow-x-auto pb-6 -mx-4 px-4 scrollbar-hide">
        {/* To Do Column */}
        <BoardColumn
          title="待處理 (To Do)"
          status="not_started"
          items={todoItems}
          onDrop={handleDrop}
          onItemClick={setSelectedItem}
        />

        {/* Doing Column */}
        <BoardColumn
          title="執行中 (Doing)"
          status="in_progress"
          items={doingItems}
          onDrop={handleDrop}
          onItemClick={setSelectedItem}
        />

        {/* Done Column */}
        <BoardColumn
          title="已完成 (Done)"
          status="completed"
          items={doneItems}
          onDrop={handleDrop}
          onItemClick={setSelectedItem}
        />
      </div>

      {/* Detail Dialog */}
      {selectedItem && (
        <ActionDetail
          item={selectedItem}
          open={!!selectedItem}
          onOpenChange={(open) => !open && setSelectedItem(null)}
          onUpdate={() => {
            setSelectedItem(null);
            onUpdate();
          }}
        />
      )}
    </DndProvider>
  );
}