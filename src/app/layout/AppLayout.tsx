import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { CurrentUserBadge } from '@/features/project/components/CurrentUserBadge';
import { Toaster } from 'sonner';

export function AppLayout() {
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
          <div className="flex items-center justify-end">
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
    </div>
  );
}