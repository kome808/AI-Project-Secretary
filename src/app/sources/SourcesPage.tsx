import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { Artifact, Item } from '@/lib/storage/types';
import { getStorageClient } from '@/lib/storage';
import { FileText, RefreshCw, Plus, Search, Filter, ChevronLeft, ChevronRight, Trash2, X, Hash, Database, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { SourceCard } from './components/SourceCard';
// SourceDetailPanel removed
import { CreateSourceDialog } from './components/CreateSourceDialog';
import { useSources, SourceType, UsageFilter } from '@/features/sources/hooks/useSources';
import { getCurrentUser, isSystemAdmin } from '@/lib/permissions/statusPermissions';

export function SourcesPage() {
  const { currentProject } = useProject();
  const navigate = useNavigate();

  const {
    isLoading,
    artifacts,
    paginatedArtifacts,
    filteredArtifacts, // for count
    totalPages,
    currentPage,
    setCurrentPage,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    usageFilter,
    setUsageFilter,
    typeCounts,
    usageCounts,
    selectedIds,
    setSelectedIds,
    toggleSelect,
    selectAll,
    batchDelete,
    isDeleting,
    getCitationCount,
    refresh,
    items, // needed for detail panel
    duplicateArtifacts,
    removeDuplicates
  } = useSources();

  // Local UI State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isCleanupConfirmOpen, setIsCleanupConfirmOpen] = useState(false);
  const [cleanupCount, setCleanupCount] = useState(0);
  const [isPruning, setIsPruning] = useState(false);
  const [isPruneConfirmOpen, setIsPruneConfirmOpen] = useState(false);
  const [isRemoveDupConfirmOpen, setIsRemoveDupConfirmOpen] = useState(false);
  const [isRemovingDuplicates, setIsRemovingDuplicates] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, usageFilter, setCurrentPage]);

  // Handle selection mode toggle
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedIds([]);
  };

  const handleCleanup = () => {
    // 找出所有無效文件
    const removableArtifacts = artifacts.filter(a => {
      const strictCount = items.filter(item =>
        (item.source_artifact_id === a.id || item.meta?.citation?.artifact_id === a.id) &&
        item.status !== 'suggestion'
      ).length;

      const isManual = a.meta?.is_manual === true;
      return !isManual && strictCount === 0;
    });

    if (removableArtifacts.length === 0) {
      toast.info('目前沒有可清理的文件');
      return;
    }

    setCleanupCount(removableArtifacts.length);
    setIsCleanupConfirmOpen(true);
  };

  const handlePruneStorage = () => {
    if (!currentProject) return;
    setIsPruneConfirmOpen(true);
  };

  const executePruneStorage = async () => {
    if (!currentProject) return;
    setIsPruneConfirmOpen(false);

    setIsPruning(true);
    try {
      const storage = getStorageClient();
      if (!storage.pruneOrphanedFiles) {
        toast.info('此環境不支援儲存空間清理');
        return;
      }

      const { data, error } = await storage.pruneOrphanedFiles(currentProject.id);

      if (error) throw error;

      const count = data?.deletedCount || 0;
      if (count > 0) {
        toast.success(`清理完成：已移除 ${count} 個孤兒檔案`);
      } else {
        toast.info('掃描完成：沒有發現孤兒檔案');
      }
    } catch (error) {
      console.error('Prune failed:', error);
      toast.error('清理過程中發生錯誤');
    } finally {
      setIsPruning(false);
    }
  };

  const executeCleanup = async () => {
    setIsCleanupConfirmOpen(false);
    setIsCleaning(true);
    let deletedCount = 0;

    const removableArtifacts = artifacts.filter(a => {
      const strictCount = items.filter(item =>
        (item.source_artifact_id === a.id || item.meta?.citation?.artifact_id === a.id) &&
        item.status !== 'suggestion'
      ).length;

      const isManual = a.meta?.is_manual === true;
      return !isManual && strictCount === 0;
    });

    try {
      const storage = getStorageClient();

      await Promise.all(removableArtifacts.map(async (a) => {
        const { error } = await storage.deleteArtifact(a.id);
        if (!error) deletedCount++;
      }));

      toast.success(`清理完成：已刪除 ${deletedCount} 個文件`);
      refresh();
    } catch (error) {
      console.error('Cleanup failed:', error);
      toast.error('清理失敗');
    } finally {
      setIsCleaning(false);
    }
  };

  const handleBatchDeleteWrapper = async () => {
    await batchDelete();
    setSelectionMode(false);
  };

  const handleSelectArtifact = (artifact: Artifact) => {
    navigate(`/app/sources/${artifact.id}`);
  };

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-[var(--spacing-3)]">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto opacity-30" />
          <p className="text-muted-foreground">
            <label>請先選擇專案</label>
          </p>
        </div>
      </div>
    );
  }

  const startIndex = (currentPage - 1) * 12; // Must match hook
  const endIndex = startIndex + 12;

  return (
    <div className="space-y-[var(--spacing-6)] max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-[var(--spacing-1)]">
          <h1 className="flex items-center gap-[var(--spacing-2)]">
            <FileText className="h-6 w-6" />
            文件庫
          </h1>
          <p className="text-muted-foreground">
            <label>管理所有來源資料，提供證據回溯與反向追蹤</label>
          </p>
        </div>
        <div className="flex items-center gap-[var(--spacing-2)]">
          {!selectionMode && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCleanup}
              disabled={isCleaning || isLoading}
              className="mr-2"
            >
              {isCleaning ? <Hash className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              <label>清除無效 ({
                artifacts.filter(a => {
                  const strictCount = items.filter(item =>
                    (item.source_artifact_id === a.id || item.meta?.citation?.artifact_id === a.id) &&
                    item.status !== 'suggestion'
                  ).length;
                  return a.meta?.is_manual !== true && strictCount === 0;
                }).length
              })</label>
            </Button>
          )}
          {!selectionMode && duplicateArtifacts.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRemoveDupConfirmOpen(true)}
              disabled={isCleaning || isLoading || isRemovingDuplicates}
              className="mr-2 border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isRemovingDuplicates ? '移除中...' : `移除重複 (${duplicateArtifacts.length})`}
            </Button>
          )}
          {!selectionMode && getCurrentUser() && isSystemAdmin(getCurrentUser()!) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePruneStorage}
              disabled={isPruning || isLoading}
              className="mr-2 border-dashed text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200"
            >
              {isPruning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />}
              <label>深度清理</label>
            </Button>
          )}
          {!selectionMode ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={refresh}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                <label>重新整理</label>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectionMode}
              >
                <label>選擇</label>
              </Button>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                <label>匯入文件</label>
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-[var(--spacing-2)] px-[var(--spacing-3)] py-[var(--spacing-2)] rounded-[var(--radius)] bg-primary/10 text-primary">
                <label className="font-medium">已選擇 {selectedIds.length} 個文件</label>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
              >
                <label>{selectedIds.length === paginatedArtifacts.length ? '取消全選' : '全選當前頁'}</label>
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBatchDeleteWrapper}
                disabled={isDeleting || selectedIds.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                <label>{isDeleting ? '刪除中...' : `刪除 (${selectedIds.length})`}</label>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSelectionMode}
              >
                <X className="h-4 w-4 mr-2" />
                <label>取消</label>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-[var(--spacing-4)]">
          <div className="flex items-start gap-[var(--spacing-3)]">
            <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-[var(--spacing-1)]">
              <h3 className="text-primary">
                <label>證據鏈與反向追蹤</label>
              </h3>
              <p className="text-muted-foreground">
                <label>
                  每個來源文件都受到保護，原始內容不可修改。點擊文件可查看完整內容與所有衍生的任務、決議與變更。
                </label>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <div className="space-y-[var(--spacing-4)]">
        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-[var(--spacing-3)] top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="搜尋文件內容或標題..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-[var(--spacing-2)] overflow-x-auto pb-[var(--spacing-2)]">
          <div className="flex items-center gap-[var(--spacing-1)] shrink-0">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <label className="text-muted-foreground">類型：</label>
          </div>
          <Badge
            variant={typeFilter === 'all' ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setTypeFilter('all')}
          >
            全部 ({typeCounts.all})
          </Badge>
          <Badge
            variant={typeFilter === 'text' ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setTypeFilter('text')}
          >
            文字 ({typeCounts.text})
          </Badge>
          <Badge
            variant={typeFilter === 'conversation' ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setTypeFilter('conversation')}
          >
            對話 ({typeCounts.conversation})
          </Badge>
          <Badge
            variant={typeFilter === 'link' ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setTypeFilter('link')}
          >
            連結 ({typeCounts.link})
          </Badge>
          <Badge
            variant={typeFilter === 'file' ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setTypeFilter('file')}
          >
            📎 檔案 ({typeCounts.file})
          </Badge>
          <Badge
            variant={typeFilter === 'image' ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setTypeFilter('image')}
          >
            🖼️ 圖檔 ({typeCounts.image})
          </Badge>

          <div className="w-px h-6 bg-border mx-[var(--spacing-2)]" />

          <label className="text-muted-foreground">引用：</label>
          <Badge
            variant={usageFilter === 'all' ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setUsageFilter('all')}
          >
            全部
          </Badge>
          <Badge
            variant={usageFilter === 'with_usage' ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setUsageFilter('with_usage')}
          >
            已引用 ({usageCounts.with_usage})
          </Badge>
          <Badge
            variant={usageFilter === 'no_usage' ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setUsageFilter('no_usage')}
          >
            未引用 ({usageCounts.no_usage})
          </Badge>
        </div>
      </div>

      {/* Sources Grid */}
      {
        isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-48 rounded-[var(--radius-lg)] bg-muted/50 animate-pulse"
              />
            ))}
          </div>
        ) : filteredArtifacts.length === 0 ? (
          <Card>
            <CardContent className="py-16">
              <div className="text-center space-y-[var(--spacing-3)]">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground opacity-30" />
                <div>
                  <p className="text-muted-foreground">
                    <label>
                      {searchQuery.trim()
                        ? '沒有找到符合的文件'
                        : '目前沒有文件'
                      }
                    </label>
                  </p>
                  {!searchQuery.trim() && (
                    <label className="text-muted-foreground opacity-70">
                      點擊「匯入文件」開始建立證據鏈
                    </label>
                  )}
                </div>
                {(searchQuery.trim() || typeFilter !== 'all' || usageFilter !== 'all') && (
                  <Button
                    variant="link"
                    onClick={() => {
                      setSearchQuery('');
                      setTypeFilter('all');
                      setUsageFilter('all');
                    }}
                  >
                    清除篩選條件
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-[var(--spacing-4)] md:grid-cols-2 lg:grid-cols-3">
              {paginatedArtifacts.map((artifact) => (
                <SourceCard
                  key={artifact.id}
                  artifact={artifact}
                  citationCount={getCitationCount(artifact.id)}
                  onClick={handleSelectArtifact}
                  selected={selectedIds.includes(artifact.id)}
                  onToggleSelect={selectionMode ? toggleSelect : undefined}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-[var(--spacing-2)] mt-[var(--spacing-6)]">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-[var(--spacing-2)]">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    const showPage =
                      page === 1 ||
                      page === totalPages ||
                      Math.abs(page - currentPage) <= 1;

                    const showEllipsis =
                      (page === 2 && currentPage > 3) ||
                      (page === totalPages - 1 && currentPage < totalPages - 2);

                    if (showEllipsis) {
                      return <span key={page} className="px-[var(--spacing-2)] text-muted-foreground">...</span>;
                    }

                    if (!showPage) return null;

                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="min-w-[2.5rem]"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Results info */}
            <div className="text-center text-muted-foreground">
              顯示 {startIndex + 1}-{Math.min(endIndex, filteredArtifacts.length)} / 共 {filteredArtifacts.length} 筆
            </div>
          </>
        )
      }

      {/* Detail Panel */}




  // ...

      {/* Create Dialog */}
      <CreateSourceDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={refresh}
      />

      <AlertDialog open={isCleanupConfirmOpen} onOpenChange={setIsCleanupConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要清理無效文件嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              將永久刪除 {cleanupCount} 個文件。
              <br />
              這些文件是自動產生且未被任何正式任務引用的暫存檔。此動作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={executeCleanup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              確認刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isPruneConfirmOpen} onOpenChange={setIsPruneConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要執行深度清理嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              這將會掃描 Supabase 儲存空間，比對資料庫記錄，並永久刪除所有「孤兒檔案」（資料庫無記錄但硬碟存在的檔案）。
              <br /><br />
              <strong>注意：</strong> 此操作涉及直接刪除檔案且無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={executePruneStorage} className="bg-amber-600 text-white hover:bg-amber-700">
              確認清理
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Duplicates Confirmation Dialog */}
      <AlertDialog open={isRemoveDupConfirmOpen} onOpenChange={setIsRemoveDupConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要移除重複文件嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              將會移除 {duplicateArtifacts.length} 個重複的文件。
              <br /><br />
              系統會<strong>保留較早建立的版本</strong>，移除較新的重複項目。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemovingDuplicates}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setIsRemoveDupConfirmOpen(false);
                setIsRemovingDuplicates(true);
                await removeDuplicates();
                setIsRemovingDuplicates(false);
              }}
              disabled={isRemovingDuplicates}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {isRemovingDuplicates ? '移除中...' : '確認移除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
}