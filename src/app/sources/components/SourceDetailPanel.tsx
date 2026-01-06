import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  FileText, 
  Link2, 
  MessageSquare, 
  File,
  Calendar,
  Quote,
  CheckSquare,
  Briefcase,
  MessageCircle,
  GitBranch,
  FileCheck,
  ExternalLink
} from 'lucide-react';
import { Artifact, Item, ItemType } from '../../../lib/storage/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface SourceDetailPanelProps {
  artifact: Artifact | null;
  items: Item[];
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const TYPE_ICONS = {
  'text/plain': FileText,
  'text/conversation': MessageSquare,
  'text/uri-list': Link2,
  'application/': File,
};

const ITEM_TYPE_ICONS: Record<ItemType, React.ComponentType<{ className?: string }>> = {
  action: CheckSquare,
  pending: MessageCircle,
  decision: FileCheck,
  cr: GitBranch,
  work_package: Briefcase,
  rule: FileText,
  issue: FileText,
};

const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  action: '任務',
  pending: '待回覆',
  decision: '決議',
  cr: '變更',
  work_package: '專案工作',
  rule: '規則',
  issue: '問題',
};

export function SourceDetailPanel({ 
  artifact, 
  items, 
  open, 
  onClose,
  onUpdate 
}: SourceDetailPanelProps) {
  const navigate = useNavigate();

  const referencedItems = useMemo(() => {
    if (!artifact) return [];
    return items.filter(item => item.source_artifact_id === artifact.id);
  }, [artifact, items]);

  const groupedReferences = useMemo(() => {
    const groups: Record<ItemType, Item[]> = {
      action: [],
      pending: [],
      decision: [],
      cr: [],
      work_package: [],
      rule: [],
      issue: [],
    };

    referencedItems.forEach(item => {
      if (groups[item.type]) {
        groups[item.type].push(item);
      }
    });

    return groups;
  }, [referencedItems]);

  const getTypeInfo = (contentType: string) => {
    for (const [key, Icon] of Object.entries(TYPE_ICONS)) {
      if (contentType.includes(key)) {
        return { icon: Icon };
      }
    }
    return { icon: FileText };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleNavigateToItem = (item: Item) => {
    // Navigate to tasks page with appropriate view
    let view = 'actions';
    if (item.type === 'work_package') view = 'work';
    else if (item.type === 'pending') view = 'pending';
    else if (item.type === 'cr') view = 'cr';
    else if (item.type === 'decision') view = 'decisions';
    
    navigate(`/tasks?view=${view}`);
    onClose();
  };

  if (!artifact) return null;

  const typeInfo = getTypeInfo(artifact.content_type);
  const TypeIcon = typeInfo.icon;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="space-y-4 pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="flex items-center justify-center w-10 h-10 rounded-[var(--radius)] bg-primary/10 text-primary shrink-0">
                <TypeIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <SheetTitle className="text-left">
                  {artifact.meta?.source_info || '來源文件'}
                </SheetTitle>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <label className="text-xs">{formatDate(artifact.created_at)}</label>
                  {artifact.meta?.channel && (
                    <>
                      <span className="text-xs">•</span>
                      <label className="text-xs capitalize">{artifact.meta.channel}</label>
                    </>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Citation Count */}
          {referencedItems.length > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-[var(--radius-lg)] bg-primary/5 border border-primary/20">
              <Quote className="w-4 h-4 text-primary" />
              <label className="text-primary font-medium">
                此文件已被引用 {referencedItems.length} 次
              </label>
            </div>
          )}
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Content Section */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              原始內容
            </h3>
            <div className="p-4 rounded-[var(--radius-lg)] bg-muted/30 border border-border">
              {artifact.content_type === 'text/uri-list' ? (
                <a
                  href={artifact.original_content}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-accent hover:underline"
                >
                  <Link2 className="w-4 h-4" />
                  <span className="break-all">{artifact.original_content}</span>
                  <ExternalLink className="w-4 h-4 shrink-0" />
                </a>
              ) : artifact.original_content.startsWith('data:image/') ? (
                <div className="space-y-2">
                  <img 
                    src={artifact.original_content} 
                    alt={artifact.meta?.file_name || '上傳的圖片'} 
                    className="max-w-full h-auto rounded-[var(--radius)]"
                  />
                  {artifact.meta?.file_name && (
                    <p className="text-muted-foreground">
                      檔案名稱：{artifact.meta.file_name}
                    </p>
                  )}
                </div>
              ) : artifact.meta?.file_name ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-4xl">
                    {artifact.content_type?.includes('pdf') ? '📄' :
                     artifact.content_type?.includes('word') ? '📝' :
                     artifact.content_type?.includes('excel') || artifact.content_type?.includes('spreadsheet') ? '📊' :
                     artifact.content_type?.includes('markdown') ? '📃' : '📎'}
                  </div>
                  <div>
                    <p className="font-medium">{artifact.meta.file_name}</p>
                    {artifact.meta.file_size && (
                      <p className="text-muted-foreground">
                        檔案大小：{(artifact.meta.file_size / 1024).toFixed(2)} KB
                      </p>
                    )}
                    {artifact.meta.file_type && (
                      <p className="text-muted-foreground">
                        類型：{artifact.meta.file_type}
                      </p>
                    )}
                  </div>
                  {artifact.content_type?.startsWith('text/') && !artifact.original_content.startsWith('data:') && (
                    <div className="mt-4 p-3 bg-background rounded-[var(--radius)] border border-border">
                      <p className="whitespace-pre-wrap break-words text-sm">
                        {artifact.original_content}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="whitespace-pre-wrap break-words">
                  {artifact.original_content}
                </p>
              )}
            </div>
            {artifact.original_content !== artifact.masked_content && (
              <div className="text-xs text-muted-foreground p-2 rounded-[var(--radius)] bg-amber-50 border border-amber-200">
                <label>⚠️ 此文件包含已遮罩的敏感資訊</label>
              </div>
            )}
          </div>

          {/* References Section */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2">
              <Quote className="w-4 h-4" />
              反向追蹤 ({referencedItems.length})
            </h3>

            {referencedItems.length === 0 ? (
              <div className="p-8 text-center rounded-[var(--radius-lg)] bg-muted/20 border-2 border-dashed border-border">
                <p className="text-muted-foreground">
                  <label>此文件尚未被引用</label>
                </p>
                <label className="text-muted-foreground opacity-70">
                  當 AI 從此文件產生任務或決議時，會在這裡顯示
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedReferences).map(([type, items]) => {
                  if (items.length === 0) return null;
                  
                  const itemType = type as ItemType;
                  const ItemIcon = ITEM_TYPE_ICONS[itemType];
                  const label = ITEM_TYPE_LABELS[itemType];

                  return (
                    <div key={type} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <ItemIcon className="w-4 h-4 text-muted-foreground" />
                        <label className="font-medium">{label}</label>
                        <Badge variant="outline">{items.length}</Badge>
                      </div>
                      <div className="space-y-2 pl-6">
                        {items.map(item => (
                          <button
                            key={item.id}
                            onClick={() => handleNavigateToItem(item)}
                            className="w-full text-left p-3 rounded-[var(--radius)] bg-card border border-border hover:border-accent/50 hover:shadow-[var(--elevation-sm)] transition-all group"
                          >
                            <p className="font-medium group-hover:text-accent transition-colors line-clamp-1">
                              {item.title}
                            </p>
                            {item.description && (
                              <p className="text-muted-foreground line-clamp-2 mt-1">
                                {item.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {item.status}
                              </Badge>
                              {item.assignee && (
                                <label className="text-xs text-muted-foreground">
                                  @{item.assignee}
                                </label>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Metadata Section */}
          {artifact.meta && Object.keys(artifact.meta).length > 0 && (
            <div className="space-y-3 pt-4 border-t border-border">
              <h3 className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                詳細資訊
              </h3>
              <div className="p-4 rounded-[var(--radius-lg)] bg-muted/20 border border-border space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <label className="text-muted-foreground">文件 ID</label>
                    <p className="font-mono text-xs mt-1 break-all">{artifact.id}</p>
                  </div>
                  <div>
                    <label className="text-muted-foreground">內容類型</label>
                    <p className="mt-1">{artifact.content_type}</p>
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground p-3 rounded-[var(--radius)] bg-blue-50 border border-blue-200">
                <label>
                  🔒 原始內容已鎖定，無法修改以確保證據鏈完整性
                </label>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
