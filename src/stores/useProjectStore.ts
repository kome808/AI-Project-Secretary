import { create } from 'zustand'
import { Member } from '@/lib/storage/types'

export interface ProjectState {
    currentProjectId: string | null
    currentUser: Member | null
    selectProject: (projectId: string) => void
    setCurrentUser: (user: Member | null) => void
}

export const useProjectStore = create<ProjectState>((set) => ({
    currentProjectId: null, // Initial should be null
    currentUser: null,
    selectProject: (projectId) => set({ currentProjectId: projectId }),
    setCurrentUser: (user) => set({ currentUser: user }),
}))
