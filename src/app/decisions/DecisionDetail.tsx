import React, { useState, useEffect } from 'react';
import { 
  Gavel, 
  Shield, 
  Calendar, 
  Link as LinkIcon, 
  History, 
  User,
  ExternalLink,
  MessageSquare,
  Globe,
  Layers,
  FileText,
  AlertCircle,
  Pencil,
  Save,
  X,
  Trash2
} from 'lucide-react';
import { Item, Artifact, DecisionMeta } from '../../lib/storage/types';
import { getStorageClient } from '../../lib/storage';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArtifactView } from '@/features/inbox/components/ArtifactView';
import { CATEGORIES, SCOPES, STATUSES } from './DecisionFilters';
import { toast } from 'sonner';

interface DecisionDetailProps {
  decision: Item | null;
  onClose: () => void;
  onUpdate?: () => void;
}

export function DecisionDetail({ decision, onClose, onUpdate }: DecisionDetailProps) {
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [showArtifact, setShowArtifact] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editScope, setEditScope] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (decision) {
      setEditTitle(decision.title);
      setEditDescription(decision.description);
      const meta = decision.meta as DecisionMeta || {};
      setEditCategory(meta.category || 'other');
      setEditScope(meta.scope || 'global');
      setEditStatus(meta.status || 'active');
      
      if (decision.source_artifact_id) {
        loadArtifact(decision.source_artifact_id);
      } else {
        setArtifact(null);
      }
    }
  }, [decision]);

  const loadArtifact = async (id: string) => {
    const storage = getStorageClient();
    const { data } = await storage.getArtifactById(id);
    if (data) setArtifact(data);
  };

  const handleSave = async () => {
    if (!decision) return;
    
    setIsSaving(true);
    try {
      const storage = getStorageClient();
      const meta = {
        ...(decision.meta as DecisionMeta || {}),
        category: editCategory as any,
        scope: editScope as any,
        status: editStatus as any,
        last_updated_at: new Date().toISOString(),
        last_updated_by: '當前使用者',
      };
      
      await storage.updateItem(decision.id, {
        title: editTitle,
        description: editDescription,
        meta,
        updated_at: new Date().toISOString(),
      });
      
      toast.success('更新成功');
      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      toast.error('更新失敗');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!decision || !window.confirm('確定要刪除此項記錄嗎？')) return;
    
    try {
      const storage = getStorageClient();
      await storage.deleteItem(decision.id);
      toast.success('已刪除');
      onClose();
      onUpdate?.();
    } catch (error) {
      toast.error('刪除失敗');
    }
  };

  if (!decision) return null;

  const meta = decision.meta as DecisionMeta || {};
  const isRule = decision.type === 'rule';
  const categoryName = CATEGORIES.find(c => c.id === (isEditing ? editCategory : meta.category))?.name || '其他';
  const scopeName = SCOPES.find(s => s.id === (isEditing ? editScope : meta.scope))?.name || '全專案';
  const scopeTarget = meta.scope_target;
  const isDeprecated = (isEditing ? editStatus : meta.status) === 'deprecated';
  
  const ScopeIcon = (isEditing ? editScope : meta.scope) === 'module' ? Layers : (isEditing ? editScope : meta.scope) === 'page' ? FileText : Globe;

  return (
    <Sheet open={!!decision} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="text-left space-y-4">
          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-2">
              <Badge variant={isRule ? 'default' : 'secondary'} className={isRule ? 'bg-[var(--chart-1)]' : 'bg-[var(--chart-4)] text-white'}>
                {isRule ? '規則 (Rule)' : '決議 (Decision)'}
              </Badge>
              {isDeprecated && (
                <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-200">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  已停用
                </Badge>
              )}
            </div>
            
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                    <X className="h-3 w-3 mr-1" /> 取消
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isSaving}>
                    <Save className="h-3 w-3 mr-1" /> 儲存
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleDelete}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                    <Pencil className="h-3 w-3 mr-1" /> 編輯
                  </Button>
                </>
              )}
            </div>
          </div>
          
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-muted-foreground uppercase font-semibold">標題</label>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-muted-foreground uppercase font-semibold">類別</label>
                  <Select value={editCategory} onValueChange={setEditCategory}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-muted-foreground uppercase font-semibold">範圍</label>
                  <Select value={editScope} onValueChange={setEditScope}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCOPES.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-muted-foreground uppercase font-semibold">狀態</label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ) : (
            <>
              <SheetTitle className="text-xl">
                {decision.title}
              </SheetTitle>
              
              <div className="flex items-center gap-3 text-muted-foreground flex-wrap">
                <Badge variant="outline" className="font-normal">{categoryName}</Badge>
                <span className="flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded text-xs border border-border/50">
                  <ScopeIcon className="h-3 w-3" />
                  {scopeName}
                  {scopeTarget && <span className="text-primary font-medium ml-1">({scopeTarget})</span>}
                </span>
                <span className="flex items-center gap-1 text-xs">
                  <Calendar className="h-3 w-3" />
                  建立於 {new Date(decision.created_at).toLocaleString('zh-TW')}
                </span>
              </div>
            </>
          )}
        </SheetHeader>

        <div className="mt-8 space-y-8">
          {/* Description */}
          <section>
            <h4 className="mb-3 flex items-center gap-2 font-semibold uppercase tracking-tight">
              <MessageSquare className="h-4 w-4 text-primary" />
              內容描述
            </h4>
            {isEditing ? (
              <Textarea 
                value={editDescription} 
                onChange={(e) => setEditDescription(e.target.value)} 
                rows={8}
                className="leading-relaxed"
              />
            ) : (
              <div className="bg-muted/10 rounded-xl p-6 leading-relaxed whitespace-pre-wrap border border-border/50 min-h-[120px] shadow-sm">
                {decision.description}
              </div>
            )}
          </section>

          {/* Relation Context (Pending) */}
          {meta.parent_pending_id && (
            <section className="bg-blue-50/50 border border-blue-100 rounded-lg p-4">
              <h4 className="mb-2 flex items-center gap-2 text-blue-700 font-semibold">
                <AlertCircle className="h-3 w-3" />
                來源待確認事項 (Linked Pending)
              </h4>
              <p className="text-blue-600/80 mb-2">
                此決議是由待確認事項轉換而來。
              </p>
              <Button variant="outline" size="sm" className="h-7 border-blue-200 text-blue-700 hover:bg-blue-100/50">
                查看原始待確認事項
              </Button>
            </section>
          )}

          {/* Source/Citation */}
          <section className="p-5 bg-primary/5 rounded-xl border border-primary/10">
            <h4 className="mb-4 flex items-center gap-2 font-semibold uppercase tracking-tight text-primary">
              <LinkIcon className="h-4 w-4" />
              來源回溯 (Strong Citation)
            </h4>
            {artifact ? (
              <div className="space-y-4">
                <div 
                  className="flex items-center justify-between p-4 rounded-lg border border-primary/10 bg-background hover:border-primary/30 transition-all cursor-pointer group shadow-sm"
                  onClick={() => setShowArtifact(true)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <History className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">原始證據來源</p>
                      <p className="text-xs text-muted-foreground">
                        {artifact.source_info || (artifact.type === 'text' ? '貼上文字' : artifact.type === 'file' ? '上傳檔案' : '外部連結')} • 
                        {new Date(artifact.created_at).toLocaleDateString('zh-TW')}
                      </p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-primary/40 group-hover:text-primary transition-colors" />
                </div>
                
                <div className="bg-background/80 border border-dashed border-primary/20 rounded-lg p-4 text-sm">
                  <p className="text-primary/70 mb-2 font-semibold uppercase tracking-wider text-[10px]">定位資訊與原文片段</p>
                  {meta.citation?.location_info && (
                    <p className="text-xs mb-2 text-muted-foreground">{meta.citation.location_info}</p>
                  )}
                  {meta.citation?.highlight_text ? (
                    <div className="p-3 bg-yellow-500/5 border-l-4 border-yellow-400 text-muted-foreground italic rounded-r-md">
                      "{meta.citation.highlight_text}"
                    </div>
                  ) : (
                    <div className="p-3 bg-muted/30 rounded text-muted-foreground text-xs italic">
                      無高亮片段資訊
                    </div>
                  )}
                </div>
              </div>
            ) : meta.citation?.highlight_text ? (
              /* Handle manual citation if no artifact */
              <div className="space-y-4">
                <div className="bg-background/80 border border-dashed border-primary/20 rounded-lg p-4 text-sm">
                  <p className="text-primary/70 mb-2 font-semibold uppercase tracking-wider text-[10px]">手動輸入佐證</p>
                  <div className="p-3 bg-yellow-500/5 border-l-4 border-yellow-400 text-muted-foreground italic rounded-r-md">
                    "{meta.citation.highlight_text}"
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 border border-dashed border-border rounded-lg bg-muted/10">
                <p className="text-xs text-muted-foreground italic">本決議為手動建立，無關聯 Artifact</p>
              </div>
            )}
          </section>

          <Separator />

          {/* Meta Info */}
          <section className="grid grid-cols-2 gap-4 text-[11px]">
            <div>
              <p className="text-muted-foreground mb-1 flex items-center gap-1">
                <User className="h-3 w-3" />
                建立者
              </p>
              <p className="font-medium">系統 AI (經確認)</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1 flex items-center gap-1">
                <History className="h-3 w-3" />
                最後更新
              </p>
              <p className="font-medium">
                {meta.last_updated_by ? `${meta.last_updated_by} @ ` : ''}
                {new Date(decision.updated_at).toLocaleString('zh-TW')}
              </p>
            </div>
          </section>
        </div>

        {/* Artifact View Dialog */}
        {artifact && (
          <ArtifactView
            artifact={artifact}
            open={showArtifact}
            onOpenChange={setShowArtifact}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}