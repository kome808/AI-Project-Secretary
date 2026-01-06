import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getStorageClient } from '../../lib/storage';
import { useProject } from '../context/ProjectContext';
import { CATEGORIES, SCOPES } from './DecisionFilters';
import { toast } from 'sonner';

interface CreateDecisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateDecisionDialog({ open, onOpenChange, onSuccess }: CreateDecisionDialogProps) {
  const { currentProject } = useProject();
  const [type, setType] = useState<'decision' | 'rule'>('decision');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [scope, setScope] = useState<'global' | 'module' | 'page'>('global');
  const [scopeTarget, setScopeTarget] = useState('');
  const [citationText, setCitationText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!currentProject || !title.trim() || !description.trim() || !citationText.trim()) return;

    setIsSubmitting(true);
    try {
      const storage = getStorageClient();
      
      const meta = {
        category,
        scope,
        scope_target: scope !== 'global' ? scopeTarget : undefined,
        status: 'active',
        last_updated_by: '當前使用者',
        last_updated_at: new Date().toISOString(),
        citation: {
          source_type: 'manual',
          source_label: '手動輸入佐證',
          location_info: '手動補充',
          highlight_text: citationText
        }
      };

      await storage.createItem({
        project_id: currentProject.id,
        type,
        status: 'open',
        title,
        description,
        meta,
      });

      toast.success('建立成功');
      onOpenChange(false);
      resetForm();
      onSuccess();
    } catch (error) {
      toast.error('建立失敗');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setType('decision');
    setTitle('');
    setDescription('');
    setCategory('other');
    setScope('global');
    setScopeTarget('');
    setCitationText('');
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetForm();
    }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>新增{type === 'decision' ? '決議' : '規則'}</DialogTitle>
          <DialogDescription>
            手動記錄專案中的重大定案或規範，並提供必要的佐證資訊（Citation）。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Type Selection */}
          <div className="space-y-3">
            <label className="text-muted-foreground uppercase font-semibold">記錄類型</label>
            <RadioGroup value={type} onValueChange={(v) => setType(v as any)} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="decision" id="type-decision" />
                <Label htmlFor="type-decision" className="font-normal cursor-pointer">決議 (Decision)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="rule" id="type-rule" />
                <Label htmlFor="type-rule" className="font-normal cursor-pointer">規則 (Rule)</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="item-category" className="text-muted-foreground uppercase font-semibold">類別</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="item-category" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="item-scope" className="text-muted-foreground uppercase font-semibold">適用範圍</label>
              <Select value={scope} onValueChange={(v: any) => setScope(v)}>
                <SelectTrigger id="item-scope" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCOPES.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {scope !== 'global' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
              <label htmlFor="scope-target" className="text-muted-foreground uppercase font-semibold">
                {scope === 'module' ? '模組名稱' : '頁面名稱'}
              </label>
              <Input 
                id="scope-target" 
                placeholder={`請輸入具體的${scope === 'module' ? '模組' : '頁面'}名稱...`}
                value={scopeTarget}
                onChange={(e) => setScopeTarget(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="item-title" className="text-muted-foreground uppercase font-semibold">標題</label>
            <Input 
              id="item-title" 
              placeholder="簡明扼要的標題..." 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="item-desc" className="text-muted-foreground uppercase font-semibold">完整描述</label>
            <Textarea 
              id="item-desc" 
              placeholder="詳細記錄決議或規則的具體內容..." 
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="leading-relaxed"
            />
          </div>

          <div className="space-y-2 p-4 bg-primary/5 border border-primary/10 rounded-lg">
            <label htmlFor="item-citation" className="text-primary font-semibold flex items-center gap-2">
              佐證說明 / Citation <span className="text-destructive font-normal">(必填)</span>
            </label>
            <Textarea 
              id="item-citation" 
              placeholder="貼上相關的對話片段、連結或說明作為此記錄的依據。每一筆決議都必須具備強 Citation 能力。" 
              rows={3}
              className="text-sm bg-background"
              value={citationText}
              onChange={(e) => setCitationText(e.target.value)}
              required
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !title.trim() || !description.trim() || !citationText.trim()}>
            {isSubmitting ? '處理中...' : '確認入庫'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}