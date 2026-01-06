import { useState } from 'react';
import { Inbox, CheckCircle2, X, Sparkles, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MemberInput } from '@/components/ui/member-input';

import { InboxList } from '@/features/inbox/components/InboxList';
import { ArtifactViewDrawer } from '@/features/inbox/components/ArtifactViewDrawer';
import { Item } from '@/lib/storage/types';
import { useInbox } from '@/features/inbox/hooks/useInbox';
import { useProject } from '../context/ProjectContext';

export function InboxPage() {
  const { currentProject } = useProject();
  const {
    items,
    members,
    isLoading,
    selectedIds,
    confirmItem,
    rejectItem,
    updateItem,
    batchConfirm,
    batchReject,
    toggleSelect,
    clearSelection
  } = useInbox();

  // Local UI State for Edit Dialog
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    assignee_id: '',
    due_date: '',
    priority: 'medium' as 'low' | 'medium' | 'high'
  });

  // Right Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);

  const handleEdit = (item: Item) => {
    setEditingItem(item);

    // YYYY-MM-DD format
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

    setEditForm({
      title: item.title,
      description: item.description,
      assignee_id: item.assignee_id || '',
      due_date: formatDateForInput(item.due_date),
      priority: item.priority || 'medium'
    });
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    await updateItem(editingItem.id, {
      title: editForm.title,
      description: editForm.description,
      assignee_id: editForm.assignee_id || null,
      due_date: editForm.due_date || null,
      priority: editForm.priority
    });

    setEditingItem(null);
  };

  // View Source
  const handleViewSource = (artifactId: string) => {
    setSelectedArtifactId(artifactId);
    setDrawerOpen(true);
  };

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <Inbox className="h-16 w-16 text-muted-foreground mx-auto opacity-30" />
          <p className="text-muted-foreground">
            <label>請先選擇專案</label>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2">
            <Inbox className="h-6 w-6" />
            <label>收件匣</label>
          </h1>
          <p className="text-muted-foreground">
            <label>AI 產生建議卡確認入庫後進行追蹤</label>
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-muted bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-muted-foreground">
                <label>建議卡由「儀表板」的 AI 秘書產生。請在此確認內容後入庫，或拒絕刪除。</label>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batch Tools */}
      {selectedIds.length > 0 && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-primary">
                  <label>已選取 {selectedIds.length} 張卡片</label>
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                >
                  <X className="h-4 w-4 mr-1" />
                  <label>取消選取</label>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={batchReject}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <label>批次拒絕</label>
                </Button>
                <Button
                  size="sm"
                  onClick={batchConfirm}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  <label>批次確認入庫</label>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">
              <label>載入中...</label>
            </p>
          </div>
        </div>
      ) : (
        <InboxList
          items={items}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onConfirm={confirmItem}
          onReject={rejectItem}
          onEdit={handleEdit}
          onViewSource={handleViewSource}
        />
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle><label>編輯建議卡</label></DialogTitle>
            <DialogDescription><label>修改建議卡內容後再確認入庫</label></DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title"><label>標題</label></Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description"><label>描述</label></Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                className="min-h-[120px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-assignee"><label>負責人（Email）</label></Label>
                <MemberInput
                  value={editForm.assignee_id}
                  onChange={(value) => setEditForm(prev => ({ ...prev, assignee_id: value }))}
                  members={members}
                  placeholder="輸入 @ 選擇成員"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-due-date"><label>到期日</label></Label>
                <Input
                  id="edit-due-date"
                  type="date"
                  value={editForm.due_date}
                  onChange={(e) => setEditForm(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-priority"><label>優先級</label></Label>
              <Select
                value={editForm.priority}
                onValueChange={(value: 'low' | 'medium' | 'high') =>
                  setEditForm(prev => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger id="edit-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low"><label>低</label></SelectItem>
                  <SelectItem value="medium"><label>中</label></SelectItem>
                  <SelectItem value="high"><label>高</label></SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              <label>取消</label>
            </Button>
            <Button onClick={handleSaveEdit}>
              <label>儲存並確認入庫</label>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Artifact Drawer */}
      <ArtifactViewDrawer
        artifactId={selectedArtifactId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        currentProjectId={currentProject?.id}
      />
    </div>
  );
}