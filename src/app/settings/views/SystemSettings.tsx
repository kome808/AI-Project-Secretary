import React, { useState, useEffect } from 'react';
import {
  Brain,
  Database,
  Shield,
  Save,
  RefreshCw,
  AlertTriangle,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  FolderKanban,
  Plus,
  Edit,
  Archive,
  RotateCcw,
  Trash2,
  FileText,
  GitBranch
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Project, ProjectStatus } from '../../../lib/storage/types';
import { ProjectManagement } from '../components/ProjectManagement';
import { AISettingsPage } from '../AISettingsPage';
import { SupabaseConnectionPage } from '../SupabaseConnectionPage';
import { SystemPromptsEditor } from '@/features/settings/components/SystemPromptsEditor';
import { StatusMigrationPanel } from '../StatusMigrationPanel';
import { StorageFactory } from '../../../lib/storage/StorageFactory';
import { DataMaintenancePanel } from '../components/DataMaintenancePanel';

interface SystemSettingsProps {
  currentProject?: Project | null;
}

export function SystemSettings({ currentProject }: SystemSettingsProps) {
  const [activeView, setActiveView] = useState<'projects' | 'ai' | 'supabase' | 'prompts' | 'migration' | 'maintenance'>('projects');
  const storage = StorageFactory.getAdapter();

  return (
    <div className="space-y-[var(--spacing-6)]">
      {/* Tab Navigation */}
      <div className="flex gap-[var(--spacing-2)] border-b border-border pb-[var(--spacing-2)]">
        <Button
          variant={activeView === 'projects' ? 'default' : 'ghost'}
          onClick={() => setActiveView('projects')}
          className="flex items-center gap-[var(--spacing-2)]"
        >
          <FolderKanban className="w-4 h-4" />
          專案列表
        </Button>
        <Button
          variant={activeView === 'ai' ? 'default' : 'ghost'}
          onClick={() => setActiveView('ai')}
          className="flex items-center gap-[var(--spacing-2)]"
        >
          <Brain className="w-4 h-4" />
          AI 設定
        </Button>
        <Button
          variant={activeView === 'prompts' ? 'default' : 'ghost'}
          onClick={() => setActiveView('prompts')}
          className="flex items-center gap-[var(--spacing-2)]"
        >
          <FileText className="w-4 h-4" />
          提示詞管理
        </Button>
        <Button
          variant={activeView === 'supabase' ? 'default' : 'ghost'}
          onClick={() => setActiveView('supabase')}
          className="flex items-center gap-[var(--spacing-2)]"
        >
          <Database className="w-4 h-4" />
          Supabase 連線
        </Button>
        <Button
          variant={activeView === 'migration' ? 'default' : 'ghost'}
          onClick={() => setActiveView('migration')}
          className="flex items-center gap-[var(--spacing-2)]"
        >
          <RotateCcw className="w-4 h-4" />
          狀態遷移
        </Button>
        <Button
          variant={activeView === 'maintenance' ? 'default' : 'ghost'}
          onClick={() => setActiveView('maintenance')}
          className="flex items-center gap-[var(--spacing-2)]"
        >
          <Database className="w-4 h-4" />
          資料維護
        </Button>
      </div>

      {/* Content */}
      {activeView === 'projects' && <ProjectManagement />}
      {activeView === 'ai' && <AISettingsPage />}
      {activeView === 'prompts' && (
        <SystemPromptsEditor
          storage={storage}
        />
      )}
      {activeView === 'supabase' && <SupabaseConnectionPage />}
      {activeView === 'migration' && <StatusMigrationPanel />}
      {activeView === 'maintenance' && <DataMaintenancePanel />}
    </div>
  );
}