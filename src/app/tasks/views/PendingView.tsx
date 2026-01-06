import React, { useState, useMemo } from 'react';
import { Filter, RefreshCw, MessageSquare, Clock, Plus } from 'lucide-react';
import { Item, Member, Project } from '../../../lib/storage/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ExpandableItemCard } from '../components/ExpandableItemCard';
import { GeneralItemDialog } from '../components/GeneralItemDialog';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { getStorageClient } from '../../../lib/storage';
import { toast } from 'sonner';

interface PendingViewProps {
  items: Item[];
  members: Member[];
  project: Project;
  loading: boolean;
  onItemUpdate: (itemId: string, updates: Partial<Item>) => Promise<boolean>;
  onRefresh: () => void;
}

type FilterType = 'all' | 'client' | 'internal' | 'external' | 'overdue';

export function PendingView({ 
  items, 
  members, 
  project,
  loading, 
  onItemUpdate,
  onRefresh 
}: PendingViewProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | undefined>(undefined);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingItem, setDeletingItem] = useState<Item | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const pendingItems = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 根據 rules.md：待確認 TAB 顯示 Type = pending 的 Items（未完成）
    return items
      .filter(item => 
        item.type === 'pending' && 
        item.status !== 'completed'  // 使用新的狀態值
      )
      .map(item => {
        const createdDate = new Date(item.created_at);
        const waitingDays = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        
        let isOverdue = false;
        if (item.due_date) {
          const dueDate = new Date(item.due_date);
          dueDate.setHours(0, 0, 0, 0);
          isOverdue = dueDate < today;
        }

        return {
          ...item,
          waitingDays,
          isOverdue,
          waitingOnType: item.meta?.waiting_on_type || 'external'
        };
      })
      .sort((a, b) => {
        // Sort: overdue > longest waiting > others
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
        return b.waitingDays - a.waitingDays;
      });
  }, [items]);

  const filteredPending = useMemo(() => {
    if (filter === 'all') return pendingItems;
    if (filter === 'overdue') return pendingItems.filter(p => p.isOverdue);
    return pendingItems.filter(p => p.waitingOnType === filter);
  }, [pendingItems, filter]);

  const counts = {
    all: pendingItems.length,
    client: pendingItems.filter(p => p.waitingOnType === 'client').length,
    internal: pendingItems.filter(p => p.waitingOnType === 'internal').length,
    external: pendingItems.filter(p => p.waitingOnType === 'external').length,
    overdue: pendingItems.filter(p => p.isOverdue).length,
  };

  const handleSaveItem = async (data: Partial<Item>) => {
    const storage = getStorageClient();
    
    if (editingItem) {
      // Update existing item
      const { data: result, error } = await storage.updateItem(editingItem.id, data);
      if (!error && result) {
        toast.success('待確認事項已更新');
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
        type: 'pending',
        project_id: project.id,
      };
      const { data: result, error } = await storage.createItem(newItemData);
      if (!error && result) {
        toast.success('待確認事項已新增');
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
      toast.success('待確認事項已刪除');
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

  return (
    <div className="space-y-6">
      {/* Filter Bar and Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <div className="flex items-center gap-1 shrink-0">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <label className="text-muted-foreground">篩選：</label>
          </div>
          <Badge
            variant={filter === 'all' ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setFilter('all')}
          >
            全部 ({counts.all})
          </Badge>
          <Badge
            variant={filter === 'client' ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setFilter('client')}
          >
            等客戶 ({counts.client})
          </Badge>
          <Badge
            variant={filter === 'internal' ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setFilter('internal')}
          >
            等內部 ({counts.internal})
          </Badge>
          <Badge
            variant={filter === 'external' ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setFilter('external')}
          >
            等外部 ({counts.external})
          </Badge>
          <Badge
            variant={filter === 'overdue' ? 'default' : 'outline'}
            className={`cursor-pointer whitespace-nowrap ${
              counts.overdue > 0 ? 'bg-destructive/10 text-destructive border-destructive/30' : ''
            }`}
            onClick={() => setFilter('overdue')}
          >
            <Clock className="w-3 h-3 mr-1" />
            逾期 ({counts.overdue})
          </Badge>
        </div>

        <div className="flex items-center gap-2">
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
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <MessageSquare className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-blue-700">
                <label>待回覆追蹤</label>
              </h3>
              <p className="text-muted-foreground">
                <label>
                  追蹤等待客戶、內部或外部回覆的事項。系統會顯示等待天數，逾期項目會醒目標示。
                </label>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending List */}
      {filteredPending.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center space-y-3">
              <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground opacity-30" />
              <div>
                <p className="text-muted-foreground">
                  <label>
                    {filter === 'all' 
                      ? '太好了！目前沒有待回覆事項'
                      : `沒有符合「${
                          filter === 'client' ? '等客戶' :
                          filter === 'internal' ? '等內部' :
                          filter === 'external' ? '等外部' :
                          '逾期'
                        }」的待回覆`
                    }
                  </label>
                </p>
                {filter === 'all' && (
                  <label className="text-muted-foreground opacity-70">
                    新的待回覆事項會在這裡出現
                  </label>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPending.map(item => (
            <ExpandableItemCard
              key={item.id}
              item={item}
              members={members}
              project={project}
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
              showAssignee={true}
              showType={true}
              isExpanded={expandedId === item.id}
              onToggleExpand={() => {
                setExpandedId(expandedId === item.id ? null : item.id);
              }}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <GeneralItemDialog
        item={editingItem}
        itemType="pending"
        projectId={project.id}
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