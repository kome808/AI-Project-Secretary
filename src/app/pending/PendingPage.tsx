import React, { useEffect, useState } from 'react';
import { Item, WaitingOnType, PendingMeta } from '../../lib/storage/types';
import { getStorageClient } from '../../lib/storage';
import { useProject } from '../context/ProjectContext';
import { PendingFilters } from './PendingFilters';
import { PendingList } from './PendingList';
import { PendingDetail } from './PendingDetail';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export function PendingPage() {
  const { currentProject } = useProject();
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [waitingOnFilter, setWaitingOnFilter] = useState<WaitingOnType | 'all'>('all');
  const [quickFilter, setQuickFilter] = useState<'all' | 'overdue' | 'recent'>('all');
  const [sortBy, setSortBy] = useState<'overdue' | 'waiting_days' | 'due_date' | 'recent'>('overdue');

  useEffect(() => {
    if (currentProject) {
      loadPendingItems();
    }
  }, [currentProject]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [items, searchQuery, waitingOnFilter, quickFilter, sortBy]);

  const loadPendingItems = async () => {
    if (!currentProject) return;
    setIsLoading(true);
    const storage = getStorageClient();
    const { data, error } = await storage.getItems(currentProject.id, { type: 'pending' });
    
    if (!error && data) {
      // 排除建議卡（suggestion）和已完成（done）的項目
      const activeItems = data.filter(item => 
        item.status !== 'suggestion' && item.status !== 'done'
      );
      setItems(activeItems);
    }
    setIsLoading(false);
  };

  const applyFiltersAndSort = () => {
    let filtered = [...items];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      );
    }

    // Waiting on filter
    if (waitingOnFilter !== 'all') {
      filtered = filtered.filter(item => {
        const meta = item.meta as PendingMeta | undefined;
        return meta?.waiting_on_type === waitingOnFilter;
      });
    }

    // Quick filter
    if (quickFilter === 'overdue') {
      const now = new Date();
      filtered = filtered.filter(item => {
        if (!item.due_date) return false;
        return new Date(item.due_date) < now;
      });
    } else if (quickFilter === 'recent') {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      filtered = filtered.filter(item => {
        return new Date(item.created_at) >= threeDaysAgo;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'overdue') {
        // Overdue items first, then by due date
        const now = new Date();
        const aOverdue = a.due_date && new Date(a.due_date) < now;
        const bOverdue = b.due_date && new Date(b.due_date) < now;
        
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        
        if (a.due_date && b.due_date) {
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }
        return 0;
      } else if (sortBy === 'waiting_days') {
        // Longest waiting first
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === 'due_date') {
        // Earliest due date first
        if (a.due_date && b.due_date) {
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }
        if (a.due_date) return -1;
        if (b.due_date) return 1;
        return 0;
      } else if (sortBy === 'recent') {
        // Most recent first
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return 0;
    });

    setFilteredItems(filtered);
  };

  const handleRefresh = () => {
    loadPendingItems();
  };

  const handleItemUpdate = () => {
    loadPendingItems();
    setSelectedItem(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>待確認事項</h1>
          <p className="text-muted-foreground mt-1">
            管理等待客戶、內部或外部單位回覆的事項
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          重新整理
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 border rounded-lg bg-card">
          <div className="text-muted-foreground">全部</div>
          <div className="text-foreground mt-1">{items.length}</div>
        </div>
        <div className="p-4 border rounded-lg bg-card">
          <div className="text-muted-foreground">等待客戶</div>
          <div className="text-accent mt-1">
            {items.filter(item => (item.meta as PendingMeta)?.waiting_on_type === 'client').length}
          </div>
        </div>
        <div className="p-4 border rounded-lg bg-card">
          <div className="text-muted-foreground">等待內部</div>
          <div className="text-foreground mt-1">
            {items.filter(item => (item.meta as PendingMeta)?.waiting_on_type === 'internal').length}
          </div>
        </div>
        <div className="p-4 border rounded-lg bg-card">
          <div className="text-muted-foreground">逾期未回覆</div>
          <div className="text-destructive mt-1">
            {items.filter(item => {
              if (!item.due_date) return false;
              return new Date(item.due_date) < new Date();
            }).length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <PendingFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        waitingOnFilter={waitingOnFilter}
        onWaitingOnFilterChange={setWaitingOnFilter}
        quickFilter={quickFilter}
        onQuickFilterChange={setQuickFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
      />

      {/* List */}
      <PendingList items={filteredItems} onItemClick={setSelectedItem} />

      {/* Detail Sidebar */}
      {selectedItem && (
        <PendingDetail
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdate={handleItemUpdate}
        />
      )}
    </div>
  );
}