import React, { useState } from 'react';
import { Database, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useProject } from '@/app/context/ProjectContext';
import { batchEmbedTasks } from '@/lib/storage/batchEmbedTasks';

export function DataMaintenancePanel() {
    const { currentProject } = useProject();
    const [isEmbedding, setIsEmbedding] = useState(false);
    const [confirmReady, setConfirmReady] = useState(false);
    const [embeddingResult, setEmbeddingResult] = useState<{
        successCount: number;
        failCount: number;
        total: number;
    } | null>(null);

    const handleBatchEmbed = async () => {
        if (!currentProject) {
            toast.error('請先選擇專案');
            return;
        }

        // 第一次點擊：顯示確認提示
        if (!confirmReady) {
            setConfirmReady(true);
            toast.info('請再次點擊按鈕以確認執行批次向量化');
            // 5 秒後自動取消確認狀態
            setTimeout(() => setConfirmReady(false), 5000);
            return;
        }

        // 第二次點擊：執行批次處理
        setConfirmReady(false);

        setIsEmbedding(true);
        setEmbeddingResult(null);

        try {
            const result = await batchEmbedTasks(currentProject.id);
            setEmbeddingResult(result);

            if (result.failCount === 0) {
                toast.success(`成功為 ${result.successCount} 個任務產生向量資料`);
            } else {
                toast.warning(`完成批次處理：成功 ${result.successCount}，失敗 ${result.failCount}`);
            }
        } catch (err) {
            console.error('批次向量化失敗:', err);
            toast.error('批次處理失敗，請查看 Console');
        } finally {
            setIsEmbedding(false);
        }
    };

    return (
        <div className="space-y-[var(--spacing-6)]">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-[var(--spacing-3)]">
                        <Database className="w-5 h-5 text-primary" />
                        <div>
                            <h3 className="text-lg font-semibold">資料維護工具</h3>
                            <p className="text-sm text-muted-foreground">
                                管理專案資料的批次處理與維護作業
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-[var(--spacing-4)]">
                    {/* 批次向量化 */}
                    <div className="border border-border rounded-lg p-[var(--spacing-4)]">
                        <div className="flex items-start justify-between mb-[var(--spacing-3)]">
                            <div className="flex items-center gap-[var(--spacing-2)]">
                                <Zap className="w-5 h-5 text-amber-500" />
                                <div>
                                    <h4 className="font-medium">批次任務向量化</h4>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        為現有任務批次產生 Embedding，啟用語義搜尋功能
                                    </p>
                                </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                                Phase 2
                            </Badge>
                        </div>

                        {embeddingResult && (
                            <div className="bg-muted/50 rounded-md p-[var(--spacing-3)] mb-[var(--spacing-3)]">
                                <div className="flex items-center gap-[var(--spacing-2)] mb-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    <span className="text-sm font-medium">處理結果</span>
                                </div>
                                <div className="grid grid-cols-3 gap-[var(--spacing-2)] text-sm">
                                    <div>
                                        <span className="text-muted-foreground">總計：</span>
                                        <span className="font-medium ml-1">{embeddingResult.total}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">成功：</span>
                                        <span className="font-medium ml-1 text-green-600">
                                            {embeddingResult.successCount}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">失敗：</span>
                                        <span className="font-medium ml-1 text-red-600">
                                            {embeddingResult.failCount}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex items-start gap-[var(--spacing-2)] text-sm text-muted-foreground mb-[var(--spacing-3)]">
                            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <div>
                                <p>此操作將為專案中的所有任務產生向量資料，用於智慧映射功能。</p>
                                <ul className="list-disc list-inside mt-1 space-y-1">
                                    <li>新建任務會自動向量化，無需手動處理</li>
                                    <li>批次處理包含 100ms 延遲，避免 API Rate Limit</li>
                                    <li>處理過程不會影響現有任務資料</li>
                                </ul>
                            </div>
                        </div>

                        <Button
                            onClick={handleBatchEmbed}
                            disabled={isEmbedding || !currentProject}
                            className="w-full"
                            variant={confirmReady ? 'destructive' : 'default'}
                        >
                            {isEmbedding ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                    處理中...
                                </>
                            ) : confirmReady ? (
                                <>
                                    <Zap className="w-4 h-4 mr-2" />
                                    確認執行批次向量化
                                </>
                            ) : (
                                <>
                                    <Zap className="w-4 h-4 mr-2" />
                                    開始批次向量化
                                </>
                            )}
                        </Button>
                    </div>

                    {/* 未來可擴展的其他維護工具 */}
                    <div className="border border-dashed border-border rounded-lg p-[var(--spacing-4)] text-center text-muted-foreground">
                        <p className="text-sm">更多資料維護工具即將推出...</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
