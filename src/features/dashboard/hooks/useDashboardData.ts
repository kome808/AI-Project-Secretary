import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { useProjectStore } from '@/stores/useProjectStore'
import { Item, Member } from '@/lib/storage/types'

export interface NeedsAttentionItem {
    id: string
    title: string
    type: 'overdue' | 'blocked' | 'pending'
    typeBadge: string
    daysInfo: string
    priority?: 'high' | 'medium' | 'low'
    itemType: string
}

export const useDashboardData = () => {
    const projectId = useProjectStore((state) => state.currentProjectId)

    // Fetch Items
    const itemsQuery = useQuery({
        queryKey: ['items', projectId],
        queryFn: async () => {
            if (!projectId) return []
            const { data, error } = await apiClient.getItems(projectId)
            if (error) throw error
            return (data || []).filter(item => item.status !== 'suggestion')
        },
        enabled: !!projectId,
    })

    // Fetch Members
    const membersQuery = useQuery({
        queryKey: ['members', projectId],
        queryFn: async () => {
            if (!projectId) return []
            const { data, error } = await apiClient.getMembers(projectId)
            if (error) throw error
            return data || []
        },
        enabled: !!projectId,
    })

    // Derived State: Needs Attention
    const needsAttention = calculateNeedsAttention(itemsQuery.data || [])

    // Derived State: Brief Summary
    const briefSummary = generateBriefSummary(itemsQuery.data || [])

    const isLoading = itemsQuery.isLoading || membersQuery.isLoading
    const error = itemsQuery.error || membersQuery.error

    return {
        items: itemsQuery.data || [],
        members: membersQuery.data || [],
        needsAttention,
        briefSummary,
        isLoading,
        error,
        refetch: () => {
            itemsQuery.refetch()
            membersQuery.refetch()
        }
    }
}

// Logic extracted from DashboardPage.tsx
function calculateNeedsAttention(allItems: Item[]): NeedsAttentionItem[] {
    const attention: NeedsAttentionItem[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Overdue
    const overdue = allItems.filter((item) => {
        if (item.status === 'completed') return false
        if (!item.due_date) return false
        const dueDate = new Date(item.due_date)
        dueDate.setHours(0, 0, 0, 0)
        return dueDate < today
    })

    overdue.forEach((item) => {
        const daysOverdue = Math.floor(
            (today.getTime() - new Date(item.due_date!).getTime()) / (1000 * 60 * 60 * 24)
        )
        attention.push({
            id: item.id,
            title: item.title,
            type: 'overdue',
            typeBadge: '逾期',
            daysInfo: `逾期 ${daysOverdue} 天`,
            priority: item.priority,
            itemType: item.type,
        })
    })

    // Blocked
    const blocked = allItems.filter((item) => item.status === 'blocked')
    blocked.forEach((item) => {
        const daysSince = Math.floor(
            (today.getTime() - new Date(item.updated_at).getTime()) / (1000 * 60 * 60 * 24)
        )
        attention.push({
            id: item.id,
            title: item.title,
            type: 'blocked',
            typeBadge: '卡關',
            daysInfo: `已卡關 ${daysSince} 天`,
            priority: item.priority,
            itemType: item.type,
        })
    })

    // Sort
    attention.sort((a, b) => {
        const priorityOrder = { overdue: 0, blocked: 1, pending: 2 }
        return priorityOrder[a.type] - priorityOrder[b.type]
    })

    return attention.slice(0, 8)
}

function generateBriefSummary(allItems: Item[]): string {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const overdueCount = allItems.filter((item) => {
        if (item.status === 'completed') return false
        if (!item.due_date) return false
        const dueDate = new Date(item.due_date)
        dueDate.setHours(0, 0, 0, 0)
        return dueDate < today
    }).length

    const blockedCount = allItems.filter((item) => item.status === 'blocked').length

    let summary = '早安！'

    if (overdueCount === 0 && blockedCount === 0) {
        summary += '目前專案狀態良好，沒有緊急事項需要處理。'
    } else {
        const issues: string[] = []
        if (overdueCount > 0) issues.push(`${overdueCount} 項任務逾期`)
        if (blockedCount > 0) issues.push(`${blockedCount} 項任務卡關`)

        summary += `今天有 ${issues.join('、')}需要您的關注。`
    }

    return summary
}
