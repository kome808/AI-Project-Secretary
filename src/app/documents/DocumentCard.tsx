import React from 'react';
import { FileText, Image, Link, AlignLeft, Calendar, ExternalLink, Hash, MessagesSquare, Archive } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Artifact, ArtifactType } from '@/lib/storage/types';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

interface DocumentCardProps {
  artifact: Artifact;
  citationCount: number;
  onClick: (artifact: Artifact) => void;
}

export function DocumentCard({ artifact, citationCount, onClick }: DocumentCardProps) {
  const getIcon = (type: ArtifactType) => {
    switch (type) {
      case 'text':
        return <AlignLeft className="h-5 w-5 text-blue-500" />;
      case 'file':
        return <FileText className="h-5 w-5 text-orange-500" />;
      case 'image':
        return <Image className="h-5 w-5 text-purple-500" />;
      case 'link':
        return <Link className="h-5 w-5 text-green-500" />;
      case 'conversation':
        return <MessagesSquare className="h-5 w-5 text-pink-500" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getLabel = (type: ArtifactType) => {
    switch (type) {
      case 'text': return '文字內容';
      case 'file': return '檔案文件';
      case 'image': return '圖片影像';
      case 'link': return '外部連結';
      case 'conversation': return '對話串';
      default: return '未知類型';
    }
  };

  const getChannelLabel = (channel?: string) => {
    switch (channel) {
      case 'line': return 'LINE';
      case 'email': return 'Email';
      case 'meeting': return '會議錄';
      case 'upload': return '上傳';
      case 'paste': return '貼上';
      default: return null;
    }
  };

  // Extract a preview or title
  const title = artifact.source_info || artifact.meta?.summary || (artifact.type === 'text' ? artifact.content.slice(0, 40) + '...' : '未命名文件');
  const preview = artifact.content.slice(0, 100) + (artifact.content.length > 100 ? '...' : '');

  return (
    <Card 
      className={`group cursor-pointer hover:shadow-[var(--elevation-sm)] transition-all border-l-4 ${artifact.archived ? 'border-l-muted opacity-60' : 'border-l-transparent hover:border-l-accent'}`}
      onClick={() => onClick(artifact)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-lg bg-muted group-hover:bg-accent/10 transition-colors shrink-0">
            {getIcon(artifact.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {getLabel(artifact.type)}
                </span>
                {artifact.meta?.channel && (
                  <Badge variant="outline" className="h-4 px-1.5 text-[8px] font-bold uppercase py-0 leading-none">
                    {getChannelLabel(artifact.meta.channel)}
                  </Badge>
                )}
                {artifact.archived && (
                  <Badge variant="secondary" className="h-4 px-1.5 text-[8px] font-bold uppercase py-0 leading-none flex items-center gap-1">
                    <Archive className="h-2 w-2" />
                    已封存
                  </Badge>
                )}
              </div>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap">
                <Calendar className="h-3 w-3" />
                {format(new Date(artifact.created_at), 'MM/dd HH:mm', { locale: zhTW })}
              </span>
            </div>
            
            <h3 className="text-base font-semibold text-foreground truncate group-hover:text-accent transition-colors leading-tight">
              {title}
            </h3>
            
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1 leading-snug">
              {preview}
            </p>

            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-muted">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Hash className="h-3 w-3" />
                <span>{citationCount} 個衍生項目</span>
              </div>
              
              {artifact.type === 'link' && (
                <div className="flex items-center gap-1.5 text-xs text-accent">
                  <ExternalLink className="h-3 w-3" />
                  <span>原文連結</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}