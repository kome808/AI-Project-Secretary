import React, { useState } from 'react';
import { Calendar, User, FileText, ChevronRight, Clock, AlertTriangle, Package, Edit, Trash2, MoreVertical, Tag } from 'lucide-react';
import { Item, Member, WorkPackage } from '../../../lib/storage/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArtifactView } from '@/features/inbox/components/ArtifactView';
import { toast } from 'sonner';
import { STATUS_LABELS, getStatusColor, getStatusLabel } from '../../../lib/storage/statusHelpers';
import { TYPE_LABELS, getTypeColor } from '../../../lib/storage/typeHelpers';

interface ItemCardProps {
  item: Item;
  members: Member[];
  workPackages?: WorkPackage[];
  onUpdate: (itemId: string, updates: Partial<Item>) => Promise<boolean>;
  onEdit?: () => void;
  onDelete?: () => Promise<boolean>;
  showAssignee?: boolean;
  showType?: boolean;
  showWorkPackage?: boolean;
  extraBadge?: React.ReactNode; // 自定義額外標籤（例如：等待天數）
  onClick?: () => void; // 卡片點擊事件
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-blue-50 text-blue-700 border-blue-200',
  low: 'bg-gray-50 text-gray-600 border-gray-200',
};

export function ItemCard({ 
  item, 
  members, 
  workPackages,
  onUpdate, 
  onEdit,
  onDelete,
  showAssignee = true,
  showType = false,
  showWorkPackage = false,
  extraBadge,
  onClick
}: ItemCardProps) {
  const [showArtifact, setShowArtifact] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', { 
      year: 'numeric',
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getDaysInfo = () => {
    if (!item.due_date) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(item.due_date);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: `逾期 ${Math.abs(diffDays)} 天`, isOverdue: true };
    } else if (diffDays === 0) {
      return { text: '今日到期', isToday: true };
    } else if (diffDays <= 3) {
      return { text: `${diffDays} 天後到期`, isSoon: true };
    }
    return null;
  };

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    const success = await onUpdate(item.id, { status: newStatus });
    if (success) {
      toast.success('狀態已更新');
    } else {
      toast.error('更新失敗');
    }
    setIsUpdating(false);
  };

  const getAssigneeName = () => {
    if (!item.assignee) return null;
    const member = members.find(m => m.email === item.assignee);
    return member?.name || item.assignee;
  };

  const daysInfo = getDaysInfo();

  // Get available statuses based on item type (根據 rules.md 使用統一狀態)
  const getAvailableStatuses = () => {
    // Decision 類型不提供狀態下拉（由 meta.status 控制生命週期）
    if (item.type === 'decision') {
      return [];
    }
    
    // 其他所有類型使用統一的 5 個狀態
    return ['not_started', 'in_progress', 'blocked', 'awaiting_response', 'completed'];
  };

  // Decision 類型不顯示狀態選擇器
  const showStatusSelector = item.type !== 'decision';

  return (
    <>
      <div 
        className={`bg-card border border-border rounded-[var(--radius-lg)] hover:border-accent/30 hover:shadow-[var(--elevation-sm)] transition-all group ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        } : undefined}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="line-clamp-2 mb-2">{item.title}</h3>
              {item.description && (
                <p className="text-muted-foreground line-clamp-2">{item.description}</p>
              )}
            </div>
            
            {/* Status Selector - prevent click propagation */}
            <div onClick={(e) => e.stopPropagation()} className="shrink-0">
              {showStatusSelector ? (
                <Select 
                  value={item.status} 
                  onValueChange={handleStatusChange}
                  disabled={isUpdating}
                >
                  <SelectTrigger className={`w-auto h-8 gap-2 font-medium border ${getStatusColor(item.status)}`}>
                    <SelectValue>
                      {STATUS_LABELS[item.status as keyof typeof STATUS_LABELS] || item.status}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableStatuses().map(status => (
                      <SelectItem key={status} value={status}>
                        {STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge 
                  variant="outline" 
                  className={`h-8 px-3 font-medium ${getStatusColor(item.status)}`}
                >
                  {STATUS_LABELS[item.status as keyof typeof STATUS_LABELS] || item.status}
                </Badge>
              )}
            </div>

            {/* Chevron indicator - only show if clickable */}
            {onClick && (
              <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            )}
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Type Badge */}
            {showType && (
              <Badge variant="outline" className={getTypeColor(item.type)}>
                <Tag className="w-3 h-3 mr-1" />
                {TYPE_LABELS[item.type] || item.type}
              </Badge>
            )}

            {/* Assignee */}
            {showAssignee && item.assignee && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{getAssigneeName()}</span>
              </div>
            )}

            {/* Due Date */}
            {item.due_date && (
              <div className="flex items-center gap-1.5">
                <Calendar className={`h-4 w-4 ${
                  daysInfo?.isOverdue ? 'text-destructive' :
                  daysInfo?.isToday ? 'text-amber-600' :
                  'text-muted-foreground'
                }`} />
                <span className={
                  daysInfo?.isOverdue ? 'text-destructive' :
                  daysInfo?.isToday ? 'text-amber-600' :
                  'text-muted-foreground'
                }>
                  {formatDate(item.due_date)}
                </span>
                {daysInfo && (
                  <Badge variant="outline" className={`ml-1 ${
                    daysInfo.isOverdue ? 'bg-destructive/10 text-destructive border-destructive/30' :
                    daysInfo.isToday ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {daysInfo.text}
                  </Badge>
                )}
              </div>
            )}

            {/* Priority */}
            {item.priority && item.priority !== 'medium' && (
              <Badge variant="outline" className={PRIORITY_COLORS[item.priority]}>
                {item.priority === 'high' ? '高優先' : '低優先'}
              </Badge>
            )}

            {/* Risk (for CR) */}
            {item.type === 'cr' && item.meta?.risk_level && (
              <Badge 
                variant="outline" 
                className={`${
                  item.meta.risk_level === 'high' ? 'bg-red-50 text-red-700 border-red-200' :
                  item.meta.risk_level === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-blue-50 text-blue-700 border-blue-200'
                }`}
              >
                <AlertTriangle className="w-3 h-3 mr-1" />
                {item.meta.risk_level === 'high' ? '高風險' : 
                 item.meta.risk_level === 'medium' ? '中風險' : '低風險'}
              </Badge>
            )}

            {/* Waiting days (for pending) */}
            {item.type === 'pending' && item.meta?.waiting_on_name && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>等待 {item.meta.waiting_on_name}</span>
              </div>
            )}

            {/* Work Package */}
            {showWorkPackage && item.work_package_id && workPackages && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Package className="h-4 w-4" />
                <span>
                  {workPackages.find(wp => wp.id === item.work_package_id)?.title || '未分類'}
                </span>
              </div>
            )}
            {showWorkPackage && !item.work_package_id && (
              <div className="flex items-center gap-1.5 text-muted-foreground/50">
                <Package className="h-4 w-4" />
                <span>未分類</span>
              </div>
            )}

            {/* Extra Badge (custom badge passed from parent) */}
            {extraBadge}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Citation */}
            {item.source_artifact_id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowArtifact(true);
                }}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-accent transition-colors group/citation"
              >
                <FileText className="h-4 w-4 group-hover/citation:scale-110 transition-transform" />
                <span className="cursor-pointer">來源</span>
              </button>
            )}

            {/* Edit/Delete */}
            {(onEdit || onDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <MoreVertical />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-40">
                  {onEdit && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      編輯
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem
                      onClick={async (e) => {
                        e.stopPropagation();
                        const success = await onDelete();
                        if (success) {
                          toast.success('項目已刪除');
                        } else {
                          toast.error('刪除失敗');
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      刪除
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Artifact Dialog */}
      {item.source_artifact_id && (
        <ArtifactView
          artifactId={item.source_artifact_id}
          open={showArtifact}
          onOpenChange={setShowArtifact}
        />
      )}
    </>
  );
}
