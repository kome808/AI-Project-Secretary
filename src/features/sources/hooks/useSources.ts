import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useProjectStore } from '@/stores/useProjectStore';
import { apiClient } from '@/lib/api/client';
import { getStorageClient } from '@/lib/storage';
import { Artifact, Item } from '@/lib/storage/types';

export type SourceType = 'all' | 'text' | 'conversation' | 'link' | 'file' | 'pdf' | 'word' | 'excel' | 'image' | 'markdown';
export type UsageFilter = 'all' | 'with_usage' | 'no_usage';

export const useSources = () => {
  const projectId = useProjectStore((state) => state.currentProjectId);
  const queryClient = useQueryClient();

  // --- Filtering State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<SourceType>('all');
  const [usageFilter, setUsageFilter] = useState<UsageFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // --- Data Fetching ---
  const { data: artifacts = [], isLoading: isArtifactsLoading } = useQuery({
    queryKey: ['artifacts', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await apiClient.getArtifacts(projectId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const { data: items = [], isLoading: isItemsLoading } = useQuery({
    queryKey: ['items', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await apiClient.getItems(projectId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // --- Derived Data / Filtering Logic ---
  const getCitationCount = (artifactId: string) => {
    return items.filter(item => item.source_artifact_id === artifactId).length;
  };

  const matchesTypeFilter = (artifact: Artifact) => {
    const contentType = artifact.content_type || 'text/plain';

    if (typeFilter === 'all') return true;
    if (typeFilter === 'text') return contentType === 'text/plain';
    if (typeFilter === 'conversation') return contentType === 'text/conversation';
    if (typeFilter === 'link') return contentType === 'text/uri-list';
    if (typeFilter === 'image') return contentType.startsWith('image/');
    if (typeFilter === 'file') {
      return contentType.startsWith('application/') && !contentType.startsWith('image/');
    }
    if (typeFilter === 'pdf') return contentType === 'application/pdf';
    if (typeFilter === 'word') return contentType.includes('word');
    if (typeFilter === 'excel') return contentType.includes('excel') || contentType.includes('spreadsheet');
    if (typeFilter === 'markdown') return contentType === 'text/markdown';

    return false;
  };

  const filteredArtifacts = useMemo(() => {
    return artifacts.filter(artifact => {
      const matchesSearch = !searchQuery.trim() ||
        artifact.original_content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (artifact.meta?.source_info && artifact.meta.source_info.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = matchesTypeFilter(artifact);

      const citationCount = getCitationCount(artifact.id);
      const matchesUsage =
        usageFilter === 'all' ||
        (usageFilter === 'with_usage' && citationCount > 0) ||
        (usageFilter === 'no_usage' && citationCount === 0);

      return matchesSearch && matchesType && matchesUsage;
    });
  }, [artifacts, items, searchQuery, typeFilter, usageFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredArtifacts.length / itemsPerPage);
  const paginatedArtifacts = filteredArtifacts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Statistics
  const typeCounts = useMemo(() => ({
    all: artifacts.length,
    text: artifacts.filter(a => (a.content_type || 'text/plain') === 'text/plain').length,
    conversation: artifacts.filter(a => (a.content_type || '') === 'text/conversation').length,
    link: artifacts.filter(a => (a.content_type || '') === 'text/uri-list').length,
    file: artifacts.filter(a => {
      const ct = a.content_type || '';
      return ct.startsWith('application/') && !ct.startsWith('image/');
    }).length,
    pdf: artifacts.filter(a => (a.content_type || '') === 'application/pdf').length,
    word: artifacts.filter(a => (a.content_type || '').includes('word')).length,
    excel: artifacts.filter(a => {
      const ct = a.content_type || '';
      return ct.includes('excel') || ct.includes('spreadsheet');
    }).length,
    image: artifacts.filter(a => (a.content_type || '').startsWith('image/')).length,
    markdown: artifacts.filter(a => (a.content_type || '') === 'text/markdown').length,
  }), [artifacts]);

  const usageCounts = useMemo(() => ({
    all: artifacts.length,
    with_usage: artifacts.filter(a => getCitationCount(a.id) > 0).length,
    no_usage: artifacts.filter(a => getCitationCount(a.id) === 0).length,
  }), [artifacts, items]);

  // Detect duplicate artifacts by storage_path, file_name, or content hash
  const duplicateArtifacts = useMemo(() => {
    const seen = new Map<string, Artifact>();
    const duplicates: Artifact[] = [];

    artifacts.forEach(a => {
      // Build a unique key based on storage_path or original_content (first 500 chars) + file_name
      const fileName = a.meta?.file_name || '';
      const contentKey = a.storage_path || (a.original_content?.slice(0, 500) + fileName);

      if (contentKey && seen.has(contentKey)) {
        // This is a duplicate - keep the older one, mark this as duplicate
        const existing = seen.get(contentKey)!;
        if (new Date(a.created_at) > new Date(existing.created_at)) {
          duplicates.push(a); // Newer one is duplicate
        } else {
          duplicates.push(existing);
          seen.set(contentKey, a); // Replace with older one
        }
      } else if (contentKey) {
        seen.set(contentKey, a);
      }
    });

    return duplicates;
  }, [artifacts]);

  // --- Actions ---
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const batchDelete = async () => {
    if (selectedIds.length === 0) return;

    // Check citations
    const citedArtifacts = selectedIds.filter(id => getCitationCount(id) > 0);
    if (citedArtifacts.length > 0) {
      if (!confirm(`警告：${citedArtifacts.length} 個文件已被任務引用。\n刪除後引用關係將失效，確定要刪除嗎？`)) {
        return;
      }
    }

    setIsDeleting(true);
    const storage = getStorageClient();

    try {
      const results = await Promise.all(
        selectedIds.map(id => storage.deleteArtifact(id))
      );

      const successCount = results.filter(r => !r.error).length;
      if (successCount > 0) toast.success(`已刪除 ${successCount} 個文件`);

      queryClient.invalidateQueries({ queryKey: ['artifacts', projectId] });
      setSelectedIds([]);
    } catch (error) {
      toast.error('批次刪除失敗');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selectedIds.length === paginatedArtifacts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedArtifacts.map(a => a.id));
    }
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['artifacts', projectId] });
    queryClient.invalidateQueries({ queryKey: ['items', projectId] });
  };

  const removeDuplicates = async () => {
    if (duplicateArtifacts.length === 0) {
      toast.info('沒有發現重複的文件');
      return 0;
    }

    const storage = getStorageClient();
    let deletedCount = 0;

    try {
      await Promise.all(
        duplicateArtifacts.map(async (a) => {
          const { error } = await storage.deleteArtifact(a.id);
          if (!error) deletedCount++;
        })
      );

      if (deletedCount > 0) {
        toast.success(`已移除 ${deletedCount} 個重複文件`);
        refresh();
      }
      return deletedCount;
    } catch (error) {
      console.error('Remove duplicates failed:', error);
      toast.error('移除重複文件失敗');
      return 0;
    }
  };

  return {
    artifacts,
    items,
    isLoading: isArtifactsLoading || isItemsLoading,
    filteredArtifacts,
    paginatedArtifacts,
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
    duplicateArtifacts,
    removeDuplicates
  };
};
