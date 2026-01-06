import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { needsMigration, migrateAllItemsStatus, isLegacyStatus } from '../../lib/storage/statusMigration';

/**
 * 狀態遷移管理面板
 * 用於手動觸發狀態遷移或檢查遷移狀態
 */
export function StatusMigrationPanel() {
  const [migrationNeeded, setMigrationNeeded] = useState(false);
  const [migrationCompleted, setMigrationCompleted] = useState<string | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [legacyStatusFound, setLegacyStatusFound] = useState<string[]>([]);

  // 檢查遷移狀態
  const checkMigrationStatus = () => {
    const needed = needsMigration();
    setMigrationNeeded(needed);
    
    const completed = localStorage.getItem('status_migration_completed');
    setMigrationCompleted(completed);

    // 掃描舊狀態
    const foundStatuses = new Set<string>();
    try {
      const keys = Object.keys(localStorage);
      const itemKeys = keys.filter(key => key.startsWith('items_') || key.startsWith('work_packages_'));
      
      itemKeys.forEach(key => {
        const data = localStorage.getItem(key);
        if (!data) return;
        
        const items = JSON.parse(data);
        if (!Array.isArray(items)) return;
        
        items.forEach((item: any) => {
          if (item.status && isLegacyStatus(item.status)) {
            foundStatuses.add(item.status);
          }
        });
      });
    } catch (error) {
      console.error('Error scanning legacy statuses:', error);
    }
    
    setLegacyStatusFound(Array.from(foundStatuses));
  };

  useEffect(() => {
    checkMigrationStatus();
  }, []);

  // 手動執行遷移
  const handleMigrate = async () => {
    setIsMigrating(true);
    try {
      const count = migrateAllItemsStatus();
      toast.success(`狀態遷移完成！共更新 ${count} 筆任務`);
      checkMigrationStatus();
    } catch (error) {
      console.error('Migration error:', error);
      toast.error('遷移失敗，請查看 Console');
    } finally {
      setIsMigrating(false);
    }
  };

  // 重置遷移標記（用於測試）
  const handleResetMigration = () => {
    localStorage.removeItem('status_migration_completed');
    toast.info('遷移標記已重置');
    checkMigrationStatus();
  };

  return (
    <div className="space-y-4 p-6 bg-white rounded-[var(--radius)] border border-border">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold" style={{ fontSize: 'var(--font-size-lg)' }}>
            狀態遷移工具
          </h3>
          <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-sm)' }}>
            將舊格式狀態（open, active, done 等）遷移為標準狀態
          </p>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={checkMigrationStatus}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          重新檢查
        </Button>
      </div>

      {/* 遷移狀態 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">遷移狀態：</label>
          {migrationCompleted ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              已完成（{new Date(migrationCompleted).toLocaleString('zh-TW')}）
            </Badge>
          ) : (
            <Badge variant="secondary">
              尚未執行
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">需要遷移：</label>
          {migrationNeeded ? (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              是（偵測到 {legacyStatusFound.length} 種舊狀態）
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              否
            </Badge>
          )}
        </div>

        {/* 顯示找到的舊狀態 */}
        {legacyStatusFound.length > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-[var(--radius)]">
            <p className="text-sm text-amber-900 font-medium mb-2">
              偵測到以下舊狀態：
            </p>
            <div className="flex flex-wrap gap-1">
              {legacyStatusFound.map(status => (
                <Badge key={status} variant="outline" className="text-xs bg-white">
                  {status}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 標準狀態說明 */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-[var(--radius)]">
        <p className="text-sm text-blue-900 font-medium mb-2">
          標準狀態（符合 rules.md 2.2 規範）：
        </p>
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-xs bg-white">not_started（未開始）</Badge>
          <Badge variant="outline" className="text-xs bg-white">in_progress（進行中）</Badge>
          <Badge variant="outline" className="text-xs bg-white">blocked（卡關）</Badge>
          <Badge variant="outline" className="text-xs bg-white">awaiting_response（待回覆）</Badge>
          <Badge variant="outline" className="text-xs bg-white">completed（已完成）</Badge>
        </div>
      </div>

      {/* 操作按鈕 */}
      <div className="flex gap-2 pt-2">
        <Button
          onClick={handleMigrate}
          disabled={isMigrating || !migrationNeeded}
          className="flex-1"
        >
          {isMigrating ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              遷移中...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              執行遷移
            </>
          )}
        </Button>

        <Button
          variant="outline"
          onClick={handleResetMigration}
          disabled={isMigrating}
        >
          重置標記
        </Button>
      </div>

      {/* 說明 */}
      <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border">
        <p>• 遷移會自動在系統啟動時執行一次</p>
        <p>• 如果需要重新遷移，請先點擊「重置標記」</p>
        <p>• 遷移不會刪除原始資料，僅更新狀態欄位</p>
      </div>
    </div>
  );
}
