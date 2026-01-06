import React from 'react';
import { FileText, Link2, MessageSquare, File, Quote, Calendar, CheckCircle2, Circle } from 'lucide-react';
import { Artifact } from '../../../lib/storage/types';
import { Badge } from '@/components/ui/badge';

interface SourceCardProps {
  artifact: Artifact;
  citationCount: number;
  onClick: (artifact: Artifact) => void;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

const TYPE_ICONS = {
  'text/plain': FileText,
  'text/conversation': MessageSquare,
  'text/uri-list': Link2,
  'text/markdown': FileText,
  'application/pdf': FileText,
  'application/msword': FileText,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': FileText,
  'application/vnd.ms-excel': FileText,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': FileText,
  'image/': FileText,
  'application/': File,
};

const TYPE_LABELS = {
  'text/plain': '文字',
  'text/conversation': '對話',
  'text/uri-list': '連結',
  'text/markdown': 'Markdown',
  'application/pdf': 'PDF',
  'application/msword': 'Word',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  'application/vnd.ms-excel': 'Excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
  'image/': '圖片',
  'application/': '檔案',
};

const TYPE_EMOJIS = {
  'text/plain': '📃',
  'text/conversation': '💬',
  'text/uri-list': '🔗',
  'text/markdown': '📃',
  'application/pdf': '📄',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/vnd.ms-excel': '📊',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
  'image/': '🖼️',
  'application/': '📎',
};

export function SourceCard({ artifact, citationCount, onClick, selected = false, onToggleSelect }: SourceCardProps) {
  const getTypeInfo = () => {
    const contentType = artifact.content_type || 'text/plain';
    
    // Try exact match first
    if (TYPE_LABELS[contentType as keyof typeof TYPE_LABELS]) {
      return {
        icon: TYPE_ICONS[contentType as keyof typeof TYPE_ICONS],
        label: TYPE_LABELS[contentType as keyof typeof TYPE_LABELS],
        emoji: TYPE_EMOJIS[contentType as keyof typeof TYPE_EMOJIS]
      };
    }
    
    // Try prefix match for image/ and application/
    for (const [key, Icon] of Object.entries(TYPE_ICONS)) {
      if (contentType.startsWith(key)) {
        return {
          icon: Icon,
          label: TYPE_LABELS[key as keyof typeof TYPE_LABELS],
          emoji: TYPE_EMOJIS[key as keyof typeof TYPE_EMOJIS]
        };
      }
    }
    
    return { icon: FileText, label: '文件', emoji: '' };
  };

  const typeInfo = getTypeInfo();
  const TypeIcon = typeInfo.icon;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getSourceInfo = () => {
    return artifact.meta?.source_info || formatDate(artifact.created_at);
  };

  const getContentPreview = () => {
    const content = artifact.original_content || '';
    
    // For files, show file info from meta
    if (artifact.meta?.file_name) {
      return `檔案：${artifact.meta.file_name}`;
    }
    
    // For images with base64, show placeholder
    if (content.startsWith('data:image/')) {
      return '圖片檔案';
    }
    
    if (content.length > 120) {
      return content.slice(0, 120) + '...';
    }
    return content;
  };

  const isSelectionMode = onToggleSelect !== undefined;

  const handleClick = (e: React.MouseEvent) => {
    if (isSelectionMode) {
      e.preventDefault();
      onToggleSelect(artifact.id);
    } else {
      onClick(artifact);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`group bg-card border-2 rounded-[var(--radius-lg)] p-[var(--spacing-4)] space-y-[var(--spacing-3)] text-left hover:shadow-[var(--elevation-md)] transition-all relative ${
        selected 
          ? 'border-primary bg-primary/5 shadow-[var(--elevation-md)]' 
          : 'border-border hover:border-accent/50'
      }`}
    >
      {/* 選擇模式：顯示複選框 */}
      {isSelectionMode && (
        <div className="absolute top-[var(--spacing-3)] right-[var(--spacing-3)] z-10">
          {selected ? (
            <CheckCircle2 className="w-5 h-5 text-primary fill-current" />
          ) : (
            <Circle className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-[var(--radius)] bg-primary/10 shrink-0 text-xl">
            {typeInfo.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <Badge variant="outline" className="text-xs">
              {typeInfo.label}
            </Badge>
          </div>
        </div>
        
        {/* Citation Count */}
        {!isSelectionMode && citationCount > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-[var(--radius)] bg-primary/10 text-primary shrink-0">
            <Quote className="w-3 h-3" />
            <label className="text-xs font-medium">{citationCount}</label>
          </div>
        )}
      </div>

      {/* Content Preview */}
      <div className="space-y-2">
        <h3 className="line-clamp-2 group-hover:text-accent transition-colors">
          {getSourceInfo()}
        </h3>
        <p className="text-muted-foreground line-clamp-3">
          {getContentPreview()}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 text-muted-foreground pt-2 border-t border-border">
        <Calendar className="w-3 h-3" />
        <label className="text-xs">{formatDate(artifact.created_at)}</label>
        
        {artifact.meta?.channel && (
          <>
            <span className="text-xs">•</span>
            <label className="text-xs capitalize">{artifact.meta.channel}</label>
          </>
        )}
      </div>
    </button>
  );
}