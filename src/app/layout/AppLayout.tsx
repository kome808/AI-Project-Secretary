import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { CurrentUserBadge } from '@/features/project/components/CurrentUserBadge';
import { Toaster } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Loader2, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HelpCenterModal } from '@/components/common/HelpCenterModal';

export function AppLayout() {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          // 未登入，導向登入頁
          navigate('/login', { replace: true });
        } else {
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        navigate('/login', { replace: true });
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [navigate]);

  // 驗證中顯示載入畫面
  if (isChecking) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">驗證中...</p>
        </div>
      </div>
    );
  }

  // 未通過驗證不渲染內容（會被導向登入頁）
  if (!isAuthenticated) {
    return null;
  }
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Sidebar - Always visible */}
      <aside className="h-full shrink-0">
        <Sidebar />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Bar with User Badge */}
        <div className="shrink-0 px-4 md:px-6 lg:px-8 py-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-end gap-2">
            {/* 幫助按鈕 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setHelpOpen(true)}
              className="text-muted-foreground hover:text-foreground"
              title="幫助中心"
            >
              <HelpCircle className="h-5 w-5" />
            </Button>
            <CurrentUserBadge />
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>

      {/* Global Components - Inside Router Context */}
      <Toaster />

      {/* 幫助中心 Modal */}
      <HelpCenterModal open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}