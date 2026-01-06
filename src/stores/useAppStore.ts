import { create } from 'zustand'

interface AppState {
    sidebarOpen: boolean
    toggleSidebar: () => void
    setSidebarOpen: (open: boolean) => void

    // Theme or other global UI states can go here
    isDarkMode: boolean
    toggleDarkMode: () => void
}

export const useAppStore = create<AppState>((set) => ({
    sidebarOpen: true,
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    setSidebarOpen: (open) => set({ sidebarOpen: open }),

    isDarkMode: false, // Default to light or check system preference later
    toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
}))
