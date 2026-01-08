import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/permissions/statusPermissions';
import type { CurrentUser } from '@/lib/permissions/statusPermissions';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Code, Palette, UserCircle, User, ChevronDown } from 'lucide-react';
import { DevUserSwitcher } from '@/lib/permissions/devTools';
import { toast } from 'sonner';
import { LogOut } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { clearCurrentUser } from '@/lib/permissions/statusPermissions';

export function CurrentUserBadge() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    // 初始載入
    loadUser();

    // 監聽用戶變更
    const handleUserChange = () => {
      loadUser();
    };

    window.addEventListener('userChanged', handleUserChange);

    // 點擊外部關閉選單
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.user-badge-menu')) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);

    return () => {
      window.removeEventListener('userChanged', handleUserChange);
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const loadUser = () => {
    const user = getCurrentUser();
    setCurrentUser(user);
  };

  const handleRoleSwitch = (role: 'admin' | 'pm' | 'engineer' | 'designer' | 'client', label: string) => {
    console.log(`🔄 從右上角切換角色至: ${role}`);

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

    setIsMenuOpen(false);
    toast.success(`✅ 已切換為：${label}`);

    // 延遲重新載入頁面
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleLogout = async () => {
    try {
      // 1. Clear Supabase Session
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();

      // 2. Clear Local Storage User
      clearCurrentUser();

      toast.success('已登出');
      setIsMenuOpen(false);

      // 3. Reload to force Auth Guard check
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('登出失敗');
    }
  };

  const roleConfig = {
    admin: {
      icon: Shield,
      label: '系統管理員',
      className: 'bg-red-50 text-red-700 border-red-300',
      role: 'admin' as const,
    },
    pm: {
      icon: Users,
      label: '專案經理',
      className: 'bg-blue-50 text-blue-700 border-blue-300',
      role: 'pm' as const,
    },
    engineer: {
      icon: Code,
      label: '工程師',
      className: 'bg-green-50 text-green-700 border-green-300',
      role: 'engineer' as const,
    },
    designer: {
      icon: Palette,
      label: '設計師',
      className: 'bg-purple-50 text-purple-700 border-purple-300',
      role: 'designer' as const,
    },
    client: {
      icon: UserCircle,
      label: '客戶',
      className: 'bg-amber-50 text-amber-700 border-amber-300',
      role: 'client' as const,
    },
  };

  if (!currentUser) {
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
        <User className="h-3 w-3 mr-1" />
        未登入
      </Badge>
    );
  }

  const config = roleConfig[currentUser.role as keyof typeof roleConfig] || {
    icon: User,
    label: currentUser.role,
    className: 'bg-gray-50 text-gray-700 border-gray-300',
    role: 'engineer' as const,
  };

  const Icon = config.icon;

  return (
    <div className="relative user-badge-menu">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsMenuOpen(!isMenuOpen);
          console.log('🖱️ 點擊右上角用戶徽章');
        }}
        className="flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius)] border transition-all hover:shadow-sm"
        style={{
          backgroundColor: config.className.includes('bg-red') ? 'rgb(254 242 242)' :
            config.className.includes('bg-blue') ? 'rgb(239 246 255)' :
              config.className.includes('bg-green') ? 'rgb(240 253 244)' :
                config.className.includes('bg-purple') ? 'rgb(250 245 255)' :
                  'rgb(255 251 235)',
          color: config.className.includes('text-red') ? 'rgb(185 28 28)' :
            config.className.includes('text-blue') ? 'rgb(29 78 216)' :
              config.className.includes('text-green') ? 'rgb(21 128 61)' :
                config.className.includes('text-purple') ? 'rgb(126 34 206)' :
                  'rgb(180 83 9)',
          borderColor: config.className.includes('border-red') ? 'rgb(252 165 165)' :
            config.className.includes('border-blue') ? 'rgb(147 197 253)' :
              config.className.includes('border-green') ? 'rgb(134 239 172)' :
                config.className.includes('border-purple') ? 'rgb(216 180 254)' :
                  'rgb(252 211 77)',
        }}
      >
        <Icon className="h-3 w-3" />
        <span className="text-sm font-medium">{currentUser.name}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* 下拉選單 */}
      {isMenuOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-[var(--radius)] shadow-lg border border-border z-50">
          <div className="p-2">
            <div className="text-xs text-muted-foreground px-2 py-1 mb-1">
              <label>切換身分（開發模式）</label>
            </div>
            {Object.entries(roleConfig).map(([key, roleInfo]) => {
              const RoleIcon = roleInfo.icon;
              const isActive = currentUser.role === roleInfo.role;

              return (
                <button
                  key={key}
                  onClick={() => handleRoleSwitch(roleInfo.role, roleInfo.label)}
                  disabled={isActive}
                  className={`
                    w-full flex items-center gap-2 px-2 py-2 rounded-[var(--radius)] text-left transition-colors
                    ${isActive
                      ? 'bg-purple-50 text-purple-700 cursor-default'
                      : 'hover:bg-gray-50 cursor-pointer'
                    }
                  `}
                >
                  <RoleIcon className="h-4 w-4" />
                  <span className="text-sm flex-1">{roleInfo.label}</span>
                  {isActive && (
                    <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">
                      目前
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-2 border-t border-border mt-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-[var(--radius)] text-left transition-colors hover:bg-red-50 text-red-600 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm">登出系統</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}