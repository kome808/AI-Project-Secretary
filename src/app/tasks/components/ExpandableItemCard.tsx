import React, { useState } from 'react';
import { Calendar, User, FileText, Clock, AlertTriangle, ChevronDown, ChevronUp, Tag, Edit, Trash2, MoreVertical } from 'lucide-react';
import { Item, Member, Project } from '../../../lib/storage/types';
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
import { Separator } from '@/components/ui/separator';
import { ArtifactView } from '@/features/inbox/components/ArtifactView';
import { ItemNotes } from './ItemNotes';
import { toast } from 'sonner';
import { canEditStatus, getCurrentUser, getPermissionDeniedReason } from '@/lib/permissions/statusPermissions';
import { STATUS_LABELS, getStatusColor } from '../../../lib/storage/statusHelpers';
import { TYPE_LABELS, getTypeColor } from '../../../lib/storage/typeHelpers';

interface ExpandableItemCardProps {
  item: Item;
  members: Member[];
  project: Project;
  onUpdate: (itemId: string, updates: Partial<Item>) => Promise<boolean>;
  onEdit?: () => void;
  onDelete?: () => Promise<boolean>;
  showAssignee?: boolean;
  showType?: boolean;
  extraBadge?: React.ReactNode;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const PRIORITY_LABELS: Record<string, string> = {
  high: '高優先',
  medium: '中優先',
  low: '低優先',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-blue-50 text-blue-700 border-blue-200',
  low: 'bg-gray-50 text-gray-600 border-gray-200',
};

export function ExpandableItemCard({
  item,
  members,
  project,
  onUpdate,
  onEdit,
  onDelete,
  showAssignee = true,
  showType = false,
  extraBadge,
  isExpanded = false,
  onToggleExpand,
}: ExpandableItemCardProps) {
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

  const formatDateFull = (dateString?: string) => {
    if (!dateString) return '未設定';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '未知';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDaysInfo = () => {
    if (!item.due_date) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(item.due_date);
    dueDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor(
      (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays < 0) {
      return { text: `逾期 ${Math.abs(diffDays)} 天`, isOverdue: true };
    } else if (diffDays === 0) {
      return { text: '今日到期', isToday: true };
    } else if (diffDays <= 3) {
      return { text: `${diffDays} 天後`, isSoon: true };
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
    if (!item.assignee) return '未指派';
    const member = members.find((m) => m.email === item.assignee);
    return member?.name || item.assignee;
  };

  const getAvailableStatuses = () => {
    // 根據 rules.md：所有任務類型使用統一的 5 個狀態
    // Decision 類型不提供狀態下拉（由 meta.status 控制生命週期）
    if (item.type === 'decision') {
      return [];
    }
    
    // 其他所有類型使用統一狀態
    return ['not_started', 'in_progress', 'blocked', 'awaiting_response', 'completed'];
  };

  // 決議類型不顯示狀態下拉
  const showStatusSelector = item.type !== 'decision';

  // 權限檢查：是否可以編輯狀態
  const currentUser = getCurrentUser();
  // 開發階段：如果沒有設置用戶，暫時允許所有編輯操作
  // 未來整合認證系統後，應該改為強制要求用戶登入
  const hasEditPermission = currentUser 
    ? canEditStatus(item, currentUser, project)
    : true; // 開發階段臨時允許

  const daysInfo = getDaysInfo();

  return (
    <>
      <div className={`bg-card border border-border rounded-[var(--radius-lg)] transition-all ${
        isExpanded ? 'shadow-[var(--elevation-md)] border-accent/30' : 'hover:border-accent/30 hover:shadow-[var(--elevation-sm)]'
      }`}>
        {/* Collapsed View */}
        <div
          className="p-4 cursor-pointer"
          onClick={onToggleExpand}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggleExpand?.();
            }
          }}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="line-clamp-2 mb-2">{item.title}</h3>
              {!isExpanded && item.description && (
                <p className="text-muted-foreground line-clamp-2">{item.description}</p>
              )}
            </div>

            {/* Status Selector - prevent click propagation */}
            <div onClick={(e) => e.stopPropagation()} className="shrink-0">
              {showStatusSelector ? (
                <Select
                  value={item.status}
                  onValueChange={handleStatusChange}
                  disabled={isUpdating || !hasEditPermission}
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

            {/* Expand/Collapse Icon */}
            <div className="shrink-0">
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Metadata - Collapsed */}
          {!isExpanded && (
            <div className="flex flex-wrap gap-3 items-center">
              {/* Type Badge */}
              {showType && (
                <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
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

              {/* Extra Badge */}
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
            </div>
          )}
        </div>

        {/* Expanded View */}
        {isExpanded && (
          <div className="px-4 pb-4 space-y-4 border-t border-border/50 pt-4 mt-2">
            {/* Actions Row */}
            {(onEdit || onDelete) && (
              <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onEdit && (
                      <DropdownMenuItem onClick={onEdit}>
                        <Edit className="h-4 w-4 mr-2" />
                        編輯
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <DropdownMenuItem 
                        onClick={onDelete}
                        className="text-destructive focus:text-white hover:text-white"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        刪除
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Type Badge */}
            <div>
              <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
                <Tag className="w-3 h-3 mr-1" />
                {TYPE_LABELS[item.type] || item.type}
              </Badge>
            </div>

            {/* Description */}
            {item.description && (
              <div>
                <label className="block text-muted-foreground mb-2">描述</label>
                <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {item.description}
                </p>
              </div>
            )}

            <Separator />

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Assignee */}
              <div>
                <label className="block text-muted-foreground mb-2">負責人</label>
                <div className="flex items-center gap-2 text-foreground">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{getAssigneeName()}</span>
                </div>
              </div>

              {/* Due Date */}
              {item.due_date && (
                <div>
                  <label className="block text-muted-foreground mb-2">期限</label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar
                        className={`h-4 w-4 ${
                          daysInfo?.isOverdue
                            ? 'text-destructive'
                            : daysInfo?.isToday
                            ? 'text-amber-600'
                            : 'text-muted-foreground'
                        }`}
                      />
                      <span
                        className={
                          daysInfo?.isOverdue
                            ? 'text-destructive'
                            : daysInfo?.isToday
                            ? 'text-amber-600'
                            : 'text-foreground'
                        }
                      >
                        {formatDateFull(item.due_date)}
                      </span>
                    </div>
                    {daysInfo && (
                      <Badge
                        variant="outline"
                        className={`${
                          daysInfo.isOverdue
                            ? 'bg-destructive/10 text-destructive border-destructive/30'
                            : daysInfo.isToday
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        {daysInfo.text}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Priority */}
              {item.priority && (
                <div>
                  <label className="block text-muted-foreground mb-2">優先級</label>
                  <Badge
                    variant="outline"
                    className={PRIORITY_COLORS[item.priority]}
                  >
                    {PRIORITY_LABELS[item.priority] || item.priority}
                  </Badge>
                </div>
              )}

              {/* CR Risk Level */}
              {item.type === 'cr' && item.meta?.risk_level && (
                <div>
                  <label className="block text-muted-foreground mb-2">風險等級</label>
                  <Badge
                    variant="outline"
                    className={`${
                      item.meta.risk_level === 'high'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : item.meta.risk_level === 'medium'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {item.meta.risk_level === 'high'
                      ? '高風險'
                      : item.meta.risk_level === 'medium'
                      ? '中風險'
                      : '低風險'}
                  </Badge>
                </div>
              )}

              {/* Pending - Waiting On */}
              {item.type === 'pending' && item.meta?.waiting_on_name && (
                <div>
                  <label className="block text-muted-foreground mb-2">等待對象</label>
                  <div className="flex items-center gap-2 text-foreground">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{item.meta.waiting_on_name}</span>
                    {item.meta.waiting_on_type && (
                      <Badge variant="outline" className="ml-2">
                        {item.meta.waiting_on_type === 'client'
                          ? '客戶'
                          : item.meta.waiting_on_type === 'internal'
                          ? '內部'
                          : '外部'}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Source Citation */}
            {item.source_artifact_id && (
              <div>
                <label className="block text-muted-foreground mb-3">來源引用</label>
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowArtifact(true);
                  }}
                  className="w-full justify-start"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  <span className="cursor-pointer">查看原來源內容</span>
                </Button>
              </div>
            )}

            {/* Metadata */}
            <div className="pt-4 border-t border-border/50">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-muted-foreground mb-1">建立時間</label>
                  <span className="text-foreground/80">{formatDateTime(item.created_at)}</span>
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">更新時間</label>
                  <span className="text-foreground/80">{formatDateTime(item.updated_at)}</span>
                </div>
              </div>
            </div>

            {/* Notes - prevent click propagation */}
            <div onClick={(e) => e.stopPropagation()}>
              <ItemNotes
                notes={item.notes}
                notesUpdatedAt={item.notes_updated_at}
                notesUpdatedBy={item.notes_updated_by}
                members={members}
                onSave={async (notes) => {
                  const success = await onUpdate(item.id, {
                    notes,
                    notes_updated_at: new Date().toISOString(),
                    notes_updated_by: 'dev@example.com',
                  });
                  if (success) {
                    toast.success('備註已更新');
                  } else {
                    toast.error('更新失敗');
                  }
                  return success;
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Artifact View Dialog */}
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