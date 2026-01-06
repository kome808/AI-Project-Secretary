import React from 'react';
import { useDrag } from 'react-dnd';
import { Item, ItemPriority } from '../../lib/storage/types';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, AlertCircle, Clock, FileText } from 'lucide-react';

interface ActionCardProps {
  item: Item;
  onClick: () => void;
}

export function ActionCard({ item, onClick }: ActionCardProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'ACTION_CARD',
    item: { id: item.id },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const getPriorityColor = (priority?: ItemPriority) => {
    switch (priority) {
      case 'high':
        return 'border-l-[var(--destructive)]';
      case 'medium':
        return 'border-l-[var(--accent)]';
      case 'low':
        return 'border-l-[var(--muted-foreground)]';
      default:
        return 'border-l-[var(--border)]';
    }
  };

  const getPriorityLabel = (priority?: ItemPriority) => {
    const labels: Record<ItemPriority, string> = {
      high: '高',
      medium: '中',
      low: '低',
    };
    return priority ? labels[priority] : '';
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(dueDate) < today;
  };

  return (
    <div
      ref={drag}
      onClick={onClick}
      className={`p-4 bg-[var(--card)] border-l-4 ${getPriorityColor(item.priority)} border-t border-r border-b border-[var(--border)] rounded-[var(--radius)] cursor-pointer hover:shadow-[var(--elevation-sm)] transition-all duration-200 ${
        isDragging ? 'opacity-50 scale-95' : 'opacity-100'
      }`}
    >
      {/* Title */}
      <h3 className="mb-2 line-clamp-2 text-[var(--foreground)]">{item.title}</h3>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {item.status === 'blocked' && (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5 bg-[var(--destructive)] text-[var(--destructive-foreground)]">
            <AlertCircle className="h-3 w-3 mr-1" />
            已阻塞
          </Badge>
        )}
        {item.status === 'pending' && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-[var(--border)] text-[var(--muted-foreground)]">
            <Clock className="h-3 w-3 mr-1" />
            等待中
          </Badge>
        )}
        {item.priority && (
          <Badge 
            variant={item.priority === 'high' ? 'destructive' : item.priority === 'medium' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {getPriorityLabel(item.priority)}
          </Badge>
        )}
        {item.meta?.tags && Array.isArray(item.meta.tags) && item.meta.tags.length > 0 && (
          item.meta.tags.slice(0, 2).map((tag: string) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))
        )}
      </div>

      {/* Meta Info */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-[var(--border)]/50">
        <div className="flex flex-col gap-1 text-[10px] text-[var(--muted-foreground)]">
          {item.assignee_id && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="truncate max-w-[80px]">{item.assignee_id}</span>
            </div>
          )}
          {item.due_date && (
            <div className={`flex items-center gap-1 ${isOverdue(item.due_date) ? 'text-[var(--destructive)] font-bold' : ''}`}>
              <Calendar className="h-3 w-3" />
              <span>{new Date(item.due_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>
        
        {item.source_artifact_id && (
          <div className="flex items-center gap-1 text-[var(--accent)] bg-[var(--accent)]/5 px-1.5 py-0.5 rounded-[var(--radius-sm)]">
            <FileText className="h-3 w-3" />
            <span className="text-[9px] font-bold uppercase tracking-wider">SSOT</span>
          </div>
        )}
      </div>
    </div>
  );
}