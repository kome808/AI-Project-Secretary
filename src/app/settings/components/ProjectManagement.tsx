import React, { useState, useEffect } from 'react';
import {
  FolderKanban,
  Plus,
  Edit,
  Archive,
  RotateCcw,
  Trash2,
  RefreshCw,
  Clock,
  User
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
import { useProject } from '@/app/context/ProjectContext';
import { Project, ProjectStatus, Member } from '../../../lib/storage/types';

export function ProjectManagement() {
  const { adapter, refreshProjects } = useProject();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Record<string, Member[]>>({});
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all');

  // Create/Edit Dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPmId, setFormPmId] = useState('');

  // Delete Confirm Dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await adapter.getProjects();
      if (error) {
        // 如果是表不存在的錯誤，顯示友善訊息
        if (error.message && error.message.includes('Could not find the table')) {
          console.warn('⚠️ Projects 表尚未建立');
          toast.info('專案管理功能尚未設定，請先建立資料表');
          setProjects([]);
        } else {
          toast.error('載入專案列表失敗');
          console.error(error);
        }
      } else if (data) {
        setProjects(data);
        
        // Load members for each project
        const membersData: Record<string, Member[]> = {};
        for (const project of data) {
          const { data: projectMembers } = await adapter.getMembers(project.id);
          if (projectMembers) {
            membersData[project.id] = projectMembers;
          }
        }
        setMembers(membersData);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
      // 不顯示錯誤 toast，避免在首次載入時打擾使用者
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInitMockData = async () => {
    if (!confirm('確定要重新載入模擬資料？這將會清除目前所有專案資料並載入預設的 5 個模擬專案（包含國美館專案。')) {
      return;
    }

    setLoading(true);
    try {
      // Force initialize mock data
      if (adapter.initializeMockData) {
        await adapter.initializeMockData(true);
        toast.success('✓ 模擬資料已重新載入');
        await loadProjects();
        await refreshProjects();
      } else {
        toast.error('此 Adapter 不支援模擬資料初始化');
      }
    } catch (error) {
      console.error('Failed to initialize mock data:', error);
      toast.error('模擬資料載入失敗');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingProject(null);
    setFormName('');
    setFormDescription('');
    setFormPmId('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (project: Project) => {
    setEditingProject(project);
    setFormName(project.name);
    setFormDescription(project.description || '');
    setFormPmId(project.pm_id || '');
    setIsDialogOpen(true);
  };

  const handleSaveProject = async () => {
    if (!formName.trim()) {
      toast.error('請輸入專案名稱');
      return;
    }

    setLoading(true);
    try {
      if (editingProject) {
        // Update existing project
        const { error } = await adapter.updateProject(editingProject.id, {
          name: formName,
          description: formDescription || undefined,
          pm_id: formPmId || undefined
        });
        
        if (error) {
          toast.error('更新專案失敗');
          console.error(error);
        } else {
          toast.success('✓ 專案已更新');
          setIsDialogOpen(false);
          await loadProjects();
          await refreshProjects();
        }
      } else {
        // Create new project
        const { data, error } = await adapter.createProject({
          name: formName,
          description: formDescription || undefined,
          status: 'active',
          pm_id: formPmId || undefined
        });
        
        if (error) {
          toast.error('建立專案失敗');
          console.error(error);
        } else {
          toast.success('✓ 專案已建立');
          setIsDialogOpen(false);
          await loadProjects();
          await refreshProjects();
        }
      }
    } catch (error) {
      console.error('Failed to save project:', error);
      toast.error('儲存失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleArchive = async (project: Project) => {
    const newStatus: ProjectStatus = project.status === 'archived' ? 'active' : 'archived';
    const action = newStatus === 'archived' ? '封存' : '啟用';
    
    setLoading(true);
    try {
      const { error } = await adapter.updateProjectStatus(project.id, newStatus);
      if (error) {
        toast.error(`${action}專案失敗`);
        console.error(error);
      } else {
        toast.success(`✓ 專案已${action}`);
        await loadProjects();
        await refreshProjects();
      }
    } catch (error) {
      console.error(`Failed to ${action} project:`, error);
      toast.error(`${action}失敗`);
    } finally {
      setLoading(false);
    }
  };

  const openDeleteConfirm = (project: Project) => {
    setProjectToDelete(project);
    setDeleteConfirmText('');
    setDeleteConfirmOpen(true);
  };

  const handleSoftDelete = async () => {
    if (!projectToDelete) return;
    if (deleteConfirmText !== projectToDelete.name) {
      toast.error('請正確輸入專案名稱以確認刪除');
      return;
    }

    setLoading(true);
    try {
      const { error } = await adapter.softDeleteProject(projectToDelete.id);
      if (error) {
        toast.error('刪除專案失敗');
        console.error(error);
      } else {
        toast.success('✓ 專案已標記刪除（30天後永久刪除）');
        setDeleteConfirmOpen(false);
        
        // If deleting current project, clear the selection
        const currentProjectId = localStorage.getItem('current_project_id');
        if (currentProjectId === projectToDelete.id) {
          localStorage.removeItem('current_project_id');
        }
        
        setProjectToDelete(null);
        await loadProjects();
        await refreshProjects();
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast.error('刪除失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (project: Project) => {
    setLoading(true);
    try {
      const { error } = await adapter.restoreProject(project.id);
      if (error) {
        toast.error('恢復專案失敗');
        console.error(error);
      } else {
        toast.success('✓ 專案已恢復');
        await loadProjects();
        await refreshProjects();
      }
    } catch (error) {
      console.error('Failed to restore project:', error);
      toast.error('恢復失敗');
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntilPurge = (purgeAt?: string): number => {
    if (!purgeAt) return 0;
    const now = new Date();
    const purgeDate = new Date(purgeAt);
    const diff = purgeDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getStatusBadge = (status: ProjectStatus, purgeAt?: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">啟用</Badge>;
      case 'archived':
        return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">封存</Badge>;
      case 'pending_deletion':
        const days = getDaysUntilPurge(purgeAt);
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            待刪除 ({days} 天)
          </Badge>
        );
      case 'deleted':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">已刪除</Badge>;
      default:
        return null;
    }
  };

  const filteredProjects = projects.filter(p => {
    if (statusFilter === 'all') return true;
    return p.status === statusFilter;
  });

  // Group projects by status for display
  const activeProjects = filteredProjects.filter(p => p.status === 'active');
  const archivedProjects = filteredProjects.filter(p => p.status === 'archived');
  const deletedProjects = filteredProjects.filter(p => p.status === 'pending_deletion');

  const getPMName = (projectId: string, pmId?: string): string => {
    if (!pmId) return '-';
    const projectMembers = members[projectId] || [];
    const pm = projectMembers.find(m => m.id === pmId);
    return pm?.name || pmId;
  };

  // Helper function to render project rows
  const renderProjectRow = (project: Project) => (
    <tr key={project.id} className="border-t border-border hover:bg-muted/20">
      <td className="p-3">
        <div>
          <div className="font-medium">{project.name}</div>
          {project.description && (
            <div className="text-muted-foreground">{project.description}</div>
          )}
        </div>
      </td>
      <td className="p-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <User className="h-4 w-4" />
          <label>{getPMName(project.id, project.pm_id)}</label>
        </div>
      </td>
      <td className="p-3">
        {getStatusBadge(project.status, project.purge_at)}
      </td>
      <td className="p-3 text-muted-foreground">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {project.updated_at
            ? new Date(project.updated_at).toLocaleDateString('zh-TW')
            : new Date(project.created_at).toLocaleDateString('zh-TW')}
        </div>
      </td>
      <td className="p-3">
        <div className="flex items-center justify-end gap-2">
          {project.status === 'pending_deletion' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRestore(project)}
              disabled={loading}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              <label>恢復</label>
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openEditDialog(project)}
                disabled={loading}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleArchive(project)}
                disabled={loading}
              >
                {project.status === 'archived' ? (
                  <RotateCcw className="h-4 w-4" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openDeleteConfirm(project)}
                disabled={loading}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-primary" />
              <h3>專案管理</h3>
            </div>
            <p className="text-muted-foreground mt-1">
              <label>建立、編輯、封存與刪除專案</label>
            </p>
          </div>
          <Button onClick={openCreateDialog} disabled={loading}>
            <Plus className="h-4 w-4 mr-2" />
            <label>建立專案</label>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Development Helper */}
        {adapter.initializeMockData && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-[var(--radius)] flex items-start justify-between gap-4">
            <div className="flex-1">
              <h4 className="font-medium text-blue-900 mb-1">開發工具：模擬資料</h4>
              <p className="text-blue-700">
                載入預設的 5 個模擬專案（包含國美館專案及相關的成員、文件、任務等資料）
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleInitMockData}
              disabled={loading}
              className="whitespace-nowrap"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  <label>載入中...</label>
                </>
              ) : (
                <label>載入模擬資料</label>
              )}
            </Button>
          </div>
        )}

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Label>狀態篩選：</Label>
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="active">啟用</SelectItem>
              <SelectItem value="archived">封存</SelectItem>
              <SelectItem value="pending_deletion">待刪除</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={loadProjects} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Projects Table */}
        <div className="border border-border rounded-[var(--radius-lg)] overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left p-3">專案名稱</th>
                <th className="text-left p-3">專案經理</th>
                <th className="text-left p-3">狀態</th>
                <th className="text-left p-3">更新時間</th>
                <th className="text-right p-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading && filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <label>載入中...</label>
                  </td>
                </tr>
              ) : filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    <label>無專案資料</label>
                  </td>
                </tr>
              ) : statusFilter === 'all' ? (
                <>
                  {/* Active Projects Section */}
                  {activeProjects.length > 0 && (
                    <>
                      {activeProjects.map(renderProjectRow)}
                    </>
                  )}
                  
                  {/* Divider between Active and Archived */}
                  {activeProjects.length > 0 && archivedProjects.length > 0 && (
                    <tr>
                      <td colSpan={5} className="p-0">
                        <div className="border-t-4 border-muted"></div>
                      </td>
                    </tr>
                  )}
                  
                  {/* Archived Projects Section */}
                  {archivedProjects.length > 0 && (
                    <>
                      {archivedProjects.map(renderProjectRow)}
                    </>
                  )}
                  
                  {/* Deleted Projects (hidden in 'all' view by design) */}
                  {/* Deleted projects are not shown when filter is 'all' */}
                </>
              ) : (
                /* When specific status filter is selected, show all matching projects */
                filteredProjects.map(renderProjectRow)
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      {/* Create/Edit Dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setIsDialogOpen(false)}>
          <div className="bg-background border border-border rounded-[var(--radius-lg)] p-6 max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4">
              <label>{editingProject ? '編輯專案' : '建立專案'}</label>
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">專案名稱 *</Label>
                <Input
                  id="project-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="輸入專案名稱"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-description">專案描述</Label>
                <Input
                  id="project-description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="輸入專案描述（選填）"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-pm">專案經理 ID</Label>
                <Input
                  id="project-pm"
                  value={formPmId}
                  onChange={(e) => setFormPmId(e.target.value)}
                  placeholder="輸入專案經理 ID（選填）"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={loading}>
                <label>取消</label>
              </Button>
              <Button onClick={handleSaveProject} disabled={loading}>
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    <label>儲存中...</label>
                  </>
                ) : (
                  <label>{editingProject ? '更新' : '建立'}</label>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      {deleteConfirmOpen && projectToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDeleteConfirmOpen(false)}>
          <div className="bg-background border border-border rounded-[var(--radius-lg)] p-6 max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 text-destructive">
              <label>確認刪除專案</label>
            </h3>
            <p className="text-muted-foreground mb-4">
              <label>
                此操作將標記專案為「待刪除」，專案將在 <strong>30 天後永久刪除</strong>。
                在此期間，您仍可以恢復專案。
              </label>
            </p>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-[var(--radius)] mb-4">
              <p>
                <label>請輸入專案名稱 <strong>{projectToDelete.name}</strong> 以確認刪除：</label>
              </p>
            </div>
            <div className="space-y-2 mb-6">
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="輸入專案名稱"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} disabled={loading}>
                <label>取消</label>
              </Button>
              <Button
                variant="destructive"
                onClick={handleSoftDelete}
                disabled={loading || deleteConfirmText !== projectToDelete.name}
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    <label>刪除中...</label>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    <label>確認刪除</label>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}