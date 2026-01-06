import React, { useEffect } from 'react';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import { ProjectProvider } from './context/ProjectContext';
import { AppLayout } from './layout/AppLayout';
import { DashboardPage } from './dashboard/DashboardPage';
import { InboxPage } from './inbox/InboxPage';
import { TasksPage } from './tasks/TasksPage';
import { TaskDetailPage } from './tasks/TaskDetailPage';
import { FeatureDetailPage } from './tasks/FeatureDetailPage';
import { SourcesPage } from './sources/SourcesPage';
import SettingsPage from './settings/SettingsPage';
import { WorkListPage } from './work/WorkListPage';
import { WorkDetailPage } from './work/WorkDetailPage';
import { MapViewPage } from './work/MapViewPage';
import { needsMigration, migrateAllItemsStatus } from '../lib/storage/statusMigration';
import '../lib/permissions/devTools'; // Load development permission tools
import { DevUserSwitcher } from '@/lib/permissions/devTools';

import LoginPage from './auth/LoginPage';
import ResetPasswordPage from './auth/ResetPasswordPage';

const router = createHashRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'inbox', element: <InboxPage /> },
      { path: 'tasks', element: <TasksPage /> },
      { path: 'tasks/:id', element: <TaskDetailPage /> },
      { path: 'features/:id', element: <FeatureDetailPage /> },
      { path: 'work', element: <WorkListPage /> },
      { path: 'work/:id', element: <WorkDetailPage /> },
      { path: 'work/map', element: <MapViewPage /> },
      { path: 'sources', element: <SourcesPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);

export default function App() {
  useEffect(() => {
    // 1. Status Migration Check
    console.log('🔄 執行狀態遷移檢查...');

    // 檢查是否需要遷移（會掃描實際資料）
    const migrationNeeded = needsMigration();

    if (migrationNeeded) {
      console.log('  🔄 檢測到舊狀態數據，開始遷移...');
      const migratedCount = migrateAllItemsStatus();
      console.log(`  ✅ 狀態遷移完成，共更新 ${migratedCount} 筆任務`);
    } else {
      console.log('  ✅ 所有狀態已是最新格式');
    }

    // 2. 自動設定為 ADMIN（開發模式）
    const currentUser = localStorage.getItem('current_user');
    if (!currentUser) {
      console.log('🔧 開發模式：未檢測到用戶，自動設定為 ADMIN');
      DevUserSwitcher.setAdmin();
    } else {
      console.log('✅ 已有用戶登入:', JSON.parse(currentUser));
    }

    // 3. Mock data initialization 已移到 ProjectContext 中處理
    // 不在此處呼叫 getStorageClient()，避免創建多個 adapter 實例
  }, []);

  return (
    <ProjectProvider>
      <RouterProvider router={router} />
    </ProjectProvider>
  );
}