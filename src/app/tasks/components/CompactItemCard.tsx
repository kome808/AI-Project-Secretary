import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronDown, ChevronRight, Edit, Trash2, MoreVertical, Tag, ExternalLink } from 'lucide-react';
import { Item, Member } from '../../../lib/storage/types';
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
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { ItemNotes } from './ItemNotes';
import { toast } from 'sonner';
import { STATUS_LABELS, getStatusColor, getStatusLabel, STATUS_OPTIONS } from '../../../lib/storage/statusHelpers';
import { TYPE_LABELS, getTypeColor } from '../../../lib/storage/typeHelpers';

interface CompactItemCardProps {
  item: Item;
  members: Member[];
  onUpdate: (itemId: string, updates: Partial<Item>) => Promise<boolean>;
  onEdit: () => void;
  onDelete: () => Promise<boolean>;
  hideNotes?: boolean; // 是否隱藏備註區域（專案工作視圖使用）
}

export function CompactItemCard({
  item,
  members,
  onUpdate,
  onEdit,
  onDelete,
  hideNotes = false,
}: CompactItemCardProps) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleViewDetails = () => {
    navigate(`/tasks/${item.id}`);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
  };

  const getDaysInfo = () => {
    // Don't show overdue for completed tasks (handle both new 'completed' and legacy 'done' status)
    const status = item.status as string;
    if (!item.due_date || status === 'completed' || status === 'done') return null;

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

  const handleDelete = async () => {
    setIsDeleting(true);
    const success = await onDelete();
    setIsDeleting(false);

    if (success) {
      setShowDeleteConfirm(false);
      toast.success('任務已刪除');
    } else {
      toast.error('刪除失敗');
    }
  };

  const getAssigneeName = () => {
    if (!item.assignee_id) return '未指派';
    const member = members.find(m => m.id === item.assignee_id);
    return member?.name || item.assignee_id;
  };

  const daysInfo = getDaysInfo();

  return (
    <>
      <div className="bg-white border border-[#dee0e3] rounded-[var(--radius)] hover:border-accent/50 transition-all">
        {/* Compact Row */}
        <div className="px-3 py-2.5 flex items-center gap-2.5">
          {/* Expand toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="shrink-0 p-0.5 hover:bg-muted/50 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {/* Title - Click to view details */}
          <button
            onClick={handleViewDetails}
            className="flex-1 min-w-0 text-left hover:text-primary transition-colors"
          >
            <span className="line-clamp-1 text-[#333] hover:underline">{item.title}</span>
          </button>

          {/* Assignee */}
          <div className="shrink-0 text-[#69707d] text-sm min-w-[80px]">
            <span>{getAssigneeName()}</span>
          </div>

          {/* Status Badge */}
          <div className="shrink-0">
            <Badge
              variant="outline"
              className={`text-xs font-medium ${getStatusColor(item.status)}`}
            >
              {getStatusLabel(item.status)}
            </Badge>
          </div>

          {/* Type Badge - Removed */}
          {/* {item.type && (
            <div className="shrink-0">
              <Badge 
                variant="outline" 
                className={`text-xs font-medium ${getTypeColor(item.type)}`}
              >
                {TYPE_LABELS[item.type] || item.type}
              </Badge>
            </div>
          )} */}

          {/* Due Date */}
          {item.due_date && (
            <div className="shrink-0 flex items-center gap-1 text-[#69707d] text-sm min-w-[60px]">
              <span>{formatDate(item.due_date)}</span>
              {daysInfo && (
                <Badge variant="outline" className={`text-xs ${daysInfo.isOverdue ? 'bg-destructive/10 text-destructive border-destructive/30' :
                  daysInfo.isToday ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                  {daysInfo.text}
                </Badge>
              )}
            </div>
          )}

          {/* Actions Dropdown */}
          <div onClick={(e) => e.stopPropagation()} className="shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleViewDetails}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  查看詳情
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  編輯
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-destructive focus:text-white hover:text-white bg-[rgba(255,255,255,0)]"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  刪除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Expanded Detail */}
        {isExpanded && (
          <div className="border-t border-border px-3 py-3 space-y-3 bg-muted/10">
            {/* Description */}
            {item.description && (
              <div>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            )}

            {/* Updated Time */}
            {item.updated_at && (
              <div className="text-xs text-muted-foreground">
                <label>更新於 {formatDate(item.updated_at)}</label>
              </div>
            )}

            {/* Notes */}
            {!hideNotes && (
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
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDelete}
        title={`確定要刪除「${item.title}」嗎？`}
        description="此操作無法復原。"
        isDeleting={isDeleting}
      />
    </>
  );
}