import React, { useState, useEffect } from 'react';
import { Item, Member } from '../../../lib/storage/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ItemEditDialogProps {
  item?: Item;
  workPackageId: string;
  members: Member[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<Item>) => Promise<boolean>;
  mode?: 'create' | 'edit'; // New prop
}

const STATUS_OPTIONS = [
  { value: 'not_started', label: '未開始' },
  { value: 'in_progress', label: '進行中' },
  { value: 'blocked', label: '卡關' },
  { value: 'done', label: '完成' },
];

export function ItemEditDialog({
  item,
  workPackageId,
  members,
  open,
  onOpenChange,
  onSave,
  mode = 'edit',
}: ItemEditDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('not_started');
  const [assigneeId, setAssigneeId] = useState('none');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 將 ISO 日期轉換為 YYYY-MM-DD 格式（供 input type="date" 使用）
  const formatDateForInput = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  useEffect(() => {
    if (item) {
      setTitle(item.title || '');
      setDescription(item.description || '');
      setStatus(item.status || 'not_started');
      setAssigneeId(item.assignee_id || 'none');
      setDueDate(formatDateForInput(item.due_date));
      setNotes(item.notes || '');
    } else {
      // Reset for new item
      setTitle('');
      setDescription('');
      setStatus('not_started');
      setAssigneeId('none');
      setDueDate('');
      setNotes('');
    }
  }, [item, open]);

  const handleSave = async () => {
    if (!title.trim()) {
      return;
    }

    setIsSaving(true);
    const data: Partial<Item> = {
      title: title.trim(),
      description: description.trim(),
      status: status as any,
      assignee_id: assigneeId === 'none' ? undefined : assigneeId,
      due_date: dueDate || undefined,
      notes: notes.trim() || undefined,
      notes_updated_at: notes.trim() !== (item?.notes || '') ? new Date().toISOString() : item?.notes_updated_at,
      notes_updated_by: notes.trim() !== (item?.notes || '') ? 'dev@example.com' : item?.notes_updated_by,
    };

    const success = await onSave(data);
    setIsSaving(false);

    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? '新增任務' : '編輯任務'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' ? '在此專案工作下建立新任務' : '修改任務的詳細資訊'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">名稱 *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="輸入任務名稱"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="詳細說明此任務的內容"
              rows={4}
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">狀態</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label htmlFor="assignee">負責人</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger id="assignee">
                <SelectValue placeholder="選擇負責人" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">無</SelectItem>
                {members.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="due-date">期限</Label>
            <Input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Notes - 備註欄位 */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2">
              <span>備註</span>
              <span className="text-muted-foreground font-normal">（選填）</span>
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="在此輸入備註或補充說明..."
              rows={3}
              className="resize-none"
            />
            {notes && (
              <p className="text-muted-foreground">
                {notes.length} 個字元
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={!title.trim() || isSaving}
          >
            {isSaving ? '儲存中...' : '儲存'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}