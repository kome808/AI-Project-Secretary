import React, { useState, useMemo } from 'react';
import { Filter, RefreshCw, FileCheck, Search, Plus } from 'lucide-react';
import { Item, Member } from '../../../lib/storage/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ItemCard } from '../components/ItemCard';
import { GeneralItemDialog } from '../components/GeneralItemDialog';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { getStorageClient } from '../../../lib/storage';
import { toast } from 'sonner';
import { useProject } from '@/app/context/ProjectContext';

interface DecisionsViewProps {
  items: Item[];
  members: Member[];
  loading: boolean;
  onItemUpdate: (itemId: string, updates: Partial<Item>) => Promise<boolean>;
  onRefresh: () => void;
}

type FilterType = 'active' | 'all';

export function DecisionsView({ 
  items, 
  members, 
  loading, 
  onItemUpdate,
  onRefresh 
}: DecisionsViewProps) {
  const { currentProject } = useProject();
  const [filter, setFilter] = useState<FilterType>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | undefined>(undefined);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingItem, setDeletingItem] = useState<Item | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const decisions = useMemo(() => {
    return items
      .filter(item => item.type === 'decision')
      .sort((a, b) => {
        // Sort: active first, then by created date (newest first)
        const aActive = a.meta?.status === 'active';
        const bActive = b.meta?.status === 'active';
        
        if (aActive !== bActive) return aActive ? -1 : 1;
        
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [items]);

  const filteredDecisions = useMemo(() => {
    let result = decisions;
    
    // Filter by status
    if (filter === 'active') {
      result = result.filter(d => d.meta?.status === 'active');
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(d => 
        d.title.toLowerCase().includes(query) ||
        d.description?.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [decisions, filter, searchQuery]);

  const counts = {
    active: decisions.filter(d => d.meta?.status === 'active').length,
    all: decisions.length,
  };

  const handleSaveItem = async (data: Partial<Item>) => {
    const storage = getStorageClient();
    
    if (editingItem) {
      // Update existing item
      const { data: result, error } = await storage.updateItem(editingItem.id, data);
      if (!error && result) {
        toast.success('決議已更新');
        onRefresh();
        return true;
      } else {
        toast.error('更新失敗');
        return false;
      }
    } else {
      // Create new item
      const newItemData: Partial<Item> = {
        ...data,
        type: 'decision',
        project_id: currentProject?.id,
      };
      const { data: result, error } = await storage.createItem(newItemData);
      if (!error && result) {
        toast.success('決議已新增');
        onRefresh();
        return true;
      } else {
        toast.error('新增失敗');
        return false;
      }
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    
    setIsDeleting(true);
    const storage = getStorageClient();
    const { error } = await storage.deleteItem(deletingItem.id);
    
    setIsDeleting(false);
    
    if (!error) {
      toast.success('決議已刪除');
      setShowDeleteDialog(false);
      setDeletingItem(null);
      onRefresh();
      return true;
    } else {
      toast.error('刪除失敗');
      return false;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">
            <label>載入中...</label>
          </p>
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-3">
          <FileCheck className="h-16 w-16 text-muted-foreground mx-auto opacity-30" />
          <p className="text-muted-foreground">
            <label>請先選擇專案</label>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 shrink-0">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <label className="text-muted-foreground">顯示：</label>
          </div>
          <Badge
            variant={filter === 'active' ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setFilter('active')}
          >
            有效決議 ({counts.active})
          </Badge>
          <Badge
            variant={filter === 'all' ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setFilter('all')}
          >
            全部 ({counts.all})
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="搜尋決議..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Button
            onClick={() => {
              setEditingItem(undefined);
              setShowDialog(true);
            }}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            新增
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            <label>重新整理</label>
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <FileCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-emerald-700">
                <label>決議記錄（SSOT）</label>
              </h3>
              <p className="text-muted-foreground">
                <label>
                  所有重要決議的單一事實來源。每筆決議都可追溯至來源對話或文件，作為後續爭議的依據。
                </label>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Decisions List */}
      {filteredDecisions.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center space-y-3">
              <FileCheck className="h-16 w-16 mx-auto text-muted-foreground opacity-30" />
              <div>
                <p className="text-muted-foreground">
                  <label>
                    {searchQuery.trim() 
                      ? '沒有找到符合的決議'
                      : filter === 'active'
                        ? '目前沒有有效的決議記錄'
                        : '目前沒有決議記錄'
                    }
                  </label>
                </p>
                {!searchQuery.trim() && (
                  <label className="text-muted-foreground opacity-70">
                    從會議記錄或對話中產生的決議會在這裡出現
                  </label>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredDecisions.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              members={members}
              onUpdate={onItemUpdate}
              onEdit={() => {
                setEditingItem(item);
                setShowDialog(true);
              }}
              onDelete={async () => {
                setDeletingItem(item);
                setShowDeleteDialog(true);
                return true;
              }}
              showAssignee={false}
              showType={true}
            />
          ))}
        </div>
      )}

      {/* Search Results Info */}
      {searchQuery.trim() && filteredDecisions.length > 0 && (
        <div className="text-center">
          <label className="text-muted-foreground">
            找到 {filteredDecisions.length} 筆符合「{searchQuery}」的決議
          </label>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <GeneralItemDialog
        item={editingItem}
        itemType="decision"
        projectId={currentProject.id}
        members={members}
        open={showDialog}
        onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) setEditingItem(undefined);
        }}
        onSave={handleSaveItem}
      />

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        title={`確定要刪除「${deletingItem?.title}」嗎？`}
        description="此操作無法復原。"
        isDeleting={isDeleting}
      />
    </div>
  );
}