import React, { useState, useMemo } from 'react';
import { Filter, RefreshCw, GitBranch, AlertTriangle, Plus } from 'lucide-react';
import { Item, Member, Project } from '../../../lib/storage/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ExpandableItemCard } from '../components/ExpandableItemCard';
import { GeneralItemDialog } from '../components/GeneralItemDialog';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { getStorageClient } from '../../../lib/storage';
import { toast } from 'sonner';

interface CRViewProps {
  items: Item[];
  members: Member[];
  project: Project;
  loading: boolean;
  onItemUpdate: (itemId: string, updates: Partial<Item>) => Promise<boolean>;
  onRefresh: () => void;
}

type FilterType = 'all' | 'high_risk' | 'not_started' | 'in_progress' | 'blocked' | 'awaiting_response';

export function CRView({ 
  items, 
  members, 
  project,
  loading, 
  onItemUpdate,
  onRefresh 
}: CRViewProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | undefined>(undefined);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingItem, setDeletingItem] = useState<Item | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const changeRequests = useMemo(() => {
    // 根據 rules.md：變更 TAB 顯示 Type = cr 的 Items（未完成）
    return items
      .filter(item => 
        item.type === 'cr' && 
        item.status !== 'completed'  // 使用統一狀態值
      )
      .sort((a, b) => {
        // Sort: high risk > status > created date
        const aRisk = a.meta?.risk_level || 'low';
        const bRisk = b.meta?.risk_level || 'low';
        const riskOrder = { high: 0, medium: 1, low: 2 };
        
        if (aRisk !== bRisk) {
          return riskOrder[aRisk as keyof typeof riskOrder] - riskOrder[bRisk as keyof typeof riskOrder];
        }
        
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [items]);

  const filteredCRs = useMemo(() => {
    if (filter === 'all') return changeRequests;
    if (filter === 'high_risk') return changeRequests.filter(cr => cr.meta?.risk_level === 'high');
    // 使用統一的狀態值進行篩選
    return changeRequests.filter(cr => cr.status === filter);
  }, [changeRequests, filter]);

  const counts = {
    all: changeRequests.length,
    high_risk: changeRequests.filter(cr => cr.meta?.risk_level === 'high').length,
    not_started: changeRequests.filter(cr => cr.status === 'not_started').length,
    in_progress: changeRequests.filter(cr => cr.status === 'in_progress').length,
    blocked: changeRequests.filter(cr => cr.status === 'blocked').length,
    awaiting_response: changeRequests.filter(cr => cr.status === 'awaiting_response').length,
  };

  const handleSaveItem = async (data: Partial<Item>) => {
    const storage = getStorageClient();
    
    if (editingItem) {
      // Update existing item
      const { data: result, error } = await storage.updateItem(editingItem.id, data);
      if (!error && result) {
        toast.success('變更需求已更新');
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
        type: 'cr',
        project_id: project.id,
      };
      const { data: result, error } = await storage.createItem(newItemData);
      if (!error && result) {
        toast.success('變更需求已新增');
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
      toast.success('變更需求已刪除');
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
      {/* Filter Bar */}
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
            variant={filter === 'high_risk' ? 'default' : 'outline'}
            className={`cursor-pointer whitespace-nowrap ${
              counts.high_risk > 0 ? 'bg-red-50 text-red-700 border-red-200' : ''
            }`}
            onClick={() => setFilter('high_risk')}
          >
            <AlertTriangle className="w-3 h-3 mr-1" />
            高風險 ({counts.high_risk})
          </Badge>
          <Badge
            variant={filter === 'not_started' ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setFilter('not_started')}
          >
            尚未開始 ({counts.not_started})
          </Badge>
          <Badge
            variant={filter === 'in_progress' ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setFilter('in_progress')}
          >
            進行中 ({counts.in_progress})
          </Badge>
          <Badge
            variant={filter === 'blocked' ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setFilter('blocked')}
          >
            已封鎖 ({counts.blocked})
          </Badge>
          <Badge
            variant={filter === 'awaiting_response' ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setFilter('awaiting_response')}
          >
            等待回應 ({counts.awaiting_response})
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
      <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <GitBranch className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-orange-700">
                <label>需求變更管理</label>
              </h3>
              <p className="text-muted-foreground">
                <label>
                  追蹤所有需求變更的狀態、風險與影響範圍。高風險變更會醒目標示，確保團隊充分評估。
                </label>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CR List */}
      {filteredCRs.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center space-y-3">
              <GitBranch className="h-16 w-16 mx-auto text-muted-foreground opacity-30" />
              <div>
                <p className="text-muted-foreground">
                  <label>
                    {filter === 'all' 
                      ? '目前沒有需求變更'
                      : `沒有符合「${
                          filter === 'high_risk' ? '高風險' :
                          filter === 'not_started' ? '尚未開始' :
                          filter === 'in_progress' ? '進行中' :
                          filter === 'blocked' ? '已封鎖' :
                          '等待回應'
                        }」的變更`
                    }
                  </label>
                </p>
                {filter === 'all' && (
                  <label className="text-muted-foreground opacity-70">
                    新的變更需求會在這裡出現
                  </label>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredCRs.map(item => (
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
              isExpanded={expandedId === item.id}
              onToggleExpand={() => {
                setExpandedId(expandedId === item.id ? null : item.id);
              }}
            />
          ))}
        </div>
      )}

      {/* High Risk Warning */}
      {counts.high_risk > 0 && filter !== 'high_risk' && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
              <div>
                <p className="text-red-700">
                  <label>
                    目前有 {counts.high_risk} 項高風險變更需要關注
                  </label>
                </p>
                <button
                  onClick={() => setFilter('high_risk')}
                  className="text-red-600 hover:text-red-700 underline mt-1"
                >
                  <label className="cursor-pointer">查看高風險變更 →</label>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <GeneralItemDialog
        item={editingItem}
        itemType="cr"
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