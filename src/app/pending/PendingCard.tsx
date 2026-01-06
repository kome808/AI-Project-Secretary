import React, { useState, useEffect } from 'react';
import { Item, PendingMeta, Artifact } from '../../lib/storage/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User, AlertCircle, FileText, Calendar } from 'lucide-react';
import { getStorageClient } from '../../lib/storage';

interface PendingCardProps {
  item: Item;
  onClick: () => void;
}

export function PendingCard({ item, onClick }: PendingCardProps) {
  const meta = item.meta as PendingMeta | undefined;
  const [artifact, setArtifact] = useState<Artifact | null>(null);

  useEffect(() => {
    if (item.source_artifact_id) {
      loadArtifact();
    }
  }, [item.source_artifact_id]);

  const loadArtifact = async () => {
    if (!item.source_artifact_id) return;
    
    const storage = getStorageClient();
    const { data } = await storage.getArtifactById(item.source_artifact_id);
    if (data) {
      setArtifact(data);
    }
  };

  // Calculate waiting days
  const getWaitingDays = () => {
    const now = new Date();
    const created = new Date(item.created_at);
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Check if overdue
  const isOverdue = () => {
    if (!item.due_date) return false;
    return new Date(item.due_date) < new Date();
  };

  // Get waiting on type label
  const getWaitingOnTypeLabel = (type?: string) => {
    switch (type) {
      case 'client':
        return '客戶';
      case 'internal':
        return '內部';
      case 'external':
        return '外部';
      default:
        return '未指定';
    }
  };

  // Get waiting on badge variant
  const getWaitingOnBadgeVariant = (type?: string) => {
    switch (type) {
      case 'client':
        return 'default' as const;
      case 'internal':
        return 'secondary' as const;
      case 'external':
        return 'outline' as const;
      default:
        return 'outline' as const;
    }
  };

  const waitingDays = getWaitingDays();
  const overdue = isOverdue();

  return (
    <Card 
      className="cursor-pointer hover:shadow-[var(--elevation-sm)] transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-foreground mb-1 truncate">{item.title}</h3>
            <p className="text-muted-foreground line-clamp-2">{item.description}</p>
          </div>
          
          {/* Waiting Days Badge */}
          <div className={`flex items-center gap-1 px-2 py-1 rounded-md shrink-0 ${
            overdue 
              ? 'bg-destructive/10 text-destructive' 
              : waitingDays > 7 
                ? 'bg-[var(--chart-5)]/10 text-[var(--chart-5)]'
                : 'bg-muted text-muted-foreground'
          }`}>
            <Clock className="h-3 w-3" />
            <span className="text-xs font-medium">{waitingDays} 天</span>
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {/* Waiting On */}
          {meta?.waiting_on_type && (
            <Badge variant={getWaitingOnBadgeVariant(meta.waiting_on_type)} className="text-xs">
              <User className="h-3 w-3 mr-1" />
              {getWaitingOnTypeLabel(meta.waiting_on_type)}
              {meta.waiting_on_name && `: ${meta.waiting_on_name}`}
            </Badge>
          )}

          {/* Overdue Warning */}
          {overdue && (
            <Badge variant="destructive" className="text-xs">
              <AlertCircle className="h-3 w-3 mr-1" />
              已逾期
            </Badge>
          )}

          {/* Due Date */}
          {item.due_date && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {new Date(item.due_date).toLocaleDateString('zh-TW')}
            </div>
          )}
        </div>

        {/* Citation */}
        {artifact && (
          <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
            <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">來源證據</div>
              <div className="text-xs text-foreground truncate">
                {artifact.source_info || artifact.type}
              </div>
            </div>
          </div>
        )}

        {/* Expected Response */}
        {meta?.expected_response && (
          <div className="mt-2 text-xs text-muted-foreground">
            期待回覆：{meta.expected_response}
          </div>
        )}
      </CardContent>
    </Card>
  );
}