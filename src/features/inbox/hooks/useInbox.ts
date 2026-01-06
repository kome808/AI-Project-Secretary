import { useState } from 'react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useProjectStore } from '@/stores/useProjectStore';
import { apiClient } from '@/lib/api/client';
import { Item, ItemStatus } from '@/lib/storage/types';
import { getStorageClient } from '@/lib/storage';

export const useInbox = () => {
    const projectId = useProjectStore((state) => state.currentProjectId);
    const queryClient = useQueryClient();

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBatchProcessing, setIsBatchProcessing] = useState(false);

    // Fetch Inbox Items (Suggestions)
    const { data: items = [], isLoading: isLoadingItems } = useQuery({
        queryKey: ['items', projectId, 'suggestion'],
        queryFn: async () => {
            if (!projectId) return [];
            const { data, error } = await apiClient.getItems(projectId, { status: 'suggestion' });
            if (error) throw error;
            return data || [];
        },
        enabled: !!projectId,
    });

    // Fetch Members (for assignment)
    const { data: members = [] } = useQuery({
        queryKey: ['members', projectId],
        queryFn: async () => {
            if (!projectId) return [];
            const { data, error } = await apiClient.getMembers(projectId);
            if (error) throw error;
            return data || [];
        },
        enabled: !!projectId,
    });

    // Actions
    const confirmItem = async (item: Item) => {
        const storage = getStorageClient();

        try {
            // 1. Handle Artifact Creation from pending
            let artifactId = item.source_artifact_id;

            if (!artifactId && item.meta?._pending_artifact) {
                const pendingArtifact = item.meta._pending_artifact;
                const { data: artifact, error: artifactError } = await storage.createArtifact({
                    project_id: item.project_id,
                    content_type: pendingArtifact.type || 'text',
                    original_content: pendingArtifact.content,
                    meta: {
                        source_info: pendingArtifact.source_info || new Date().toLocaleString(),
                        is_manual: true
                    }
                });
                if (artifactError || !artifact) throw new Error('Failed to create artifact');
                artifactId = artifact.id;
            }

            // 🔥 RAG Enrollment: Triggered on Confirmation
            if (artifactId) {
                try {
                    const { data: artifact } = await storage.getArtifactById(artifactId);
                    // Only embed if content is available and not already embedded (optional check)
                    // We assume if it was temporary, it wasn't embedded yet.
                    if (artifact && (artifact.original_content || artifact.meta?.is_temporary)) {
                        const contentToEmbed = artifact.original_content || (artifact.meta as any)?.content_preview || ''; // Fallback

                        if (contentToEmbed) {
                            await storage.embedContent(
                                contentToEmbed,
                                artifact.id,
                                'artifact',
                                item.project_id,
                                { fileName: artifact.meta?.file_name || artifact.meta?.source_info }
                            );
                        }

                        // Mark as permanent in Library
                        await storage.updateArtifact(artifact.id, {
                            meta: { ...artifact.meta, is_temporary: false, is_manual: true }
                        });
                    }
                } catch (ragError) {
                    console.error('RAG Enrollment on Confirm failed:', ragError);
                    // Don't block confirmation
                }
            }

            // 2. Determine Status & Cleanup
            let newStatus: ItemStatus = 'not_started';
            const updates: Partial<Item> = { status: newStatus };

            if (item.type === 'decision') {
                updates.meta = { ...(item.meta || {}), status: 'active' };
            } else if (item.type === 'cr') {
                newStatus = 'in_progress';
                updates.meta = { ...(item.meta || {}) };
            } else {
                updates.meta = { ...(item.meta || {}) };
            }

            if (updates.meta?._pending_artifact) {
                delete updates.meta._pending_artifact;
            }

            updates.status = newStatus;
            if (artifactId) updates.source_artifact_id = artifactId;

            // 3. Update Item
            const { error } = await storage.updateItem(item.id, updates);
            if (error) throw error;

            toast.success('✓ 已確認入庫');
            queryClient.invalidateQueries({ queryKey: ['items', projectId] });
            setSelectedIds(prev => prev.filter(id => id !== item.id));

        } catch (error) {
            console.error(error);
            toast.error('確認失敗');
        }
    };

    const rejectItem = async (itemId: string) => {
        const storage = getStorageClient();
        const { error } = await storage.deleteItem(itemId);
        if (error) {
            toast.error('刪除失敗');
            return;
        }
        toast.success('已拒絕建議卡');
        queryClient.invalidateQueries({ queryKey: ['items', projectId] });
        setSelectedIds(prev => prev.filter(id => id !== itemId));
    };

    const updateItem = async (itemId: string, updates: Partial<Item>) => {
        const storage = getStorageClient();
        const { error } = await storage.updateItem(itemId, updates);
        if (error) {
            toast.error('更新失敗');
            return;
        }
        toast.success('已更新');
        queryClient.invalidateQueries({ queryKey: ['items', projectId] });
    };

    const batchConfirm = async () => {
        if (selectedIds.length === 0) return;
        setIsBatchProcessing(true);
        const storage = getStorageClient();

        try {
            const selectedItems = items.filter(i => selectedIds.includes(i.id));
            // Sort by level
            const sortedItems = [...selectedItems].sort((a, b) => {
                return (a.meta?.level || 1) - (b.meta?.level || 1);
            });

            const idMapping = new Map<string, string>();
            let successCount = 0;

            for (const item of sortedItems) {
                let artifactId = item.source_artifact_id;
                if (!artifactId && item.meta?._pending_artifact) {
                    const pending = item.meta._pending_artifact;
                    const { data: art } = await storage.createArtifact({
                        project_id: item.project_id,
                        content_type: pending.type || 'text',
                        original_content: pending.content,
                        meta: {
                            source_info: pending.source_info,
                            is_manual: true
                        }
                    });
                    if (art) artifactId = art.id;
                }

                // Batch RAG Enrollment
                if (artifactId) {
                    try {
                        const { data: artifact } = await storage.getArtifactById(artifactId);
                        if (artifact && (artifact.original_content || artifact.meta?.is_temporary)) {
                            const contentToEmbed = artifact.original_content || (artifact.meta as any)?.content_preview || '';
                            if (contentToEmbed) {
                                await storage.embedContent(contentToEmbed, artifact.id, 'artifact', item.project_id, { fileName: artifact.meta?.file_name });
                            }
                            await storage.updateArtifact(artifact.id, { meta: { ...artifact.meta, is_temporary: false, is_manual: true } });
                        }
                    } catch (e) {
                        console.error('Batch RAG Error', e);
                    }
                }

                let finalParentId = item.parent_id;
                if (item.parent_id && idMapping.has(item.parent_id)) {
                    finalParentId = idMapping.get(item.parent_id);
                }

                let newStatus: ItemStatus = 'not_started';
                if (item.type === 'cr') newStatus = 'in_progress';

                const updates: Partial<Item> = {
                    status: newStatus,
                    source_artifact_id: artifactId,
                    parent_id: finalParentId || undefined
                };

                // Clean meta
                updates.meta = { ...(item.meta || {}) };
                delete updates.meta?._pending_artifact;
                if (item.type === 'decision') updates.meta.status = 'active';

                const { error } = await storage.updateItem(item.id, updates);
                if (!error) {
                    successCount++;
                    idMapping.set(item.id, item.id);
                }
            }

            toast.success(`✓ 已確認 ${successCount} 張建議卡入庫`);
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ['items', projectId] });

        } catch (e) {
            console.error(e);
            toast.error('批次處理發生錯誤');
        } finally {
            setIsBatchProcessing(false);
        }
    };

    const batchReject = async () => {
        if (!confirm(`確定要拒絕 ${selectedIds.length} 張建議卡？`)) return;
        const storage = getStorageClient();
        try {
            await Promise.all(selectedIds.map(id => storage.deleteItem(id)));
            toast.success(`拒絕 ${selectedIds.length} 張建議卡`);
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ['items', projectId] });
        } catch (e) {
            toast.error('批次刪除失敗');
        }
    };

    const toggleSelect = (itemId: string) => {
        setSelectedIds(prev => prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]);
    };

    const clearSelection = () => setSelectedIds([]);

    return {
        items,
        members,
        isLoading: isLoadingItems,
        selectedIds,
        isBatchProcessing,
        confirmItem,
        rejectItem,
        updateItem,
        batchConfirm,
        batchReject,
        toggleSelect,
        clearSelection
    };
};
