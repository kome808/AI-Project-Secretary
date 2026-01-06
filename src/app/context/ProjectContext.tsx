import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { Project, StorageFactory, StorageAdapter, Member } from '../../lib/storage';
import { useProjectStore } from '../../stores/useProjectStore';

interface ProjectContextType {
  projects: Project[];
  currentProject: Project | null;
  currentUser: Member | null;
  adapter: StorageAdapter;
  isLoading: boolean;
  error: Error | null;
  selectProject: (projectId: string) => void;
  refreshProjects: () => Promise<void>;
  createProject: (name: string, description?: string) => Promise<Project | null>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// Singleton dummyContext to avoid creating multiple adapters
let dummyContextInstance: ProjectContextType | null = null;

function getDummyContext(): ProjectContextType {
  // 只創建一次 dummyContext（Singleton）
  if (!dummyContextInstance) {
    dummyContextInstance = {
      projects: [],
      currentProject: null,
      currentUser: null,
      adapter: null as any, // 延遲初始化，避免重複創建 Client
      isLoading: true,
      error: null,
      selectProject: () => { },
      refreshProjects: async () => { },
      createProject: async () => null,
    };
  }
  return dummyContextInstance;
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(() => {
    return localStorage.getItem('currentProjectId');
  });
  const [currentUser, setCurrentUser] = useState<Member | null>(() => {
    // Mock current user from localStorage or use default
    const savedUser = localStorage.getItem('current_user'); // 統一使用 'current_user' key
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch {
        return null;
      }
    }
    // 不再提供預設值，由 App.tsx 的 DevUserSwitcher.setAdmin() 處理
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 監聽 localStorage 的 current_user 變化
  useEffect(() => {
    const handleStorageChange = () => {
      const savedUser = localStorage.getItem('current_user');
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          setCurrentUser(user);
          console.log('✅ ProjectContext: 用戶已更新', user);
        } catch (error) {
          console.error('❌ ProjectContext: 解析用戶資料失敗', error);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
    };

    // 監聽 storage 事件（跨視窗同步）
    window.addEventListener('storage', handleStorageChange);

    // 監聽自定義事件（同視窗內的更新）
    window.addEventListener('userChanged', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userChanged', handleStorageChange);
    };
  }, []);

  // 使用 useMemo 確保 adapter 只創建一次（除非模式改變）
  // 這樣可以避免在組件重新渲染時重複創建 Supabase Client
  const adapter = useMemo(() => {
    return StorageFactory.getAdapter();
  }, []); // 空依賴陣列，只在首次渲染時創建

  const loadProjects = async () => {
    setIsLoading(true);

    // Initialize mock data if needed (only for LocalAdapter in dev)
    if (adapter.initializeMockData) {
      await adapter.initializeMockData();
    }

    try {
      const { data, error } = await adapter.getProjects();
      if (error) {
        // 如果是表不存在的錯誤，只記錄但不設為 error 狀態
        if (error.message && error.message.includes('Could not find the table')) {
          console.warn('⚠️ Projects 表尚未建立，跳過載入專案列表');
          setProjects([]);
        } else {
          setError(error);
        }
      } else {
        // Filter out pending_deletion projects for general use
        const activeProjects = (data || []).filter(p => p.status !== 'pending_deletion');
        setProjects(activeProjects);
        // If no project selected but projects exist, select the first one
        if (!currentProjectId && activeProjects && activeProjects.length > 0) {
          selectProject(activeProjects[0].id);
        }
      }
    } catch (err) {
      console.error('載入專案列表時發生錯誤:', err);
      setProjects([]);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadProjects();
  }, []);

  // Sync currentProjectId and currentUser changes to Zustand store
  useEffect(() => {
    if (currentProjectId) {
      useProjectStore.getState().selectProject(currentProjectId);
    }
  }, [currentProjectId]);

  useEffect(() => {
    useProjectStore.getState().setCurrentUser(currentUser);
  }, [currentUser]);



  const selectProject = (projectId: string) => {
    setCurrentProjectId(projectId);
    localStorage.setItem('currentProjectId', projectId);
    // Sync with Zustand store
    useProjectStore.getState().selectProject(projectId);
  };

  const createProject = async (name: string, description?: string) => {
    setIsLoading(true);
    const { data, error } = await adapter.createProject({
      name,
      description,
      status: 'active'
    });

    if (error) {
      setError(error);
      setIsLoading(false);
      return null;
    }

    await loadProjects(); // Refresh list
    if (data) {
      selectProject(data.id); // Auto select new project
    }
    return data;
  };

  const currentProject = projects.find(p => p.id === currentProjectId) || null;

  return (
    <ProjectContext.Provider value={{
      projects,
      currentProject,
      currentUser,
      adapter,
      isLoading,
      error,
      selectProject,
      refreshProjects: loadProjects,
      createProject
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    // 這是一個防禦性措施，用於處理組件在 Provider 外部渲染的情況
    // 靜默回傳 dummy context，不輸出警告（因為我們的架構已經確保所有組件都在 Provider 內）
    return getDummyContext();
  }
  return context;
}