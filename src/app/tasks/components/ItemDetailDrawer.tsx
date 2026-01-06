import React, { useState } from 'react';
import { Calendar, User, FileText, Clock, AlertTriangle, Tag, X } from 'lucide-react';
import { Item, Member } from '../../../lib/storage/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ArtifactView } from '@/features/inbox/components/ArtifactView';
import { toast } from 'sonner';
import { STATUS_LABELS, getStatusColor, STATUS_OPTIONS } from '../../../lib/storage/statusHelpers';
import { TYPE_LABELS, getTypeColor } from '../../../lib/storage/typeHelpers';

interface ItemDetailDrawerProps {
  item: Item | null;
  members: Member[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (itemId: string, updates: Partial<Item>) => Promise<boolean>;
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

export function ItemDetailDrawer({
  item,
  members,
  open,
  onOpenChange,
  onUpdate,
}: ItemDetailDrawerProps) {
  const [showArtifact, setShowArtifact] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  if (!item) return null;

  const formatDate = (dateString?: string) => {
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
    if (!item.assignee) return '未指派';
    const member = members.find((m) => m.email === item.assignee);
    return member?.name || item.assignee;
  };

  const getAvailableStatuses = () => {
    // 根據 rules.md：Decision 類型不提供狀態下拉
    if (item.type === 'decision') {
      return [];
    }
    
    // 其他所有類型使用統一的 5 個狀態
    return ['not_started', 'in_progress', 'blocked', 'awaiting_response', 'completed'];
  };

  const daysInfo = getDaysInfo();

  // Decision 類型不提供狀態選擇器
  const showStatusSelector = item.type !== 'decision';

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-[90vw] sm:w-[600px] sm:max-w-[50vw] overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <span>任務詳情</span>
            </SheetTitle>
            <SheetDescription>
              <span>查看與編輯任務完整資訊</span>
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Type Badge */}
            <div>
              <Badge
                variant="outline"
                className={getTypeColor(item.type) + ' bg-accent/10 text-accent border-accent/30'}
              >
                <Tag className="w-3 h-3 mr-1" />
                {TYPE_LABELS[item.type] || item.type}
              </Badge>
            </div>

            {/* Title */}
            <div>
              <label className="block text-muted-foreground mb-2">標題</label>
              <h2 className="leading-relaxed">{item.title}</h2>
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

            {/* Status */}
            {showStatusSelector && (
              <div>
                <label className="block text-muted-foreground mb-3">狀態</label>
                <Select
                  value={item.status}
                  onValueChange={handleStatusChange}
                  disabled={isUpdating}
                >
                  <SelectTrigger
                    className={`w-full h-10 font-medium border ${
                      getStatusColor(item.status) || 'bg-gray-50'
                    }`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableStatuses().map((status) => (
                      <SelectItem key={status} value={status}>
                        {STATUS_LABELS[status] || status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Assignee */}
            <div>
              <label className="block text-muted-foreground mb-2">負責人</label>
              <div className="flex items-center gap-2 text-foreground">
                <User className="h-4 w-4 text-muted-foreground" />
                <label>{getAssigneeName()}</label>
              </div>
            </div>

            {/* Due Date */}
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
                  <label
                    className={
                      daysInfo?.isOverdue
                        ? 'text-destructive'
                        : daysInfo?.isToday
                        ? 'text-amber-600'
                        : 'text-foreground'
                    }
                  >
                    {formatDate(item.due_date)}
                  </label>
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
                  <label>{item.meta.waiting_on_name}</label>
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

            <Separator />

            {/* Source Citation */}
            {item.source_artifact_id && (
              <div>
                <label className="block text-muted-foreground mb-3">來源引用</label>
                <Button
                  variant="outline"
                  onClick={() => setShowArtifact(true)}
                  className="w-full justify-start"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  <label className="cursor-pointer">查看原始來源內容</label>
                </Button>
              </div>
            )}

            {/* Metadata */}
            <div className="pt-4 border-t border-border/50">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-muted-foreground mb-1">建立時間</label>
                  <label className="text-foreground/80">{formatDateTime(item.created_at)}</label>
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">更新時間</label>
                  <label className="text-foreground/80">{formatDateTime(item.updated_at)}</label>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

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