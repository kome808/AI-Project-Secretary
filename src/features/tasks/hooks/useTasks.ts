import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useProjectStore } from '@/stores/useProjectStore';
import { apiClient } from '@/lib/api/client';
import { getStorageClient } from '@/lib/storage';
import { Item, Member } from '@/lib/storage/types';

export type ViewType = 'actions' | 'work' | 'features';

export const useTasks = () => {
    const projectId = useProjectStore((state) => state.currentProjectId);
    const currentUser = useProjectStore((state) => state.currentUser);
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();

    // --- View Management ---
    const viewParam = searchParams.get('view') as ViewType | null;

    const [currentView, setCurrentView] = useState<ViewType>(() => {
        // 1. URL
        if (viewParam && ['actions', 'work', 'features'].includes(viewParam)) return viewParam;

        // 2. Storage
        if (projectId) {
            const saved = localStorage.getItem(`tasks_view_${projectId}`);
            if (saved && ['actions', 'work', 'features'].includes(saved)) return saved as ViewType;
        }

        // 3. Default by Role
        const isPM = currentUser?.role === 'pm' || currentUser?.role === 'admin';
        return isPM ? 'work' : 'actions';
    });

    useEffect(() => {
        if (currentView) {
            setSearchParams({ view: currentView });
            if (projectId) {
                localStorage.setItem(`tasks_view_${projectId}`, currentView);
            }
        }
    }, [currentView, projectId, setSearchParams]);

    // --- Data Fetching ---
    const { data: items = [], isLoading: isLoadingItems, refetch: refetchItems } = useQuery({
        queryKey: ['items', projectId],
        queryFn: async () => {
            if (!projectId) return [];
            const { data, error } = await apiClient.getItems(projectId);
            if (error) throw error;
            // Filter out suggestions (they belong in Inbox)
            return (data || []).filter(item => item.status !== 'suggestion');
        },
        enabled: !!projectId,
    });

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

    // --- Actions ---
    const updateItem = async (itemId: string, updates: Partial<Item>) => {
        const storage = getStorageClient();
        const { error } = await storage.updateItem(itemId, updates);

        if (!error) {
            // Optimistic update or invalidation
            queryClient.invalidateQueries({ queryKey: ['items', projectId] });
            return true;
        }
        return false;
    };

    return {
        items,
        members,
        currentUser,
        isLoading: isLoadingItems,
        currentView,
        setCurrentView,
        updateItem,
        refresh: refetchItems
    };
};
