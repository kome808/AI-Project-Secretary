import React, { useState } from 'react';
import { Calendar, User, Flag, Edit2, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export interface TaskSuggestion {
  id: string;
  title: string;
  description: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  type: 'action' | 'decision' | 'pending' | 'cr';
  assignee_id?: string;
  selected: boolean;
}

interface TaskPreviewCardProps {
  task: TaskSuggestion;
  onUpdate: (id: string, updates: Partial<TaskSuggestion>) => void;
  members?: Array<{ id: string; name: string; email: string }>;
}

const PRIORITY_COLORS = {
  high: 'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-blue-50 text-blue-700 border-blue-200',
};

const TYPE_LABELS = {
  action: '待辦',
  decision: '決議',
  pending: '待回覆',
  cr: '變更',
};

export function TaskPreviewCard({ task, onUpdate, members = [] }: TaskPreviewCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: task.title,
    description: task.description,
    due_date: task.due_date || '',
    priority: task.priority,
    assignee_id: task.assignee_id || '',
  });

  const handleSave = () => {
    onUpdate(task.id, editForm);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditForm({
      title: task.title,
      description: task.description,
      due_date: task.due_date || '',
      priority: task.priority,
      assignee_id: task.assignee_id || '',
    });
    setIsEditing(false);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '未設定';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  return (
    <div
      className={`
        p-4 rounded-[var(--radius-lg)] border-2 transition-all
        ${task.selected 
          ? 'bg-primary/5 border-primary' 
          : 'bg-background border-border opacity-60'
        }
      `}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <Checkbox
          checked={task.selected}
          onCheckedChange={(checked) => onUpdate(task.id, { selected: !!checked })}
          className="mt-1"
        />

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-3">
          {isEditing ? (
            // Edit Mode
            <>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                placeholder="任務標題"
                className="font-medium"
              />
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="任務描述"
                className="min-h-20"
              />
              
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">到期日</label>
                  <Input
                    type="date"
                    value={editForm.due_date}
                    onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">優先級</label>
                  <Select
                    value={editForm.priority}
                    onValueChange={(value: 'low' | 'medium' | 'high') =>
                      setEditForm({ ...editForm, priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">低</SelectItem>
                      <SelectItem value="medium">中</SelectItem>
                      <SelectItem value="high">高</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">負責人</label>
                  <Select
                    value={editForm.assignee_id}
                    onValueChange={(value) => setEditForm({ ...editForm, assignee_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="未指定" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">未指定</SelectItem>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} className="gap-1.5">
                  <Check className="h-4 w-4" />
                  儲存
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancel} className="gap-1.5">
                  <X className="h-4 w-4" />
                  取消
                </Button>
              </div>
            </>
          ) : (
            // View Mode
            <>
              <div className="flex items-start justify-between gap-2">
                <h4 className="flex-1 leading-snug">{task.title}</h4>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(true)}
                  className="shrink-0 h-8 w-8 p-0"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>

              {task.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {task.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                {/* Type Badge */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <label className="opacity-60">類型：</label>
                  <label>{TYPE_LABELS[task.type]}</label>
                </div>

                {/* Due Date */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <label>{formatDate(task.due_date)}</label>
                </div>

                {/* Priority */}
                <div
                  className={`
                    flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border
                    ${PRIORITY_COLORS[task.priority]}
                  `}
                >
                  <Flag className="h-3.5 w-3.5" />
                  <label>
                    {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                  </label>
                </div>

                {/* Assignee */}
                {task.assignee_id && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    <label>
                      {members.find((m) => m.id === task.assignee_id)?.name || task.assignee_id}
                    </label>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
