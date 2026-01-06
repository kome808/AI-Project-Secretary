import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { useProjectStore } from '@/stores/useProjectStore'

export const useProject = (projectId?: string) => {
    const selectedProjectId = useProjectStore((state) => state.currentProjectId)
    const targetId = projectId || selectedProjectId

    const query = useQuery({
        queryKey: ['project', targetId],
        queryFn: async () => {
            if (!targetId) return null
            const { data, error } = await apiClient.getProjectById(targetId)
            if (error) throw error
            return data
        },
        enabled: !!targetId,
    })

    return {
        project: query.data,
        isLoading: query.isLoading,
        error: query.error,
    }
}
