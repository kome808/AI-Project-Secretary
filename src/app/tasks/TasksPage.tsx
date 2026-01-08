import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckSquare, Briefcase, Layers, ListChecks } from 'lucide-react';
import { ActionsView } from './views/ActionsView';
import { ProjectWorkView } from './views/ProjectWorkView';
import { FeaturesView } from './views/FeaturesView';
import { TodosView } from './views/TodosView';

// Hooks
import { useTasks, ViewType } from '@/features/tasks/hooks/useTasks';
import { useProject } from '@/features/project/hooks/useProject';

interface TabConfig {
  id: ViewType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabConfig[] = [
  { id: 'actions', label: '我的任務', icon: CheckSquare },
  { id: 'work', label: '專案工作', icon: Briefcase },
  { id: 'features', label: '功能模組', icon: Layers },
  { id: 'todos', label: '待辦事項', icon: ListChecks },
];

export function TasksPage() {
  const { project: currentProject } = useProject();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightedItemId = searchParams.get('highlight');

  const {
    items,
    members,
    currentUser,
    isLoading,
    currentView,
    setCurrentView,
    updateItem,
    refresh
  } = useTasks();

  // Scroll to highlighted item when data is loaded
  useEffect(() => {
    if (highlightedItemId && !isLoading && items.length > 0) {
      // First, check if the item exists in items array
      const targetItem = items.find(i => i.id === highlightedItemId);

      if (targetItem) {
        // Determine which view the item should be in
        let targetView: ViewType = 'work';

        if (targetItem.type === 'todo') {
          targetView = 'todos';
        } else if (targetItem.meta?.isFeatureModule) {
          targetView = 'features';
        } else if (targetItem.type === 'general' &&
          targetItem.assignee_id === currentUser?.id &&
          targetItem.status !== 'completed') {
          targetView = 'actions';
        }

        // Switch to the correct view if needed
        if (currentView !== targetView) {
          setCurrentView(targetView);
        }
      }

      // Small delay to allow DOM to render after potential view switch
      setTimeout(() => {
        const element = document.getElementById(`task-${highlightedItemId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
          // Remove highlight after a few seconds
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
            // Clear the URL parameter
            setSearchParams({});
          }, 3000);
        }
      }, 500);
    }
  }, [highlightedItemId, isLoading, items.length, currentView, currentUser, setCurrentView, setSearchParams, items]);

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <CheckSquare className="h-16 w-16 text-muted-foreground mx-auto opacity-30" />
          <p className="text-muted-foreground">
            <label>請先選擇專案</label>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="flex items-center gap-2">
          <CheckSquare className="h-6 w-6" />
          任務清單
        </h1>
        <p className="text-muted-foreground">
          <label>{currentProject.name} - 所有工作項目的統一入口</label>
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentView === tab.id;

            // Count items logic
            let count = 0;
            if (tab.id === 'actions') {
              count = items.filter(i =>
                i.type === 'general' &&
                i.assignee_id === currentUser?.id &&
                i.status !== 'completed'
              ).length;
            } else if (tab.id === 'todos') {
              count = items.filter(i => i.type === 'todo' && i.status !== 'completed').length;
            } else if (tab.id === 'work') {
              // Only count visible root items
              count = items.filter(i => i.meta?.isWorkPackage && !i.parent_id).length;
            } else if (tab.id === 'features') {
              count = items.filter(i => i.meta?.isFeatureModule === true && !i.parent_id).length;
            }

            return (
              <button
                key={tab.id}
                onClick={() => setCurrentView(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap
                  ${isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {count > 0 && (
                  <span className={`
                    px-2 py-0.5 rounded-full text-xs
                    ${isActive
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                    }
                  `}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* View Content */}
      <div className="pb-8">
        {currentView === 'actions' && (
          <ActionsView
            items={items}
            members={members}
            currentUser={currentUser}
            loading={isLoading}
            onItemUpdate={updateItem}
            onRefresh={refresh}
          />
        )}
        {currentView === 'todos' && (
          <TodosView
            items={items}
            members={members}
            loading={isLoading}
            onItemUpdate={updateItem}
            onRefresh={refresh}
          />
        )}
        {currentView === 'work' && (
          <ProjectWorkView
            items={items}
            members={members}
            loading={isLoading}
            onItemUpdate={updateItem}
            onRefresh={refresh}
          />
        )}
        {currentView === 'features' && (
          <FeaturesView
            items={items}
            members={members}
            loading={isLoading}
            onItemUpdate={updateItem}
            onRefresh={refresh}
          />
        )}
      </div>
    </div>
  );
}