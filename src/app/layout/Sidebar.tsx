import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Inbox,
  CheckSquare,
  FileText,
  Settings,
  Menu,
  Map,
  Package
} from 'lucide-react';
import { ProjectSwitcher } from '../projects/ProjectSwitcher';
import { useProject } from '../context/ProjectContext';

// Utility for class merging, inline for now if utils not present
function classNames(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export function Sidebar() {
  const { currentProject, adapter } = useProject(); // 使用 Context 中的 adapter
  const [inboxCount, setInboxCount] = useState(0);

  useEffect(() => {
    if (currentProject) {
      loadInboxCount();
    }
  }, [currentProject]);

  const loadInboxCount = async () => {
    if (!currentProject) return;
    // ✅ 使用 Context 中的 adapter，而不是直接調用 getStorageClient()
    const { data } = await adapter.getItems(currentProject.id, { status: 'suggestion' });
    setInboxCount(data?.length || 0);
  };

  const navItems = [
    { name: '儀表板', icon: LayoutDashboard, path: '/app' },
    { name: '收件匣', icon: Inbox, path: '/app/inbox', badge: inboxCount },
    { name: '任務清單', icon: CheckSquare, path: '/app/tasks' },
    { name: '文件庫', icon: FileText, path: '/app/sources' },
    { name: '設定', icon: Settings, path: '/app/settings' },
  ];

  return (
    <nav className="flex flex-col h-full w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300">
      {/* Header / Project Switcher */}
      <div className="p-4 border-b border-sidebar-border">
        <ProjectSwitcher />
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  classNames(
                    "flex items-center gap-3 px-3 py-2 rounded-md transition-colors relative",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.name}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-auto bg-accent text-accent-foreground rounded-full px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <p className="text-muted-foreground">AI Project Secretary</p>
        <p className="text-muted-foreground">v0.1.0 (MVP)</p>
      </div>
    </nav>
  );
}