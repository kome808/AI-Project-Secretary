import React, { useEffect, useState } from 'react';
import { FileText, Loader2, ExternalLink } from 'lucide-react';
import { Artifact, Item } from '../../../lib/storage/types';
import { getStorageClient } from '../../../lib/storage';
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle 
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface ArtifactViewDrawerProps {
  artifactId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentProjectId?: string;
}

export function ArtifactViewDrawer({ 
  artifactId, 
  open, 
  onOpenChange,
  currentProjectId 
}: ArtifactViewDrawerProps) {
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [relatedItems, setRelatedItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && artifactId) {
      loadArtifactData();
    }
  }, [open, artifactId]);

  const loadArtifactData = async () => {
    if (!artifactId) return;
    
    setLoading(true);
    const storage = getStorageClient();
    
    try {
      // 載入 Artifact
      const { data: artifactData, error: artifactError } = await storage.getArtifactById(artifactId);
      
      if (!artifactError && artifactData) {
        setArtifact(artifactData);
        
        // 載入同來源的其他建議卡
        if (currentProjectId) {
          const { data: itemsData } = await storage.getItems(currentProjectId, { 
            status: 'suggestion' 
          });
          
          if (itemsData) {
            const related = itemsData.filter(
              item => item.source_artifact_id === artifactId
            );
            setRelatedItems(related);
          }
        }
      }
    } catch (error) {
      console.error('Error loading artifact:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSourceTypeLabel = (sourceType?: string) => {
    const labels: Record<string, string> = {
      chat: '聊天對話',
      document: '文件上傳',
      meeting: '會議記錄',
      email: '電子郵件',
      message: '訊息',
      text: '文字輸入'
    };
    return labels[sourceType || 'text'] || sourceType || '未知';
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      action: '待辦',
      pending: '待回覆',
      decision: '決議',
      cr: '變更',
      rule: '規則',
      issue: '問題',
      work_package: '專案工作'
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      action: 'bg-blue-500 text-white',
      pending: 'bg-amber-500 text-white',
      decision: 'bg-emerald-500 text-white',
      cr: 'bg-orange-500 text-white',
      rule: 'bg-purple-500 text-white',
      issue: 'bg-red-500 text-white',
      work_package: 'bg-indigo-500 text-white'
    };
    return colors[type] || 'bg-gray-500 text-white';
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-[90vw] sm:w-[600px] sm:max-w-[50vw] overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <label>來源詳細資訊</label>
          </SheetTitle>
          <SheetDescription>
            <label>查看 AI 引用的原始內容與相關建議卡</label>
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : artifact ? (
          <div className="space-y-6 py-6">
            {/* 來源類型標籤 */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">來源類型</label>
              <Badge variant="outline" className="gap-1">
                <FileText className="h-3 w-3" />
                <label>{getSourceTypeLabel(artifact.source_type)}</label>
              </Badge>
            </div>

            {/* 來源資訊（如有） */}
            {artifact.source_info && (
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">來源資訊</label>
                <p className="text-sm">
                  <label>{artifact.source_info}</label>
                </p>
              </div>
            )}

            <Separator />

            {/* 原始內容 */}
            <div className="space-y-2">
              <label className="text-sm font-medium block">原始內容</label>
              <div className="p-4 rounded-[var(--radius-lg)] bg-muted border max-h-[400px] overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm break-words">
                  <label>{artifact.masked_content || artifact.original_content}</label>
                </pre>
              </div>
            </div>

            {/* AI 引用片段（從 related items 的 meta.citations 中提取） */}
            {relatedItems.length > 0 && relatedItems.some(item => item.meta?.citations?.length > 0) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <label className="text-sm font-medium block">AI 引用片段</label>
                  {relatedItems.map(item => 
                    item.meta?.citations?.map((citation: any, idx: number) => (
                      <div 
                        key={`${item.id}-${idx}`} 
                        className="p-3 rounded-[var(--radius)] bg-accent/10 border-l-2 border-accent"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getTypeColor(item.type)}>
                            <label>{getTypeLabel(item.type)}</label>
                          </Badge>
                          {citation.source_name && (
                            <label className="text-xs text-muted-foreground">
                              {citation.source_name}
                            </label>
                          )}
                        </div>
                        <p className="text-sm">
                          <label>「{citation.text}」</label>
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* 同來源衍生的其他建議卡 */}
            {relatedItems.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">此來源產生的建議卡</label>
                    <Badge variant="outline">
                      <label>{relatedItems.length} 張</label>
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    {relatedItems.map(item => (
                      <div 
                        key={item.id} 
                        className="p-3 rounded-[var(--radius-lg)] border hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start gap-2 mb-1">
                          <Badge className={getTypeColor(item.type)}>
                            <label>{getTypeLabel(item.type)}</label>
                          </Badge>
                          {item.meta?.confidence && (
                            <label className="text-xs text-muted-foreground">
                              信心度 {Math.round(item.meta.confidence * 100)}%
                            </label>
                          )}
                        </div>
                        <p className="text-sm font-medium mb-1">
                          <label>{item.title}</label>
                        </p>
                        {item.meta?.summary && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            <label>{item.meta.summary}</label>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* 建立時間 */}
            <Separator />
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">建立時間</label>
              <label className="text-sm">
                {new Date(artifact.created_at).toLocaleString('zh-TW', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </label>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-16 w-16 text-muted-foreground opacity-30 mb-4" />
            <p className="text-muted-foreground">
              <label>找不到來源資料</label>
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
