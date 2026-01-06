import React, { useEffect, useState } from 'react';
import { ListTodo, Kanban } from 'lucide-react';
import { Item } from '../../lib/storage/types';
import { getStorageClient } from '../../lib/storage';
import { useProject } from '../context/ProjectContext';
import { ActionsList } from './ActionsList';
import { ActionsBoard } from './ActionsBoard';
import { Button } from '@/components/ui/button';

type ViewMode = 'list' | 'board';

export function ActionsPage() {
  const { currentProject } = useProject();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  useEffect(() => {
    if (currentProject) {
      loadItems();
    }
  }, [currentProject]);

  const loadItems = async () => {
    if (!currentProject) return;

    setLoading(true);
    const storage = getStorageClient();
    const { data, error } = await storage.getItems(currentProject.id, { type: 'action' });

    if (!error && data) {
      // Filter out suggestions (inbox items) and archived items
      const activeActions = data.filter(
        item => item.status !== 'suggestion' && !item.meta?.archived
      );
      setItems(activeActions);
    }
    setLoading(false);
  };

  const handleItemUpdate = async () => {
    // Reload items after any update
    await loadItems();
  };

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">請先選擇專案</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ListTodo className="h-8 w-8 text-primary" />
          <div>
            <h1>待辦清單</h1>
            <p className="text-muted-foreground">
              追蹤已入庫的任務與執行進度
            </p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="gap-2"
          >
            <ListTodo className="h-4 w-4" />
            清單
          </Button>
          <Button
            variant={viewMode === 'board' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('board')}
            className="gap-2"
          >
            <Kanban className="h-4 w-4" />
            看板
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-pulse text-muted-foreground">載入中...</div>
        </div>
      ) : viewMode === 'list' ? (
        <ActionsList items={items} onUpdate={handleItemUpdate} />
      ) : (
        <ActionsBoard items={items} onUpdate={handleItemUpdate} />
      )}
    </div>
  );
}
