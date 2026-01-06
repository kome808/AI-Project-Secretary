import React, { useState, useEffect } from 'react';
import { Project, Member } from '../../../lib/storage/types';
import { getStorageClient } from '../../../lib/storage';
import {
  Info,
  Users,
  Bell,
  Upload,
  Save,
  RefreshCw,
  AlertTriangle,
  Plus,
  Trash2
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';

interface ProjectSettingsProps {
  project: Project | null;
  currentUser: Member | null;
}

interface MemberInvite {
  email: string;
  name: string;
  role: 'client' | 'pm' | 'designer' | 'engineer' | 'other';
}

export function ProjectSettings({ project, currentUser }: ProjectSettingsProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Project info
  const [projectName, setProjectName] = useState('');
  const [projectCode, setProjectCode] = useState('');

  // Reminder rules
  const [morningBriefEnabled, setMorningBriefEnabled] = useState(true);
  const [briefFrequency, setBriefFrequency] = useState<'daily' | 'weekdays'>('weekdays');
  const [briefChannel, setBriefChannel] = useState<'email' | 'line' | 'slack'>('email');

  // Member invite
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<MemberInvite['role']>('engineer');
  const [inviting, setInviting] = useState(false);

  // Alert Dialog State
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (project) {
      setProjectName(project.name);
      setProjectCode(project.meta?.code || '');
      loadMembers();
    }
  }, [project]);

  const loadMembers = async () => {
    if (!project) return;

    setLoading(true);
    try {
      const storage = getStorageClient();
      const { data, error } = await storage.getMembers(project.id);

      if (error) throw error;
      if (data) setMembers(data);
    } catch (error) {
      console.error('Failed to load members:', error);
      toast.error('載入成員失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBasicInfo = async () => {
    if (!project) return;

    setSaving(true);
    try {
      const storage = getStorageClient();
      const { error } = await storage.updateProject(project.id, {
        name: projectName,
        meta: {
          ...project.meta,
          code: projectCode
        }
      });

      if (error) throw error;
      toast.success('✓ 專案資訊已更新');
    } catch (error) {
      console.error('Failed to save project info:', error);
      toast.error('更新失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleInviteMember = async () => {
    if (!project || !inviteEmail.trim() || !inviteName.trim()) return;

    // Check if email already exists
    if (members.some(m => m.email === inviteEmail.trim())) {
      toast.error('此 Email 已加入專案');
      return;
    }

    setInviting(true);
    try {
      const storage = getStorageClient();
      const { error } = await storage.addMember({
        project_id: project.id,
        email: inviteEmail.trim(),
        name: inviteName.trim(),
        role: inviteRole,
        status: 'active'
      });

      if (error) throw error;

      toast.success(`✓ 已邀請 ${inviteName}`);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('engineer');
      loadMembers();
    } catch (error) {
      console.error('Failed to invite member:', error);
      toast.error('邀請失敗');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (e: React.MouseEvent, memberId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setMemberToDelete(memberId);
  };

  const confirmDeleteMember = async () => {
    if (!project || !memberToDelete) return;

    try {
      const storage = getStorageClient();
      const { error } = await storage.deleteMember(memberToDelete);

      if (error) throw error;

      toast.success('✓ 成員已移除');
      loadMembers();
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast.error('移除失敗');
    } finally {
      setMemberToDelete(null);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'pm': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'admin': return 'bg-red-50 text-red-700 border-red-200';
      case 'client': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'designer': return 'bg-pink-50 text-pink-700 border-pink-200';
      case 'engineer': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'pm': return 'PM';
      case 'admin': return '管理員';
      case 'client': return '客戶';
      case 'designer': return '設計師';
      case 'engineer': return '工程師';
      default: return '其他';
    }
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-3">
          <AlertTriangle className="h-16 w-16 mx-auto text-muted-foreground opacity-30" />
          <div>
            <p className="text-muted-foreground">
              <label>請先選擇專案</label>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            <h3>專案基本資訊</h3>
          </div>
          <p className="text-muted-foreground mt-1">
            <label>專案名稱與識別碼</label>
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="project-name">專案名稱</Label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="輸入專案名稱"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-code">專案代號（選填）</Label>
              <Input
                id="project-code"
                value={projectCode}
                onChange={(e) => setProjectCode(e.target.value)}
                placeholder="例如：PRJ-2024-001"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <Button onClick={handleSaveBasicInfo} disabled={saving || !projectName.trim()}>
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  <label>儲存中...</label>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  <label>儲存</label>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Member Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h3>成員管理</h3>
          </div>
          <p className="text-muted-foreground mt-1">
            <label>邀請團隊成員加入專案</label>
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invite Form */}
          <div className="p-4 rounded-[var(--radius-lg)] bg-muted/30 border border-border space-y-4">
            <h4>
              <label>邀請新成員</label>
            </h4>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="member@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-name">姓名</Label>
                <Input
                  id="invite-name"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="王小明"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">角色</Label>
                <Select value={inviteRole} onValueChange={(v: any) => setInviteRole(v)}>
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">客戶</SelectItem>
                    <SelectItem value="pm">PM</SelectItem>
                    <SelectItem value="designer">設計師</SelectItem>
                    <SelectItem value="engineer">工程師</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={handleInviteMember}
              disabled={inviting || !inviteEmail.trim() || !inviteName.trim()}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              <label>邀請加入</label>
            </Button>
          </div>

          {/* Members List */}
          <div className="space-y-3">
            <h4>
              <label>目前成員 ({members.length})</label>
            </h4>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <label>尚無成員</label>
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-[var(--radius)] bg-card border border-border"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-medium">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{member.name}</p>
                        <p className="text-muted-foreground">{member.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getRoleBadgeColor(member.role)}>
                          {getRoleLabel(member.role)}
                        </Badge>
                        {currentUser?.id !== member.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleRemoveMember(e, member.id)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reminder Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h3>提醒規則</h3>
          </div>
          <p className="text-muted-foreground mt-1">
            <label>設定晨間簡報與通知偏好</label>
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Morning Brief Toggle */}
          <div className="flex items-center justify-between p-4 rounded-[var(--radius-lg)] border border-border">
            <div className="flex-1">
              <h4>
                <label>晨間簡報</label>
              </h4>
              <p className="text-muted-foreground mt-1">
                <label>每日自動產生專案風險與進度摘要</label>
              </p>
            </div>
            <input
              type="checkbox"
              checked={morningBriefEnabled}
              onChange={(e) => setMorningBriefEnabled(e.target.checked)}
              className="w-5 h-5 accent-primary cursor-pointer"
            />
          </div>

          {/* Frequency & Channel */}
          {morningBriefEnabled && (
            <div className="grid gap-4 md:grid-cols-2 pl-4 border-l-2 border-primary/30">
              <div className="space-y-2">
                <Label htmlFor="brief-frequency">發送頻率</Label>
                <Select value={briefFrequency} onValueChange={(v: any) => setBriefFrequency(v)}>
                  <SelectTrigger id="brief-frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">每天</SelectItem>
                    <SelectItem value="weekdays">僅工作日</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="brief-channel">發送通路</Label>
                <Select value={briefChannel} onValueChange={(v: any) => setBriefChannel(v)}>
                  <SelectTrigger id="brief-channel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="line">LINE</SelectItem>
                    <SelectItem value="slack">Slack</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* WBS Import */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            <h3>WBS 匯入</h3>
          </div>
          <p className="text-muted-foreground mt-1">
            <label>上傳專案工作骨架，AI 會產生建議卡</label>
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-6 rounded-[var(--radius-lg)] border-2 border-dashed border-border bg-muted/20 text-center space-y-3">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <div>
              <p className="text-muted-foreground">
                <label>功能開發中</label>
              </p>
              <label className="text-muted-foreground opacity-70">
                上傳 WBS 檔案後，AI 會自動提取專案工作並產生建議卡到收件匣
              </label>
            </div>
            <Button disabled>
              <Upload className="h-4 w-4 mr-2" />
              <label>選擇檔案</label>
            </Button>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-[var(--radius-lg)] bg-blue-50 border border-blue-200">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium text-blue-700">
                <label>支援格式</label>
              </p>
              <p className="text-muted-foreground">
                <label>
                  Excel (.xlsx)、CSV、或純文字格式。AI 會自動辨識工作名稱、負責人、期限等欄位。
                </label>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!memberToDelete} onOpenChange={(open) => !open && setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要移除此成員？</AlertDialogTitle>
            <AlertDialogDescription>
              此動作無法復原。該成員將無法再存取此專案。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteMember} className="bg-red-600 hover:bg-red-700">
              移除成員
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}