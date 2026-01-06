import React, { useState, useEffect } from 'react';
import { Item, PendingMeta, Artifact } from '../../lib/storage/types';
import { WaitingOnType, Member } from '../../lib/storage/types';
import { getStorageClient } from '../../lib/storage';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Clock, User, Calendar, FileText, AlertCircle, 
  CheckCircle2, ArrowRight, FileWarning, X 
} from 'lucide-react';
import { ResponseDialog } from './ResponseDialog';
import { ConvertDialog, ConversionType, ConversionData } from './ConvertDialog';
import { useProject } from '../context/ProjectContext';

interface PendingDetailProps {
  item: Item;
  onClose: () => void;
  onUpdate: () => void;
}

export function PendingDetail({ item, onClose, onUpdate }: PendingDetailProps) {
  const { currentProject } = useProject();
  const meta = item.meta as PendingMeta | undefined;
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  
  // Dialog states
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  
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
  
  // Editable fields
  const [dueDate, setDueDate] = useState(formatDateForInput(item.due_date));
  const [waitingOnType, setWaitingOnType] = useState<WaitingOnType>(meta?.waiting_on_type || 'client');
  const [waitingOnMemberId, setWaitingOnMemberId] = useState(meta?.waiting_on_name || ''); // Using name field as ID for now
  const [additionalQuestion, setAdditionalQuestion] = useState('');

  useEffect(() => {
    if (item.source_artifact_id) {
      loadArtifact();
    }
    if (currentProject) {
      loadMembers();
    }
  }, [item.source_artifact_id, currentProject]);

  const loadMembers = async () => {
    if (!currentProject) return;
    const storage = getStorageClient();
    const { data } = await storage.getMembers(currentProject.id);
    if (data) setMembers(data);
  };

  const loadArtifact = async () => {
    if (!item.source_artifact_id) return;
    
    const storage = getStorageClient();
    const { data } = await storage.getArtifactById(item.source_artifact_id);
    if (data) {
      setArtifact(data);
    }
  };

  const getWaitingDays = () => {
    const now = new Date();
    const created = new Date(item.created_at);
    const diffTime = Math.abs(now.getTime() - created.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const isOverdue = () => {
    if (!item.due_date) return false;
    return new Date(item.due_date) < new Date();
  };

  const getWaitingOnTypeLabel = (type?: string) => {
    switch (type) {
      case 'client': return '客戶';
      case 'internal': return '內部';
      case 'external': return '外部';
      default: return '未指定';
    }
  };

  const handleSaveUpdates = async () => {
    setIsSaving(true);
    const storage = getStorageClient();
    
    const updates: Partial<Item> = {
      due_date: dueDate || undefined,
      meta: {
        ...meta,
        waiting_on_type: waitingOnType,
        waiting_on_name: waitingOnMemberId,
      },
    };

    // If adding additional question, append to description
    if (additionalQuestion.trim()) {
      updates.description = `${item.description}\n\n[追加問題] ${additionalQuestion}`;
    }

    const { error } = await storage.updateItem(item.id, updates);
    
    setIsSaving(false);
    if (!error) {
      setIsEditing(false);
      setAdditionalQuestion('');
      onUpdate();
    }
  };

  const handleRecordResponse = async (content: string) => {
    setIsSaving(true);
    const storage = getStorageClient();
    
    const updates: Partial<Item> = {
      meta: {
        ...meta,
        response_content: content,
        response_at: new Date().toISOString(),
        response_by: 'Current User', // TODO: Get from auth context
      },
    };

    const { error } = await storage.updateItem(item.id, updates);
    
    setIsSaving(false);
    if (!error) {
      setShowResponseDialog(false);
      onUpdate();
    }
  };

  const handleConvert = async (type: ConversionType, data: ConversionData) => {
    setIsSaving(true);
    const storage = getStorageClient();

    if (type === 'to_decision') {
      // Create Decision or Rule
      const newDecision: Omit<Item, 'id' | 'created_at' | 'updated_at'> = {
        project_id: item.project_id,
        type: data.type || 'decision', // Use data.type
        status: 'done',
        title: data.title || item.title,
        description: data.description || `[從待確認轉入]\n\n${item.description}\n\n${meta?.response_content || ''}`,
        source_artifact_id: item.source_artifact_id,
        meta: {
          category: data.category,
          scope: data.scope,
          parent_pending_id: item.id,
          status: 'active',
          last_updated_by: '系統轉換',
          last_updated_at: new Date().toISOString(),
          citation: item.source_artifact_id ? {
            artifact_id: item.source_artifact_id,
            source_type: 'pending_conversion',
            source_label: '待確認事項轉換',
            location_info: `原始待確認：${item.title}`,
            highlight_text: meta?.response_content
          } : undefined
        }
      };
      await storage.createItem(newDecision);
      
    } else if (type === 'to_action') {
      // Create Action
      const newAction: Omit<Item, 'id' | 'created_at' | 'updated_at'> = {
        project_id: item.project_id,
        type: 'action',
        status: 'open',
        title: data.title || item.title,
        description: data.description || `[從待確認轉入]\n\n${item.description}`,
        source_artifact_id: item.source_artifact_id,
        assignee_id: data.assignee,
        due_date: data.dueDate,
      };
      await storage.createItem(newAction);
      
    } else if (type === 'workaround') {
      // Create workaround action
      const workaroundAction: Omit<Item, 'id' | 'created_at' | 'updated_at'> = {
        project_id: item.project_id,
        type: 'action',
        status: 'open',
        title: data.title || `[替代方案] ${item.title}`,
        description: `[改走替代方案]\n\n原待確認：${item.title}\n\n原因：${data.workaroundReason}\n\n原問題：\n${item.description}`,
        source_artifact_id: item.source_artifact_id,
        assignee_id: data.assignee,
        meta: {
          workaround_reason: data.workaroundReason,
          original_pending_id: item.id,
        },
      };
      await storage.createItem(workaroundAction);
    }

    // Mark pending as done
    await storage.updateItem(item.id, { status: 'done' });
    
    setIsSaving(false);
    setShowConvertDialog(false);
    onUpdate();
  };

  const waitingDays = getWaitingDays();
  const overdue = isOverdue();
  const activeMembers = members.filter(m => m.status === 'active');
  const currentWaitingMember = members.find(m => m.id === meta?.waiting_on_name);

  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <SheetTitle>{item.title}</SheetTitle>
              <SheetDescription>待確認事項詳情</SheetDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Waiting Info */}
          <div className="p-4 bg-muted rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">等待天數</span>
              </div>
              <span className={`font-medium ${
                overdue 
                  ? 'text-destructive' 
                  : waitingDays > 7 
                    ? 'text-[var(--chart-5)]'
                    : 'text-foreground'
              }`}>
                {waitingDays} 天
              </span>
            </div>

            {overdue && (
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>此事項已逾期</span>
              </div>
            )}
          </div>

          {/* Waiting On */}
          <div className="space-y-2">
            <Label>等待對象</Label>
            {isEditing ? (
              <div className="space-y-2">
                <Select value={waitingOnType} onValueChange={(value: WaitingOnType) => setWaitingOnType(value)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">客戶 (Client)</SelectItem>
                    <SelectItem value="internal">內部 (Internal)</SelectItem>
                    <SelectItem value="external">外部單位 (External)</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={waitingOnMemberId} onValueChange={setWaitingOnMemberId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="選擇成員 (選填)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="other">手動輸入 / 其他</SelectItem>
                    {activeMembers.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} ({m.role.toUpperCase()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {waitingOnMemberId === 'other' && (
                  <Input
                    placeholder="輸入對象名稱"
                    onChange={(e) => setWaitingOnMemberId(e.target.value)}
                    className="h-9"
                  />
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                  <User className="h-3 w-3 mr-1" />
                  {getWaitingOnTypeLabel(meta?.waiting_on_type)}
                </Badge>
                <span className="text-foreground font-medium">
                  {currentWaitingMember ? currentWaitingMember.name : (meta?.waiting_on_name || '未指定')}
                </span>
              </div>
            )}
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>期限</Label>
            {isEditing ? (
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            ) : (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">
                  {item.due_date 
                    ? new Date(item.due_date).toLocaleDateString('zh-TW', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })
                    : '未設定'}
                </span>
              </div>
            )}
          </div>

          {/* Question/Description */}
          <div className="space-y-2">
            <Label>問題內容</Label>
            <div className="p-3 bg-muted rounded-md whitespace-pre-wrap">
              {item.description}
            </div>
          </div>

          {/* Expected Response */}
          {meta?.expected_response && (
            <div className="space-y-2">
              <Label>期待回覆形式</Label>
              <div className="text-foreground">{meta.expected_response}</div>
            </div>
          )}

          {/* Additional Question */}
          {isEditing && (
            <div className="space-y-2">
              <Label>追加問題（選填）</Label>
              <Textarea
                placeholder="補充需要確認的問題..."
                value={additionalQuestion}
                onChange={(e) => setAdditionalQuestion(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* Citation */}
          {artifact && (
            <div className="space-y-2">
              <Label>來源證據</Label>
              <div className="p-3 bg-muted rounded-md">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground mb-1">
                      {artifact.source_info || artifact.type} · {new Date(artifact.created_at).toLocaleDateString('zh-TW')}
                    </div>
                    <div className="text-foreground line-clamp-3 whitespace-pre-wrap">
                      {artifact.content}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Response Record */}
          {meta?.response_content && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[var(--chart-4)]" />
                回覆記錄
              </Label>
              <div className="p-3 bg-[var(--chart-4)]/10 border border-[var(--chart-4)]/20 rounded-md">
                <div className="text-xs text-muted-foreground mb-2">
                  {meta.response_at && new Date(meta.response_at).toLocaleString('zh-TW')}
                  {meta.response_by && ` · ${meta.response_by}`}
                </div>
                <div className="text-foreground whitespace-pre-wrap">
                  {meta.response_content}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-4 border-t">
            {isEditing ? (
              <>
                <Button onClick={handleSaveUpdates} disabled={isSaving}>
                  {isSaving ? '儲存中...' : '儲存變更'}
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  取消
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  編輯資訊
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="default" className="w-full" onClick={() => setShowResponseDialog(true)}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    記錄回覆
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => setShowConvertDialog(true)}>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    轉換處理
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Dialogs */}
        <ResponseDialog
          open={showResponseDialog}
          onOpenChange={setShowResponseDialog}
          onSubmit={handleRecordResponse}
          isSubmitting={isSaving}
        />
        
        <ConvertDialog
          open={showConvertDialog}
          onOpenChange={setShowConvertDialog}
          onSubmit={handleConvert}
          isSubmitting={isSaving}
        />
      </SheetContent>
    </Sheet>
  );
}