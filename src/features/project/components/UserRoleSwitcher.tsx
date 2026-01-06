import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Shield, Users, Palette, Code, UserCircle, LogOut, CheckCircle, RefreshCw } from 'lucide-react';
import { DevUserSwitcher, setTestUser } from '@/lib/permissions/devTools';
import { getCurrentUser } from '@/lib/permissions/statusPermissions';
import type { CurrentUser } from '@/lib/permissions/statusPermissions';
import { toast } from 'sonner';
import { useProject } from '@/features/project/hooks/useProject';
import { getStorageClient } from '@/lib/storage';
import { Member } from '@/lib/storage/types';

interface RoleOption {
  role: 'admin' | 'pm' | 'engineer' | 'designer' | 'client';
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const roleOptions: RoleOption[] = [
  {
    role: 'admin',
    label: '系統管理員',
    icon: <Shield className="h-4 w-4" />,
    color: 'bg-red-500',
    description: '完整系統權限，可管理所有專案與設定',
  },
  {
    role: 'pm',
    label: '專案經理',
    icon: <Users className="h-4 w-4" />,
    color: 'bg-blue-500',
    description: '可管理專案、指派任務、查看所有資料',
  },
  {
    role: 'engineer',
    label: '工程師',
    icon: <Code className="h-4 w-4" />,
    color: 'bg-green-500',
    description: '可執行任務、更新進度、參與協作',
  },
  {
    role: 'designer',
    label: '設計師',
    icon: <Palette className="h-4 w-4" />,
    color: 'bg-purple-500',
    description: '可處理設計任務、提供設計決策',
  },
  {
    role: 'client',
    label: '客戶',
    icon: <UserCircle className="h-4 w-4" />,
    color: 'bg-amber-500',
    description: '可查看專案進度、提出需求與回饋',
  },
];

export function UserRoleSwitcher() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [switching, setSwitching] = useState(false);
  const { project } = useProject();
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // 載入當前用戶與專案成員
  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (project) {
      loadMembers();
    }
  }, [project]);

  const loadCurrentUser = () => {
    const user = getCurrentUser();
    setCurrentUser(user);
  };

  const loadMembers = async () => {
    if (!project) return;
    setLoadingMembers(true);
    try {
      const storage = getStorageClient();
      const { data, error } = await storage.getMembers(project.id);
      if (data) setMembers(data);
    } catch {
      // console.error('Failed to load members');
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleRoleSwitch = (role: RoleOption['role']) => {
    setSwitching(true);
    try {
      console.log(`🔄 開始切換身分: ${currentUser?.role} → ${role}`);

      switch (role) {
        case 'admin':
          DevUserSwitcher.setAdmin();
          break;
        case 'pm':
          DevUserSwitcher.setPM();
          break;
        case 'engineer':
          DevUserSwitcher.setEngineer();
          break;
        case 'designer':
          DevUserSwitcher.setDesigner();
          break;
        case 'client':
          DevUserSwitcher.setClient();
          break;
      }

      reloadAndNotify(role);
    } catch (error) {
      console.error('切換身分錯誤:', error);
      toast.error('切換身分失敗');
      setSwitching(false);
    }
  };

  const handleMemberSwitch = (member: Member) => {
    setSwitching(true);
    try {
      // 使用 setTestUser 模擬該成員登入
      setTestUser(member.role, { name: member.name, email: member.email });
      reloadAndNotify(member.role);
    } catch (error) {
      console.error('切換成員錯誤:', error);
      toast.error('切換成員失敗');
      setSwitching(false);
    }
  };

  const reloadAndNotify = (role: string) => {
    console.log('✅ 身分已切換，準備重整...');
    setTimeout(() => {
      loadCurrentUser();
      const label = roleOptions.find(r => r.role === role)?.label || role;
      toast.success(`✅ 已切換身分為：${label}`);
      window.location.reload();
    }, 300);
  };

  const handleLogout = () => {
    DevUserSwitcher.logout();
    setCurrentUser(null);
    toast.success('🚪 已登出');
  };

  const getRoleOption = (role: string) => {
    return roleOptions.find(r => r.role === role);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'pm': return 'bg-purple-100 text-purple-700';
      case 'admin': return 'bg-red-100 text-red-700';
      case 'client': return 'bg-blue-100 text-blue-700';
      case 'designer': return 'bg-pink-100 text-pink-700';
      case 'engineer': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-transparent">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-purple-600" />
            <h3 className="text-purple-700">身分切換</h3>
          </div>
          {currentUser && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              登出
            </Button>
          )}
        </div>
        <p className="text-muted-foreground mt-1">
          <label>開發模式：快速切換不同角色以測試權限</label>
        </p>

        {/* Debug: 顯示當前 localStorage 狀態 */}
        <div className="mt-2 text-xs text-gray-500">
          <label>
            當前 role: <code className="text-purple-600">{currentUser?.role || '無'}</code>
          </label>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 當前用戶資訊 */}
        {currentUser ? (
          <div className="p-4 rounded-[var(--radius)] bg-gradient-to-br from-purple-100 to-blue-50 border border-purple-200">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-[var(--radius)] ${getRoleOption(currentUser.role)?.color || 'bg-gray-500'} text-white`}>
                {getRoleOption(currentUser.role)?.icon || <User className="h-4 w-4" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{currentUser.name}</span>
                  <Badge variant="outline" className="bg-white">
                    {getRoleOption(currentUser.role)?.label || currentUser.role}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {currentUser.email}
                </p>
              </div>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-[var(--radius)] bg-amber-50 border border-amber-200 text-center">
            <p className="text-muted-foreground">
              <label>目前沒有登入用戶，請選擇一個角色</label>
            </p>
          </div>
        )}

        {/* 快速角色選項 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            快速切換（預設帳號）
          </label>
          <div className="grid grid-cols-1 gap-2">
            {roleOptions.map((option) => {
              const isActive = currentUser?.role === option.role && currentUser?.email?.startsWith('test-');
              const isDisabled = switching || isActive;

              return (
                <button
                  key={option.role}
                  onClick={() => handleRoleSwitch(option.role)}
                  disabled={isDisabled}
                  className={`
                    p-3 rounded-[var(--radius)] border transition-all text-left
                    ${isActive
                      ? 'border-purple-300 bg-purple-50 cursor-default'
                      : 'border-border hover:border-purple-300 hover:bg-purple-50/50 cursor-pointer'
                    }
                    ${switching ? 'opacity-50 cursor-not-allowed' : ''}
                    ${isDisabled ? 'opacity-60' : ''}
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-[var(--radius)] ${option.color} text-white mt-0.5`}>
                      {option.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{option.label}</span>
                        {isActive && (
                          <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
                            目前角色
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {option.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 專案成員列表 */}
        {project && (
          <div className="space-y-2 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-muted-foreground">
                切換為專案成員 ({members.length})
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadMembers}
                disabled={loadingMembers}
                className="h-6 w-6 p-0"
              >
                <RefreshCw className={`h-3 w-3 ${loadingMembers ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {members.length > 0 ? (
              <div className="grid grid-cols-1 gap-2">
                {members.map((member) => {
                  const isActive = currentUser?.email === member.email;

                  return (
                    <button
                      key={member.id}
                      onClick={() => handleMemberSwitch(member)}
                      disabled={switching || isActive}
                      className={`
                        flex items-center gap-3 p-3 rounded-[var(--radius)] border transition-all text-left
                        ${isActive
                          ? 'border-blue-300 bg-blue-50/50 cursor-default'
                          : 'border-border hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer'
                        }
                      `}
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{member.name}</span>
                          <Badge variant="secondary" className={`text-xs px-1.5 py-0 ${getRoleBadgeColor(member.role)}`}>
                            {member.role}
                          </Badge>
                          {isActive && (
                            <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                              目前
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.email}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-muted-foreground bg-muted/30 rounded-[var(--radius)]">
                尚無專案成員
              </div>
            )}
          </div>
        )}

        {/* 提示訊息 */}
        <div className="pt-3 border-t border-border space-y-2">
          <p className="text-xs text-muted-foreground">
            <label>
              💡 <strong>提示</strong>：這是開發工具，用於測試不同角色的權限。生產環境將使用真實的認證系統。
            </label>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}