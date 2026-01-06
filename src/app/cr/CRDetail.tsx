import React, { useState, useEffect } from 'react';
import { Item, Artifact } from '../../lib/storage';
import { useProject } from '../context/ProjectContext';
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter 
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  GitPullRequest, AlertTriangle, FileText, Calendar, 
  User, CheckCircle2, XCircle, Clock, Trash2, 
  ChevronRight, ExternalLink, ShieldAlert,
  Layers, Layout, Info
} from 'lucide-react';
import { toast } from 'sonner';

interface CRDetailProps {
  item: Item;
  onClose: () => void;
  onUpdate: () => void;
}

export function CRDetail({ item, onClose, onUpdate }: CRDetailProps) {
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [relatedActions, setRelatedActions] = useState<Item[]>([]);
  const meta = (item.meta || {}) as any;
  
  // 使用 Context 中的 adapter，而不是直接調用 StorageFactory
  const { adapter } = useProject();

  useEffect(() => {
    if (item.source_artifact_id) {
      loadArtifact();
    }
    loadMembers();
    loadRelatedActions();
  }, [item.id, item.source_artifact_id]);

  const loadArtifact = async () => {
    const { data } = await adapter.getArtifactById(item.source_artifact_id!);
    if (data) setArtifact(data);
  };

  const loadMembers = async () => {
    const { data } = await adapter.getMembers(item.project_id);
    if (data) {
      // Only show active members for assignment
      const activeMembers = data.filter((m: any) => m.status === 'active');
      setMembers(activeMembers);
    }
  };

  const loadRelatedActions = async () => {
    // Assuming we find actions that reference this CR ID in their meta or title
    const { data } = await adapter.getItems(item.project_id, { type: 'action' });
    if (data) {
      // Filter actions that are related to this CR (this is a simplified logic for prototype)
      const related = data.filter(a => a.meta?.related_cr_id === item.id);
      setRelatedActions(related);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    
    // 1. Update the CR status
    await adapter.updateItem(item.id, {
      meta: { ...meta, cr_status: newStatus }
    });

    // 2. If approved or rejected, create a Decision (Requirement 6)
    if (newStatus === 'approved' || newStatus === 'rejected') {
      const decisionTitle = `決策：${item.title} (${newStatus === 'approved' ? '核准' : '駁回'})`;
      await adapter.createItem({
        project_id: item.project_id,
        type: 'decision',
        status: 'open',
        title: decisionTitle,
        description: `基於變更需求「${item.title}」的評估結果：${newStatus === 'approved' ? '已核准執行' : '已駁回'}。\n\n影響說明：${meta.impact_description || '無'}`,
        source_artifact_id: item.source_artifact_id,
        meta: {
          category: 'business',
          scope: 'module',
          cr_id: item.id,
          decision_status: 'active',
          citation: meta.citation
        }
      });
      toast.success(`已更新狀態並建立決議記錄`);
    } else {
      toast.success(`狀態已更新為 ${getStatusLabel(newStatus)}`);
    }

    setIsUpdating(false);
    onUpdate();
  };

  const handleOwnerChange = async (ownerId: string) => {
    await adapter.updateItem(item.id, {
      meta: { ...meta, owner_id: ownerId === 'unassigned' ? undefined : ownerId }
    });
    onUpdate();
    toast.success('負責人已更新');
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'requested': return '已提出';
      case 'reviewing': return '審核中';
      case 'approved': return '已核准';
      case 'rejected': return '已駁回';
      case 'implemented': return '已實作';
      case 'canceled': return '已取消';
      default: return '未知';
    }
  };

  const getRiskColor = (risk?: string) => {
    switch (risk) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium': return 'bg-amber-500/10 text-amber-600 border-amber-200';
      case 'low': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const doneActionsCount = relatedActions.filter(a => a.status === 'done').length;
  const currentOwner = members.find(m => m.id === meta.owner_id);

  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-[650px] overflow-y-auto">
        <SheetHeader className="space-y-4 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-accent">
              <GitPullRequest className="h-5 w-5" />
              <span className="font-bold">需求變更 (CR) 詳情</span>
            </div>
            {meta.risk_level && (
              <Badge variant="outline" className={getRiskColor(meta.risk_level)}>
                <ShieldAlert className="h-3 w-3 mr-1" />
                {meta.risk_level.toUpperCase()} RISK
              </Badge>
            )}
          </div>
          <SheetTitle className="text-2xl leading-tight">{item.title}</SheetTitle>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-accent/5 text-accent border-accent/20">
              {getStatusLabel(meta.cr_status)}
            </Badge>
          </div>
        </SheetHeader>

        <div className="py-6 space-y-8">
          {/* Main Controls Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" /> 變更狀態
              </Label>
              <Select 
                value={meta.cr_status || 'requested'} 
                onValueChange={handleStatusChange}
                disabled={isUpdating}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="requested">已提出</SelectItem>
                  <SelectItem value="reviewing">審核中</SelectItem>
                  <SelectItem value="approved">已核准</SelectItem>
                  <SelectItem value="rejected">已駁回</SelectItem>
                  <SelectItem value="implemented">已實作</SelectItem>
                  <SelectItem value="canceled">已取消</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-2">
                <User className="h-3.5 w-3.5" /> 內部負責人 (Owner)
              </Label>
              <Select 
                value={meta.owner_id || 'unassigned'} 
                onValueChange={handleOwnerChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="選擇負責人" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">未指派</SelectItem>
                  {members.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name} ({member.role.toUpperCase()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <Label className="text-muted-foreground flex items-center gap-2">
              <Info className="h-3.5 w-3.5" /> 變更摘要說明
            </Label>
            <div className="p-4 bg-muted/30 rounded-xl whitespace-pre-wrap text-foreground border leading-relaxed text-sm">
              {item.description}
            </div>
          </div>

          {/* Impact Scope Section */}
          <div className="space-y-4">
            <Label className="text-muted-foreground flex items-center gap-2">
              <Layers className="h-3.5 w-3.5" /> 影響範圍評估
            </Label>
            <div className="space-y-4 p-4 border rounded-xl bg-card">
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">影響模組</span>
                <div className="flex flex-wrap gap-2">
                  {meta.impact_modules?.length > 0 ? (
                    meta.impact_modules.map((m: string) => (
                      <Badge key={m} variant="secondary" className="bg-accent/10 text-accent border-accent/20">
                        {m}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">未標記模組</span>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">影響頁面</span>
                <div className="flex flex-wrap gap-2">
                  {meta.impact_pages?.length > 0 ? (
                    meta.impact_pages.map((p: string) => (
                      <Badge key={p} variant="outline" className="flex items-center gap-1">
                        <Layout className="h-3 w-3" />
                        {p}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">未標記頁面</span>
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">詳細影響說明</span>
                <p className="text-sm text-foreground leading-relaxed">
                  {meta.impact_description || '尚無詳細評估說明'}
                </p>
              </div>
            </div>
          </div>

          {/* Evidence Chain (Citation) */}
          <div className="space-y-4">
            <Label className="text-muted-foreground flex items-center gap-2">
              <FileText className="h-3.5 w-3.5" /> 證據溯源 (Evidence Chain)
            </Label>
            {artifact ? (
              <div className="p-4 bg-muted/50 rounded-xl border-2 border-dashed space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                  <span className="flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    {artifact.source_info || artifact.type.toUpperCase()}
                  </span>
                  <span>{new Date(artifact.created_at).toLocaleString('zh-TW')}</span>
                </div>
                <div className="relative">
                  <div className="absolute -left-2 top-0 bottom-0 w-1 bg-accent/30 rounded-full" />
                  <p className="text-sm italic leading-relaxed text-muted-foreground line-clamp-6 pl-3">
                    {artifact.content}
                  </p>
                </div>
                <div className="flex justify-end pt-2">
                  <Button variant="link" size="sm" className="h-auto p-0 text-accent text-xs">
                    前往來源文件定位 <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center border-2 border-dashed rounded-xl text-muted-foreground bg-muted/20">
                尚無關聯證據
              </div>
            )}
          </div>

          {/* Linked Actions (Requirement 7) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5" /> 落地執行任務 (Actions)
              </Label>
              {relatedActions.length > 0 && (
                <Badge variant="secondary" className="text-[10px] font-bold">
                  {doneActionsCount} / {relatedActions.length} DONE
                </Badge>
              )}
            </div>
            
            <div className="space-y-2">
              {relatedActions.length > 0 ? (
                relatedActions.map(action => (
                  <div key={action.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${action.status === 'done' ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}`} />
                      <span className={`text-sm ${action.status === 'done' ? 'text-muted-foreground line-through' : 'font-medium'}`}>
                        {action.title}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))
              ) : (
                <div className="p-6 text-center border rounded-xl bg-muted/10">
                  <p className="text-xs text-muted-foreground mb-3">尚未建立對應執行任務</p>
                  {meta.cr_status === 'approved' && (
                    <Button variant="outline" size="sm" className="text-xs h-8">
                      快速建立 Action
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <SheetFooter className="gap-2 sm:gap-0 pt-6 border-t mt-auto sticky bottom-0 bg-background pb-6">
          <Button variant="ghost" className="text-destructive hover:bg-destructive/10 h-10" onClick={() => {}}>
            <Trash2 className="h-4 w-4 mr-2" /> 刪除
          </Button>
          <div className="flex-1" />
          <Button variant="outline" className="h-10 px-6" onClick={onClose}>關閉</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}