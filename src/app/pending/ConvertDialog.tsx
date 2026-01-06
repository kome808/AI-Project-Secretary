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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CheckCircle2, ListTodo, Route, Globe, Layers, FileText, User } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProject } from '../context/ProjectContext';
import { getStorageClient } from '../../lib/storage';
import { Member } from '../../lib/storage/types';

export type ConversionType = 'to_decision' | 'to_action' | 'workaround';

interface ConvertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (type: ConversionType, data: ConversionData) => void;
  isSubmitting?: boolean;
}

export interface ConversionData {
  title?: string;
  description?: string;
  assignee_id?: string; // 🔥 修正欄位名稱從 assignee 改為 assignee_id
  dueDate?: string;
  workaroundReason?: string;
  scope?: 'global' | 'module' | 'page';
  category?: string;
  type?: 'decision' | 'rule'; // Added type
}

export function ConvertDialog({ open, onOpenChange, onSubmit, isSubmitting }: ConvertDialogProps) {
  const { currentProject } = useProject();
  const [conversionType, setConversionType] = useState<ConversionType>('to_decision');
  const [targetType, setTargetType] = useState<'decision' | 'rule'>('decision'); // Added state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [workaroundReason, setWorkaroundReason] = useState('');
  const [scope, setScope] = useState<'global' | 'module' | 'page'>('global');
  const [category, setCategory] = useState('other');
  const [members, setMembers] = useState<Member[]>([]);

  React.useEffect(() => {
    if (open && currentProject) {
      loadMembers();
    }
  }, [open, currentProject]);

  const loadMembers = async () => {
    const storage = getStorageClient();
    const { data } = await storage.getMembers(currentProject!.id);
    if (data) setMembers(data);
  };

  const handleSubmit = () => {
    const data: ConversionData = {
      title: title.trim() || undefined,
      description: description.trim() || undefined,
      assignee_id: assignee.trim() || undefined, // 🔥 修正欄位名稱從 assignee 改為 assignee_id
      dueDate: dueDate || undefined,
      workaroundReason: workaroundReason.trim() || undefined,
      scope: conversionType === 'to_decision' ? scope : undefined,
      category: conversionType === 'to_decision' ? category : undefined,
      type: conversionType === 'to_decision' ? targetType : undefined, // Include targetType
    };
    onSubmit(conversionType, data);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setAssignee('');
    setDueDate('');
    setWorkaroundReason('');
    setScope('global');
    setCategory('other');
    setTargetType('decision');
  };

  const activeAssignees = members.filter(m => m.status === 'active' && m.role !== 'client');

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetForm();
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>轉換處理</DialogTitle>
          <DialogDescription>
            將待確認事項轉換為決議、待辦或替代方案
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Conversion Type */}
          <div className="space-y-3">
            <Label>轉換類型</Label>
            <RadioGroup value={conversionType} onValueChange={(value) => setConversionType(value as ConversionType)}>
              <div className="flex items-start space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="to_decision" id="to_decision" />
                <div className="flex-1">
                  <label htmlFor="to_decision" className="flex items-center gap-2 cursor-pointer">
                    <CheckCircle2 className="h-4 w-4 text-[var(--chart-4)]" />
                    <span className="font-medium">完成並轉為決議 / 規則</span>
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    適用於：客戶 OK、方案定案、流程定案、UI 規則定案
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="to_action" id="to_action" />
                <div className="flex-1">
                  <label htmlFor="to_action" className="flex items-center gap-2 cursor-pointer">
                    <ListTodo className="h-4 w-4 text-[var(--chart-1)]" />
                    <span className="font-medium">完成並轉為待辦</span>
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    適用於：收到資訊後需執行動作（如收到 VPN 後去連線）
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="workaround" id="workaround" />
                <div className="flex-1">
                  <label htmlFor="workaround" className="flex items-center gap-2 cursor-pointer">
                    <Route className="h-4 w-4 text-[var(--chart-5)]" />
                    <span className="font-medium">改走替代方案</span>
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    適用於：對方長期不回，專案必須前進，改用替代方案
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Conditional Fields */}
          {(conversionType === 'to_decision' || conversionType === 'to_action') && (
            <>
              {conversionType === 'to_decision' && (
                <>
                  <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border">
                    <Label className="text-xs">存入類型</Label>
                    <RadioGroup value={targetType} onValueChange={(v) => setTargetType(v as any)} className="flex gap-6">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="decision" id="target-decision" />
                        <Label htmlFor="target-decision" className="font-normal text-xs cursor-pointer">決議 (Decision)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="rule" id="target-rule" />
                        <Label htmlFor="target-rule" className="font-normal text-xs cursor-pointer">規則 (Rule)</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">適用範圍</Label>
                      <RadioGroup value={scope} onValueChange={(v) => setScope(v as any)} className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="global" id="scope-global" />
                          <Label htmlFor="scope-global" className="font-normal text-xs cursor-pointer">全專案</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="module" id="scope-module" />
                          <Label htmlFor="scope-module" className="font-normal text-xs cursor-pointer">模組</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="page" id="scope-page" />
                          <Label htmlFor="scope-page" className="font-normal text-xs cursor-pointer">頁面</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">類別</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="technical">技術</SelectItem>
                          <SelectItem value="business">業務</SelectItem>
                          <SelectItem value="ui_ux">UI/UX</SelectItem>
                          <SelectItem value="process">流程</SelectItem>
                          <SelectItem value="other">其他</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="convert-title">標題（選填，留空則使用原標題）</Label>
                <Input
                  id="convert-title"
                  placeholder="自訂標題..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="convert-description">說明（選填）</Label>
                <Textarea
                  id="convert-description"
                  placeholder="補充說明..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </>
          )}

          {conversionType === 'to_action' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="convert-assignee">指派給（選填）</Label>
                <Select value={assignee} onValueChange={setAssignee}>
                  <SelectTrigger id="convert-assignee">
                    <SelectValue placeholder="選擇負責人" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeAssignees.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} ({m.role.toUpperCase()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="convert-duedate">期限（選填）</Label>
                <Input
                  id="convert-duedate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </>
          )}

          {conversionType === 'workaround' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="workaround-reason">替代方案說明</Label>
                <Textarea
                  id="workaround-reason"
                  placeholder="說明為何改走替代方案，以及替代方案的內容..."
                  value={workaroundReason}
                  onChange={(e) => setWorkaroundReason(e.target.value)}
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="workaround-title">替代方案待辦標題</Label>
                <Input
                  id="workaround-title"
                  placeholder="例：到館內處理資料抓取"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="workaround-assignee">指派給（選填）</Label>
                <Select value={assignee} onValueChange={setAssignee}>
                  <SelectTrigger id="workaround-assignee">
                    <SelectValue placeholder="選擇負責人" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeAssignees.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} ({m.role.toUpperCase()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            取消
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={
              isSubmitting || 
              (conversionType === 'workaround' && (!workaroundReason.trim() || !title.trim()))
            }
          >
            {isSubmitting ? '處理中...' : '確認轉換'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}