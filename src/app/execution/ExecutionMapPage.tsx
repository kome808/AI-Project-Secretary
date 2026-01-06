import React, { useState, useEffect } from 'react';
import { Map, Plus, ChevronRight, ChevronDown, Calendar, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { getStorageClient } from '../../lib/storage';
import { Module, Page, Milestone, Item } from '../../lib/storage/types';
import { ModuleCard } from './ModuleCard';
import { MilestoneTimeline } from './MilestoneTimeline';

export function ExecutionMapPage() {
  const { currentProject } = useProject();
  const [modules, setModules] = useState<Module[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'structure' | 'timeline'>('structure');

  useEffect(() => {
    if (currentProject) {
      loadData();
    }
  }, [currentProject]);

  const loadData = async () => {
    if (!currentProject) return;
    setLoading(true);
    const storage = getStorageClient();
    
    const [modulesRes, pagesRes, milestonesRes, itemsRes] = await Promise.all([
      storage.getModules(currentProject.id),
      storage.getPages(currentProject.id),
      storage.getMilestones(currentProject.id),
      storage.getItems(currentProject.id)
    ]);

    setModules(modulesRes.data || []);
    setPages(pagesRes.data || []);
    setMilestones(milestonesRes.data || []);
    setItems(itemsRes.data || []);
    
    // Seed initial data if empty (Mock Phase)
    if (modulesRes.data?.length === 0) {
      await seedInitialData(currentProject.id);
    }
    
    setLoading(false);
  };

  const seedInitialData = async (projectId: string) => {
    const storage = getStorageClient();
    
    // Create Milestones
    const m1 = await storage.createMilestone({
      project_id: projectId,
      name: 'Wave 1: 基礎架構與登入',
      start_date: '2025-12-01',
      end_date: '2025-12-15',
      color: 'rgba(1, 77, 146, 1)'
    });
    
    const m2 = await storage.createMilestone({
      project_id: projectId,
      name: 'Wave 2: 核心功能與儀表板',
      start_date: '2025-12-16',
      end_date: '2025-12-31',
      color: 'rgba(5, 123, 183, 1)'
    });

    // Create Modules
    const mod1 = await storage.createModule({
      project_id: projectId,
      name: '會員系統',
      description: '處理註冊、登入、權限管理',
      status: 'active'
    });

    const mod2 = await storage.createModule({
      project_id: projectId,
      name: '執行地圖',
      description: '模組與頁面執行視覺化',
      status: 'active'
    });

    // Create Pages
    if (mod1.data) {
      await storage.createPage({
        module_id: mod1.data.id,
        project_id: projectId,
        name: '登入頁面',
        status: 'done',
        path: '/login'
      });
      await storage.createPage({
        module_id: mod1.data.id,
        project_id: projectId,
        name: '個人設定',
        status: 'developing',
        path: '/settings'
      });
    }

    if (mod2.data) {
      await storage.createPage({
        module_id: mod2.data.id,
        project_id: projectId,
        name: '專案工作主頁',
        status: 'designing',
        path: '/execution'
      });
    }

    // Reload
    loadData();
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">載入中...</div>;
  }

  const completedPages = pages.filter(p => p.status === 'done').length;
  const progress = pages.length > 0 ? Math.round((completedPages / pages.length) * 100) : 0;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-6 border-b border-border bg-white sticky top-0 z-10">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Map className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="m-0">專案工作</h2>
              <p className="m-0 text-muted-foreground">視覺化專案功能架構與時程進度</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex border border-border rounded-lg overflow-hidden">
              <button 
                onClick={() => setViewMode('structure')}
                className={`px-4 py-2 text-sm transition-colors ${viewMode === 'structure' ? 'bg-primary text-white' : 'bg-white text-foreground hover:bg-muted'}`}
              >
                結構視圖
              </button>
              <button 
                onClick={() => setViewMode('timeline')}
                className={`px-4 py-2 text-sm transition-colors ${viewMode === 'timeline' ? 'bg-primary text-white' : 'bg-white text-foreground hover:bg-muted'}`}
              >
                時間軸
              </button>
            </div>
            <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" />
              新增模組
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-border bg-muted/30">
            <p className="text-sm text-muted-foreground mb-1">總模組數</p>
            <h2 className="text-2xl font-bold">{modules.length}</h2>
          </div>
          <div className="p-4 rounded-xl border border-border bg-muted/30">
            <p className="text-sm text-muted-foreground mb-1">總頁面數</p>
            <h2 className="text-2xl font-bold">{pages.length}</h2>
          </div>
          <div className="p-4 rounded-xl border border-border bg-muted/30">
            <p className="text-sm text-muted-foreground mb-1">當前進度</p>
            <div className="flex items-end gap-2">
              <h2 className="text-2xl font-bold">{progress}%</h2>
              <label className="text-sm text-muted-foreground pb-1">({completedPages}/{pages.length})</label>
            </div>
            <div className="w-full bg-border h-1.5 rounded-full mt-2">
              <div className="bg-primary h-full rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
          <div className="p-4 rounded-xl border border-border bg-muted/30">
            <p className="text-sm text-muted-foreground mb-1">待處理風險</p>
            <div className="flex items-center gap-2 text-destructive font-bold">
              <AlertCircle className="w-5 h-5" />
              <h2 className="text-destructive font-bold">{items.filter(i => i.status === 'blocked').length}</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {viewMode === 'structure' ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {modules.map(module => (
              <ModuleCard 
                key={module.id} 
                module={module} 
                pages={pages.filter(p => p.module_id === module.id)}
                items={items}
              />
            ))}
          </div>
        ) : (
          <MilestoneTimeline 
            milestones={milestones}
            modules={modules}
            pages={pages}
          />
        )}
      </div>
    </div>
  );
}