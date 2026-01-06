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

interface GeneralItemDialogProps {
  item?: Item;
  itemType: 'pending' | 'cr' | 'decision';
  projectId: string;
  members: Member[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<Item>) => Promise<boolean>;
}

// Pending 狀態選項
const PENDING_STATUS_OPTIONS = [
  { value: 'waiting', label: '待回覆' },
  { value: 'open', label: '未開始' },
  { value: 'in_progress', label: '進行中' },
  { value: 'blocked', label: '卡關' },
  { value: 'done', label: '已完成' },
];

// CR 狀態選項
const CR_STATUS_OPTIONS = [
  { value: 'requested', label: '已提出' },
  { value: 'reviewing', label: '評估中' },
  { value: 'approved', label: '已核准' },
  { value: 'rejected', label: '已駁回' },
  { value: 'implemented', label: '已實作' },
  { value: 'canceled', label: '已取消' },
];

// Decision 狀態選項
const DECISION_STATUS_OPTIONS = [
  { value: 'active', label: '有效' },
  { value: 'superseded', label: '已被取代' },
  { value: 'deprecated', label: '已廢止' },
];

// 等待對象類型
const WAITING_TYPE_OPTIONS = [
  { value: 'client', label: '客戶' },
  { value: 'internal', label: '內部' },
  { value: 'external', label: '外部' },
];

// 風險等級
const RISK_LEVEL_OPTIONS = [
  { value: 'low', label: '低風險' },
  { value: 'medium', label: '中風險' },
  { value: 'high', label: '高風險' },
];

// 優先級
const PRIORITY_OPTIONS = [
  { value: 'low', label: '低優先' },
  { value: 'medium', label: '中優先' },
  { value: 'high', label: '高優先' },
];

export function GeneralItemDialog({
  item,
  itemType,
  projectId,
  members,
  open,
  onOpenChange,
  onSave,
}: GeneralItemDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');
  const [assigneeEmail, setAssigneeEmail] = useState('none');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  
  // Pending 特定欄位
  const [waitingOnName, setWaitingOnName] = useState('');
  const [waitingOnType, setWaitingOnType] = useState('external');
  
  // CR 特定欄位
  const [riskLevel, setRiskLevel] = useState('low');
  
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
      setStatus(item.status || getDefaultStatus());
      setAssigneeEmail(item.assignee_id || 'none'); // 🔥 修正欄位名稱
      setDueDate(formatDateForInput(item.due_date));
      setPriority(item.priority || 'medium');
      
      // Pending 特定
      if (itemType === 'pending') {
        setWaitingOnName(item.meta?.waiting_on_name || '');
        setWaitingOnType(item.meta?.waiting_on_type || 'external');
      }
      
      // CR 特定
      if (itemType === 'cr') {
        setRiskLevel(item.meta?.risk_level || 'low');
      }
    } else {
      // Reset for new item
      resetForm();
    }
  }, [item, open, itemType]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStatus(getDefaultStatus());
    setAssigneeEmail('none');
    setDueDate('');
    setPriority('medium');
    setWaitingOnName('');
    setWaitingOnType('external');
    setRiskLevel('low');
  };

  const getDefaultStatus = () => {
    if (itemType === 'pending') return 'waiting';
    if (itemType === 'cr') return 'requested';
    if (itemType === 'decision') return 'active';
    return 'open';
  };

  const getStatusOptions = () => {
    if (itemType === 'pending') return PENDING_STATUS_OPTIONS;
    if (itemType === 'cr') return CR_STATUS_OPTIONS;
    if (itemType === 'decision') return DECISION_STATUS_OPTIONS;
    return [];
  };

  const getDialogTitle = () => {
    const typeLabel = itemType === 'pending' ? '待確認' : itemType === 'cr' ? '變更' : '決議';
    return item ? `編輯${typeLabel}` : `新增${typeLabel}`;
  };

  const getDialogDescription = () => {
    const typeLabel = itemType === 'pending' ? '待確認事項' : itemType === 'cr' ? '需求變更' : '決議記錄';
    return item ? `修改${typeLabel}的詳細資訊` : `建立新的${typeLabel}`;
  };

  const handleSave = async () => {
    if (!title.trim()) {
      return;
    }

    setIsSaving(true);
    const data: Partial<Item> = {
      title: title.trim(),
      description: description.trim(),
      status,
      type: itemType,
      assignee_id: assigneeEmail === 'none' ? undefined : assigneeEmail, // 🔥 修正欄位名稱
      due_date: dueDate || undefined,
      priority,
      project_id: projectId,
    };

    // 添加 meta 資料
    const meta: Record<string, any> = {};
    
    if (itemType === 'pending') {
      if (waitingOnName.trim()) {
        meta.waiting_on_name = waitingOnName.trim();
        meta.waiting_on_type = waitingOnType;
      }
    }
    
    if (itemType === 'cr') {
      meta.risk_level = riskLevel;
    }
    
    if (itemType === 'decision') {
      meta.status = status; // Decision 的 meta.status 用於追蹤有效性
    }
    
    if (Object.keys(meta).length > 0) {
      data.meta = meta;
    }

    const success = await onSave(data);
    setIsSaving(false);

    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>{getDialogDescription()}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">標題 *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                itemType === 'pending' ? '輸入待確認事項' :
                itemType === 'cr' ? '輸入變更需求' :
                '輸入決議內容'
              }
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">詳細描述</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="詳細說明"
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
                {getStatusOptions().map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pending 特定欄位：等待對象 */}
          {itemType === 'pending' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="waiting-on-name">等待對象</Label>
                <Input
                  id="waiting-on-name"
                  value={waitingOnName}
                  onChange={(e) => setWaitingOnName(e.target.value)}
                  placeholder="例如：客戶張先生、行銷部"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="waiting-type">對象類型</Label>
                <Select value={waitingOnType} onValueChange={setWaitingOnType}>
                  <SelectTrigger id="waiting-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WAITING_TYPE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* CR 特定欄位：風險等級 */}
          {itemType === 'cr' && (
            <div className="space-y-2">
              <Label htmlFor="risk-level">風險等級</Label>
              <Select value={riskLevel} onValueChange={setRiskLevel}>
                <SelectTrigger id="risk-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RISK_LEVEL_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Assignee */}
          <div className="space-y-2">
            <Label htmlFor="assignee">負責人</Label>
            <Select value={assigneeEmail} onValueChange={setAssigneeEmail}>
              <SelectTrigger id="assignee">
                <SelectValue placeholder="選擇負責人" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">無</SelectItem>
                {members.map(member => (
                  <SelectItem key={member.id} value={member.email}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">優先級</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger id="priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
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
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t pt-4">
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