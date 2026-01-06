export interface Project {
    id: string
    name: string
    description?: string
    status: 'active' | 'archived' | 'pending_deletion' | 'deleted'
    pm_id?: string
    created_at: string
    updated_at: string
}

export interface Artifact {
    id: string
    project_id: string
    content_type: string
    original_content: string
    created_at: string
    meta?: Record<string, any>
}

export interface Item {
    id: string
    project_id: string
    type: 'general' | 'pending' | 'decision' | 'cr'
    status: 'not_started' | 'in_progress' | 'blocked' | 'awaiting_response' | 'completed'
    title: string
    description: string
    assignee_id?: string
    due_date?: string
    priority?: 'low' | 'medium' | 'high'
    source_artifact_id?: string
    work_package_id?: string
    parent_id?: string
    created_at: string
    updated_at: string
}

export interface Suggestion {
    id: string
    type: 'general' | 'pending' | 'decision' | 'cr'
    title: string
    description?: string
    reason?: string
    confidence?: number
    assignee_id?: string
    due_date?: string
    source_artifact_id?: string
}
