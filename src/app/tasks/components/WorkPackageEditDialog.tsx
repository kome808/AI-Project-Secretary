import React, { useState, useEffect } from 'react';
import { WorkPackage, Member } from '../../../lib/storage/types';
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

interface WorkPackageEditDialogProps {
  workPackage?: WorkPackage;
  members: Member[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<WorkPackage>) => Promise<boolean>;
}

const STATUS_OPTIONS = [
  { value: 'not_started', label: '未開始' },
  { value: 'in_progress', label: '進行中' },
  { value: 'blocked', label: '卡關' },
  { value: 'completed', label: '已完成' },
  { value: 'on_hold', label: '暫停' },
];

export function WorkPackageEditDialog({
  workPackage,
  members,
  open,
  onOpenChange,
  onSave,
}: WorkPackageEditDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('not_started');
  const [ownerId, setOwnerId] = useState('none');
  const [targetDate, setTargetDate] = useState('');
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
    if (workPackage) {
      setTitle(workPackage.title || '');
      setDescription(workPackage.description || '');
      setStatus(workPackage.status || 'not_started');
      setOwnerId(workPackage.owner_id || 'none');
      setTargetDate(formatDateForInput(workPackage.target_date));
      setNotes(workPackage.notes || '');
    } else {
      // Reset for new work package
      setTitle('');
      setDescription('');
      setStatus('not_started');
      setOwnerId('none');
      setTargetDate('');
      setNotes('');
    }
  }, [workPackage, open]);

  const handleSave = async () => {
    if (!title.trim()) {
      return;
    }

    setIsSaving(true);
    const data: Partial<WorkPackage> = {
      title: title.trim(),
      description: description.trim(),
      status,
      owner_id: ownerId === 'none' ? undefined : ownerId,
      target_date: targetDate || undefined,
      notes: notes.trim() || undefined,
      notes_updated_at: notes.trim() !== (workPackage?.notes || '') ? new Date().toISOString() : workPackage?.notes_updated_at,
      notes_updated_by: notes.trim() !== (workPackage?.notes || '') ? 'dev@example.com' : workPackage?.notes_updated_by,
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
            {workPackage ? '編輯專案工作' : '新增專案工作'}
          </DialogTitle>
          <DialogDescription>
            {workPackage ? '修改專案工作的資訊' : '建立新的專案工作項目'}
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
              placeholder="輸入工作名稱"
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
              placeholder="詳細說明此工作的內容與目標"
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

          {/* Owner */}
          <div className="space-y-2">
            <Label htmlFor="owner">負責人</Label>
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger id="owner">
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

          {/* Target Date */}
          <div className="space-y-2">
            <Label htmlFor="target-date">目標日期</Label>
            <Input
              id="target-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
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