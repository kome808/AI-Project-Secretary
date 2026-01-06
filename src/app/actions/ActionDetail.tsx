import React, { useState } from 'react';
import { Item, ItemStatus, ItemPriority } from '../../lib/storage/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Badge } from '@/components/ui/badge';
import { FileText, Trash2, Archive } from 'lucide-react';
import { getStorageClient } from '../../lib/storage';
import { toast } from 'sonner';
import { ArtifactView } from '@/features/inbox/components/ArtifactView';
import { User, Calendar, Loader2 } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { Member } from '../../lib/storage/types';

interface ActionDetailProps {
  item: Item;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function ActionDetail({ item, open, onOpenChange, onUpdate }: ActionDetailProps) {
  const { currentProject } = useProject();
  const [isEditing, setIsEditing] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  // 將 ISO 日期轉換為 YYYY-MM-DD 格式
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
  
  const [formData, setFormData] = useState({
    title: item.title,
    description: item.description,
    status: item.status,
    priority: item.priority || 'medium' as ItemPriority,
    assignee_id: item.assignee_id || '',
    due_date: formatDateForInput(item.due_date),
  });
  const [showArtifact, setShowArtifact] = useState(false);

  React.useEffect(() => {
    if (open && currentProject) {
      loadMembers();
    }
  }, [open, currentProject]);

  const loadMembers = async () => {
    if (!currentProject) return;
    setLoadingMembers(true);
    const storage = getStorageClient();
    const { data } = await storage.getMembers(currentProject.id);
    if (data) setMembers(data);
    setLoadingMembers(false);
  };

  const handleSave = async () => {
    const storage = getStorageClient();
    const { error } = await storage.updateItem(item.id, {
      title: formData.title,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      assignee_id: formData.assignee_id || undefined,
      due_date: formData.due_date || undefined,
      updated_at: new Date().toISOString()
    });

    if (error) {
      toast.error('更新失敗');
      return;
    }

    toast.success('已更新');
    setIsEditing(false);
    onUpdate();
  };

  const handleArchive = async () => {
    const storage = getStorageClient();
    const { error } = await storage.updateItem(item.id, {
      meta: { ...item.meta, archived: true },
      updated_at: new Date().toISOString()
    });

    if (error) {
      toast.error('封存失敗');
      return;
    }

    toast.success('已封存');
    onUpdate();
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!confirm('確定要刪除此任務？此操作無法復原。')) {
      return;
    }

    const storage = getStorageClient();
    const { error } = await storage.deleteItem(item.id);

    if (error) {
      toast.error('刪除失敗');
      return;
    }

    toast.success('已刪除');
    onUpdate();
  };

  const getStatusLabel = (status: ItemStatus) => {
    const labels: Record<ItemStatus, string> = {
      suggestion: '建議',
      open: '待處理',
      in_progress: '進行中',
      pending: '等待中',
      blocked: '已阻塞',
      done: '已完成',
    };
    return labels[status] || status;
  };

  const activeAssignees = members.filter(m => m.status === 'active' && m.role !== 'client');
  const currentAssignee = members.find(m => m.id === item.assignee_id);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-[var(--elevation-sm)]">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] border-[var(--accent)]/30 bg-[var(--accent)]/5">
                Action Item
              </Badge>
              {item.status === 'blocked' && (
                <Badge variant="destructive" className="text-[10px] font-bold bg-[var(--destructive)]">
                  Blocked
                </Badge>
              )}
            </div>
            <DialogTitle className="text-2xl font-bold text-[var(--foreground)]">
              {isEditing ? '編輯任務' : item.title}
            </DialogTitle>
            <DialogDescription className="text-[var(--muted-foreground)]">
              {isEditing ? '修改任務細節與執行資訊' : '追蹤任務執行狀態與證據來源'}
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-8">
            {/* Main Content Area */}
            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">標題</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="bg-[var(--muted)]/50 border-[var(--border)]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">任務描述</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="min-h-[150px] bg-[var(--muted)]/50 border-[var(--border)] leading-relaxed"
                  />
                </div>
                
                {/* Meta Grid */}
                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-[var(--border)]">
                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">狀態</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as ItemStatus })}>
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">待處理 (Open)</SelectItem>
                        <SelectItem value="in_progress">進行中 (In Progress)</SelectItem>
                        <SelectItem value="pending">等待中 (Pending)</SelectItem>
                        <SelectItem value="blocked">已阻塞 (Blocked)</SelectItem>
                        <SelectItem value="done">已完成 (Done)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority" className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">優先級</Label>
                    <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value as ItemPriority })}>
                      <SelectTrigger id="priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">高 (High)</SelectItem>
                        <SelectItem value="medium">中 (Medium)</SelectItem>
                        <SelectItem value="low">低 (Low)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assignee" className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">負責人</Label>
                    <Select 
                      value={formData.assignee_id} 
                      onValueChange={(value) => setFormData({ ...formData, assignee_id: value })}
                    >
                      <SelectTrigger id="assignee" className="bg-[var(--muted)]/50 border-[var(--border)]">
                        <SelectValue placeholder="選擇負責人" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">未指派</SelectItem>
                        {activeAssignees.map(m => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name} ({m.role.toUpperCase()})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="due_date" className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">到期日</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Description */}
                <div className="bg-[var(--muted)]/30 rounded-xl p-5 border border-[var(--border)]">
                  <p className="text-[var(--foreground)] text-sm leading-relaxed whitespace-pre-wrap">
                    {item.description}
                  </p>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-8 border-y border-[var(--border)] py-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--muted-foreground)] mb-2 block">執行狀態</Label>
                      <div className="flex items-center gap-2">
                        <div className={`h-2.5 w-2.5 rounded-full ${item.status === 'completed' ? 'bg-[var(--chart-4)]' : item.status === 'blocked' ? 'bg-[var(--destructive)]' : 'bg-[var(--accent)]'}`} />
                        <span className="font-bold text-sm">{getStatusLabel(item.status)}</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--muted-foreground)] mb-2 block">優先等級</Label>
                      <Badge variant={item.priority === 'high' ? 'destructive' : item.priority === 'medium' ? 'default' : 'secondary'} className="font-bold">
                        {item.priority === 'high' ? 'HIGH' : item.priority === 'medium' ? 'MEDIUM' : 'LOW'}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--muted-foreground)] mb-2 block">負責人</Label>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
                          <User className="h-3.5 w-3.5 text-[var(--accent)]" />
                        </div>
                        <span className="text-sm font-medium">
                          {currentAssignee ? currentAssignee.name : (item.assignee_id || '未指派')}
                        </span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--muted-foreground)] mb-2 block">截止日期</Label>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-[var(--muted-foreground)]" />
                        <span className="text-sm font-medium">{item.due_date ? new Date(item.due_date).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' }) : '未設定'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Evidence Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)] flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[var(--accent)]" />
                    單一事實來源 (Citation)
                  </h4>
                  {item.source_artifact_id ? (
                    <div 
                      className="p-4 rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 hover:bg-[var(--accent)]/10 transition-colors cursor-pointer group flex items-center justify-between"
                      onClick={() => setShowArtifact(true)}
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-[var(--accent)]">檢視原始來源證據</p>
                        <p className="text-[11px] text-[var(--muted-foreground)]">此任務由 AI 抽取自專案文件/對話，點擊查看完整內容</p>
                      </div>
                      <Badge variant="outline" className="border-[var(--accent)]/30 text-[var(--accent)] font-bold group-hover:bg-[var(--accent)] group-hover:text-white transition-colors">
                        VIEW SSOT
                      </Badge>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-[var(--border)] text-center">
                      <p className="text-xs text-[var(--muted-foreground)] italic">此任務為手動建立，無關聯原始證據</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* History Footer */}
            <div className="flex items-center justify-between text-[10px] text-[var(--muted-foreground)] font-medium pt-4 border-t border-[var(--border)]">
              <div className="flex gap-4">
                <span>建立：{new Date(item.created_at).toLocaleString('zh-TW')}</span>
                <span>更新：{new Date(item.updated_at).toLocaleString('zh-TW')}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 bg-[var(--muted)]/30 border-t border-[var(--border)] gap-3">
            {!isEditing ? (
              <div className="flex w-full items-center justify-between">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleArchive} className="h-9 px-4 gap-2 border-[var(--border)] hover:bg-[var(--destructive)]/5 hover:text-[var(--destructive)] hover:border-[var(--destructive)]/30 transition-all">
                    <Archive className="h-4 w-4" />
                    封存
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleDelete} className="h-9 px-4 gap-2 text-[var(--muted-foreground)] hover:text-[var(--destructive)] hover:bg-[var(--destructive)]/5 transition-all">
                    <Trash2 className="h-4 w-4" />
                    刪除
                  </Button>
                </div>
                <Button onClick={() => setIsEditing(true)} size="sm" className="h-9 px-6 font-bold shadow-[var(--elevation-sm)]">
                  編輯任務
                </Button>
              </div>
            ) : (
              <div className="flex w-full gap-3">
                <Button variant="outline" onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    title: item.title,
                    description: item.description,
                    status: item.status,
                    priority: item.priority || 'medium',
                    assignee_id: item.assignee_id || '',
                    due_date: formatDateForInput(item.due_date),
                  });
                }} className="flex-1 h-10 font-bold border-[var(--border)]">
                  取消編輯
                </Button>
                <Button onClick={handleSave} className="flex-1 h-10 font-bold shadow-[var(--elevation-sm)]">
                  儲存變更
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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