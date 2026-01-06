import React, { useEffect, useState } from 'react';
import { parseDocument } from '@/utils/documentParser';
import { useProject } from '../context/ProjectContext';
import { getStorageClient } from '../../lib/storage';
import { Artifact, ArtifactType, Item } from '@/lib/storage/types';
import { DocumentFilters } from './DocumentFilters';
import { DocumentCard } from './DocumentCard';
import { DocumentDetail } from './DocumentDetail';
import { FileSearch, Plus, Link as LinkIcon, AlignLeft, AlertCircle, MessagesSquare, Clock, Hash, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { isToday, isWithinInterval, subDays } from 'date-fns';

export function DocumentsPage() {
  const { currentProject } = useProject();
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<ArtifactType[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [usageFilter, setUsageFilter] = useState<'all' | 'with_usage' | 'no_usage'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week'>('all');
  const [showArchived, setShowArchived] = useState(false);

  // Detail state
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Create state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newType, setNewType] = useState<ArtifactType>('text');
  const [newChannel, setNewChannel] = useState<'line' | 'email' | 'meeting' | 'upload' | 'paste'>('paste');
  const [newContent, setNewContent] = useState('');
  const [newSourceInfo, setNewSourceInfo] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (currentProject) {
      loadData();
    }
  }, [currentProject]);

  const loadData = async () => {
    if (!currentProject) return;
    setIsLoading(true);
    try {
      const storage = getStorageClient();
      const [artifactsRes, itemsRes] = await Promise.all([
        storage.getArtifacts(currentProject.id),
        storage.getItems(currentProject.id)
      ]);

      if (artifactsRes.data) setArtifacts(artifactsRes.data);
      if (itemsRes.data) setItems(itemsRes.data);
    } catch (error) {
      console.error('Failed to load documents:', error);
      toast.error('載入資料失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredArtifacts = artifacts.filter((a) => {
    // 嚴格篩選規則：只顯示「已手動匯入」或「已被正式任務引用」的文件
    // 這是為了避免文件庫被大量的收件匣暫存檔或未使用的上傳檔淹沒

    // 計算正式引用次數（排除 Suggestion 階段）
    const confirmedUsageCount = items.filter(item =>
      (item.source_artifact_id === a.id || item.meta?.citation?.artifact_id === a.id) &&
      item.status !== 'suggestion'
    ).length;

    const isManual = a.meta?.is_manual === true;
    const isSystemUsed = confirmedUsageCount > 0;

    // 如果不是手動匯入，且沒有被正式引用，則完全隱藏
    if (!isManual && !isSystemUsed) return false;

    const matchesSearch =
      (a.original_content || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.meta?.source_info && a.meta.source_info.toLowerCase().includes(searchQuery.toLowerCase()));

    // 簡易映射 content_type 到 ArtifactType (若 content_type 直接存儲了 'text', 'link' 等則適用)
    // 這裡假設系統中 content_type 可能存儲 MIME 或 簡稱
    const matchesType = selectedTypes.length === 0 || selectedTypes.some(t => a.content_type.includes(t));
    const matchesChannel = selectedChannels.length === 0 || (a.meta?.channel && selectedChannels.includes(a.meta.channel));
    const matchesArchived = !!a.archived === showArchived;

    const matchesUsage =
      usageFilter === 'all' ||
      (usageFilter === 'with_usage' && confirmedUsageCount > 0) ||
      (usageFilter === 'no_usage' && confirmedUsageCount === 0);

    const date = new Date(a.created_at);
    const matchesDate =
      dateFilter === 'all' ||
      (dateFilter === 'today' && isToday(date)) ||
      (dateFilter === 'week' && isWithinInterval(date, { start: subDays(new Date(), 7), end: new Date() }));

    return matchesSearch && matchesType && matchesChannel && matchesArchived && matchesUsage && matchesDate;
  });

  const getCitationCount = (artifactId: string) => {
    return items.filter(item =>
      (item.source_artifact_id === artifactId ||
        (item.meta && item.meta.citation && item.meta.citation.artifact_id === artifactId)) &&
      item.status !== 'suggestion'
    ).length;
  };

  const [isCleaning, setIsCleaning] = useState(false);

  const handleCleanup = async () => {
    if (!currentProject) return;

    // 找出所有無效文件
    const removableArtifacts = artifacts.filter(a => {
      const confirmedUsageCount = items.filter(item =>
        (item.source_artifact_id === a.id || item.meta?.citation?.artifact_id === a.id) &&
        item.status !== 'suggestion'
      ).length;

      const isManual = a.meta?.is_manual === true;
      const isSystemUsed = confirmedUsageCount > 0;

      return !isManual && !isSystemUsed;
    });

    if (removableArtifacts.length === 0) {
      toast.info('目前沒有可清理的文件');
      return;
    }

    if (!confirm(`確定要永久刪除 ${removableArtifacts.length} 個無效文件嗎？\n注意：此動作無法復原。`)) {
      return;
    }

    setIsCleaning(true);
    let deletedCount = 0;

    try {
      const storage = getStorageClient();

      // 批次刪除（並行處理以加快速度）
      await Promise.all(removableArtifacts.map(async (a) => {
        const { error } = await storage.deleteArtifact(a.id);
        if (!error) deletedCount++;
      }));

      toast.success(`清理完成：已刪除 ${deletedCount} 個文件`);
      loadData();
    } catch (error) {
      console.error('Cleanup failed:', error);
      toast.error('清理過程中發生錯誤');
    } finally {
      setIsCleaning(false);
    }
  };

  const handleCreateArtifact = async () => {
    if (!currentProject) return;
    if (newType !== 'file' && !newContent) return;
    if (newType === 'file' && !selectedFile) return;

    setIsCreating(true);
    try {
      const storage = getStorageClient();
      const createParams: any = {
        project_id: currentProject.id,
        content_type: newType,
        meta: {
          channel: newChannel,
          source_info: newSourceInfo || (newType === 'link' ? newContent : new Date().toLocaleString()),
          is_manual: true
        }
      };

      let textContentForEmbedding = '';

      if (newType === 'file' && selectedFile) {
        // 1. Upload File
        const uploadRes = await storage.uploadFile(currentProject.id, selectedFile);
        if (uploadRes.error || !uploadRes.data) throw new Error('Upload failed');

        createParams.storage_path = uploadRes.data.storagePath;
        createParams.file_url = uploadRes.data.fileUrl;
        createParams.file_size = uploadRes.data.fileSize;
        createParams.content_type = selectedFile.type || 'application/octet-stream';

        // Override meta
        if (!newSourceInfo) createParams.meta.source_info = selectedFile.name;
        createParams.meta.file_name = selectedFile.name;

        // 2. Parse Document
        try {
          const parseRes = await parseDocument(selectedFile);
          textContentForEmbedding = parseRes.text || '';
        } catch (e) {
          console.warn('Document parsing failed, skipping embedding for file content.', e);
        }

        createParams.original_content = ''; // Content is in storage for files
      } else {
        createParams.original_content = newContent;
        textContentForEmbedding = newContent;
      }

      // 3. Create Artifact
      const { data: artifact, error } = await storage.createArtifact(createParams);

      if (error || !artifact) throw error;

      // 4. Trigger Embedding (Direct Library Upload = Auto Embed)
      if (textContentForEmbedding) {
        try {
          await storage.embedContent(
            textContentForEmbedding,
            artifact.id,
            'artifact',
            currentProject.id,
            { fileName: createParams.meta.source_info }
          );
        } catch (embedError) {
          console.error('Embedding failed:', embedError);
          toast.error('文件已上傳，但索引建立失敗');
        }
      }

      toast.success('文件已匯入並完成索引');
      setIsCreateOpen(false);
      setNewContent('');
      setNewSourceInfo('');
      setSelectedFile(null);
      loadData();
    } catch (error) {
      console.error('Failed to create artifact:', error);
      toast.error('建立失敗');
    } finally {
      setIsCreating(false);
    }
  };

  if (!currentProject) return null;

  return (
    <div className="space-y-6 border-2 border-red-500 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="flex items-center gap-2">
              文件庫
            </h1>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCleanup}
              disabled={isCleaning}
              className="h-7 text-xs px-2"
            >
              {isCleaning ? <Hash className="h-3 w-3 animate-spin mr-1" /> : <Trash2 className="h-3 w-3 mr-1" />}
              清除無效 ({artifacts.filter(a => {
                const confirmedUsageCount = items.filter(item =>
                  (item.source_artifact_id === a.id || item.meta?.citation?.artifact_id === a.id) &&
                  item.status !== 'suggestion'
                ).length;
                const isManual = a.meta?.is_manual === true;
                return !isManual && confirmedUsageCount === 0;
              }).length})
            </Button>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">管理專案來源資料、證據回溯與敏感資訊遮罩</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          匯入文件
        </Button>
      </div>

      <DocumentFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedTypes={selectedTypes}
        onTypeChange={setSelectedTypes}
        selectedChannels={selectedChannels}
        onChannelChange={setSelectedChannels}
        usageFilter={usageFilter}
        onUsageFilterChange={setUsageFilter}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        showArchived={showArchived}
        onShowArchivedChange={setShowArchived}
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : filteredArtifacts.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredArtifacts.map((artifact) => (
            <DocumentCard
              key={artifact.id}
              artifact={artifact}
              citationCount={getCitationCount(artifact.id)}
              onClick={(a) => {
                setSelectedArtifact(a);
                setIsDetailOpen(true);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-muted/10 border-2 border-dashed rounded-xl">
          <FileSearch className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-muted-foreground font-medium">
            {showArchived ? '無封存文件' : '找不到符合條件的文件'}
          </h3>
          <p className="text-muted-foreground/60 text-sm mt-1">
            {showArchived ? '目前專案中沒有任何封存的文件資料。' : '嘗試調整篩選條件或匯入新文件'}
          </p>
          {(searchQuery || selectedTypes.length > 0 || selectedChannels.length > 0 || usageFilter !== 'all' || dateFilter !== 'all') && (
            <Button
              variant="link"
              onClick={() => {
                setSearchQuery('');
                setSelectedTypes([]);
                setSelectedChannels([]);
                setUsageFilter('all');
                setDateFilter('all');
              }}
              className="mt-2 text-accent"
            >
              顯示所有文件
            </Button>
          )}
        </div>
      )}

      {/* Detail Sheet */}
      <DocumentDetail
        artifact={selectedArtifact}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onUpdate={loadData}
      />

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>匯入新文件</DialogTitle>
            <DialogDescription>
              將文字、連結或對話內容匯入專案。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="flex gap-2 p-1 bg-muted rounded-lg overflow-x-auto">
              <Button
                variant={newType === 'text' ? 'secondary' : 'ghost'}
                size="sm"
                className="flex-1 gap-2 h-8 min-w-[80px]"
                onClick={() => setNewType('text')}
              >
                <AlignLeft className="h-4 w-4" />
                文件
              </Button>
              <Button
                variant={newType === 'file' ? 'secondary' : 'ghost'}
                size="sm"
                className="flex-1 gap-2 h-8 min-w-[80px]"
                onClick={() => setNewType('file')}
              >
                <Upload className="h-4 w-4" />
                檔案
              </Button>
              <Button
                variant={newType === 'conversation' ? 'secondary' : 'ghost'}
                size="sm"
                className="flex-1 gap-2 h-8 min-w-[80px]"
                onClick={() => setNewType('conversation')}
              >
                <MessagesSquare className="h-4 w-4" />
                對話串
              </Button>
              <Button
                variant={newType === 'link' ? 'secondary' : 'ghost'}
                size="sm"
                className="flex-1 gap-2 h-8 min-w-[80px]"
                onClick={() => setNewType('link')}
              >
                <LinkIcon className="h-4 w-4" />
                連結
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">來源通路</label>
                <Select value={newChannel} onValueChange={(v: any) => setNewChannel(v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="選擇通路" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="line">LINE</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="meeting">會議錄</SelectItem>
                    <SelectItem value="upload">上傳</SelectItem>
                    <SelectItem value="paste">貼上</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">來源資訊 (標題/檔名)</label>
                <Input
                  className="h-9"
                  placeholder="例如: 會議紀錄 12/19"
                  value={newSourceInfo}
                  onChange={(e) => setNewSourceInfo(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                {newType === 'link' ? '網址 URL' : '內容'}
              </label>
              {newType === 'link' ? (
                <Input
                  placeholder="https://..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                />
              ) : newType === 'file' ? (
                <div className="border-2 border-dashed border-input rounded-xl p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer relative group">
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    onChange={(e) => e.target.files && setSelectedFile(e.target.files[0])}
                  />
                  <div className="space-y-2 pointer-events-none group-hover:scale-105 transition-transform">
                    <div className="h-10 w-10 mx-auto bg-muted rounded-full flex items-center justify-center">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">
                      {selectedFile ? selectedFile.name : "點擊或拖曳檔案至此"}
                    </p>
                    {selectedFile && (
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <Textarea
                  placeholder={newType === 'conversation' ? "請貼上對話內容，AI 會自動辨識發言者與時間..." : "請在此貼上文字內容..."}
                  className="min-h-[160px] resize-none"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                />
              )}
            </div>

            <div className="flex items-start gap-3 p-4 bg-accent/5 rounded-xl border border-accent/10">
              <AlertCircle className="h-5 w-5 text-accent mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-accent">證據鏈保護與隱私偵測</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  匯入後 AI 會自動掃描敏感資訊（帳密、個資、內部連結）。
                  原始內容匯入後不可修改，僅能透過封存功能管理。
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="flex-1 sm:flex-none">取消</Button>
            <Button onClick={handleCreateArtifact} disabled={(newType === 'file' ? !selectedFile : !newContent) || isCreating} className="flex-1 sm:flex-none">
              {isCreating ? (
                <><Hash className="h-4 w-4 animate-spin mr-2" /> 處理中...</>
              ) : '匯入專案'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}