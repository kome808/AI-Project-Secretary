import React, { useState } from 'react';
import { Settings, Briefcase, Shield } from 'lucide-react';
import { ProjectSettings } from './views/ProjectSettings';
import { SystemSettings } from './views/SystemSettings';
import { DiagnosticPanel } from '@/components/dev/DiagnosticPanel';
import { UserRoleSwitcher } from '@/features/project/components/UserRoleSwitcher';
import { useProjectStore } from '@/stores/useProjectStore';
import { useProject } from '@/features/project/hooks/useProject';

export default function SettingsPage() {
  const { currentUser } = useProjectStore();
  const { project: currentProject } = useProject();
  const [activeTab, setActiveTab] = useState<'project' | 'system'>('project');

  const isAdmin = currentUser?.role === 'admin';
  const isPM = currentUser?.role === 'pm' || currentUser?.role === 'admin';

  // If not PM or Admin, show access denied
  if (!isPM && !isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <Shield className="h-16 w-16 text-muted-foreground mx-auto opacity-30" />
          <div>
            <h2>存取權限受限</h2>
            <p className="text-muted-foreground mt-2">
              <label>您沒有權限存取設定頁面</label>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="flex items-center gap-2">
          <Settings className="h-6 w-6" />
          設定
        </h1>
        <p className="text-muted-foreground">
          <label>管理專案配置與系統參數</label>
        </p>
      </div>

      {/* Dev Tools - Role Switcher */}
      <UserRoleSwitcher />

      {/* Diagnostic Panel */}
      <DiagnosticPanel />

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('project')}
            className={`
              flex items-center gap-2 px-4 py-3 border-b-2 transition-colors
              ${activeTab === 'project'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }
            `}
          >
            <Briefcase className="h-4 w-4" />
            <span>專案設定</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('system')}
              className={`
                flex items-center gap-2 px-4 py-3 border-b-2 transition-colors
                ${activeTab === 'system'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }
              `}
            >
              <Shield className="h-4 w-4" />
              <span>系統設定</span>
              <span className="px-2 py-0.5 rounded-[var(--radius)] bg-primary/10 text-primary text-xs">
                Admin
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="pb-8">
        {activeTab === 'project' && (
          <ProjectSettings project={currentProject} currentUser={currentUser} />
        )}
        {activeTab === 'system' && isAdmin && (
          <SystemSettings currentProject={currentProject} />
        )}
      </div>
    </div>
  );
}