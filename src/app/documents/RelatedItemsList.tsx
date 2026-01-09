import React from 'react';
import { Item, DecisionMeta } from '@/lib/storage/types';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Clock, Gavel, ChevronRight, Quote, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RelatedItemsListProps {
  items: Item[];
  onCloseDetail?: () => void;
}

export function RelatedItemsList({ items, onCloseDetail }: RelatedItemsListProps) {
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed rounded-lg bg-muted/30">
        <p className="text-muted-foreground text-sm text-center">
          目前尚無以此文件為證據的衍生項目
        </p>
      </div>
    );
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'action': return <CheckSquare className="h-4 w-4 text-blue-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-orange-500" />;
      case 'decision':
      case 'rule': return <Gavel className="h-4 w-4 text-purple-500" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      // 新格式狀態
      case 'not_started':
        return 'bg-muted text-muted-foreground';
      case 'in_progress':
        return 'bg-accent/10 text-accent';
      case 'completed':
        return 'bg-[#4CAF50]/10 text-[#2E7D32]';
      case 'blocked':
        return 'bg-destructive/10 text-destructive';
      case 'awaiting_response':
        return 'bg-[#FFC107]/10 text-[#F57C00]';

      // 舊格式狀態（向後相容）
      case 'open':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'done':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'waiting':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';

      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const handleItemClick = (item: Item) => {
    const basePath = item.type === 'action' ? '/app/tasks?view=actions' :
      item.type === 'pending' ? '/app/tasks?view=todos' :
        '/app/tasks?view=actions';

    if (onCloseDetail) onCloseDetail();
    navigate(basePath, { state: { openItemId: item.id } });
  };

  return (
    <div className="space-y-4">
      {['action', 'pending', 'decision', 'rule'].map(type => {
        const typeItems = items.filter(i => i.type === type || (type === 'decision' && i.type === 'rule' && false)); // Handle rules separately if needed
        // Fix: for decision/rule grouping
        const filtered = items.filter(i => {
          if (type === 'decision') return i.type === 'decision' || i.type === 'rule';
          if (type === 'rule') return false; // Handled by decision
          return i.type === type;
        });

        if (filtered.length === 0) return null;

        return (
          <div key={type} className="space-y-2">
            <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
              {type === 'decision' ? '決議與規則' : type === 'action' ? '待辦事項' : '待確認事項'}
            </h5>
            <div className="space-y-2">
              {filtered.map((item) => {
                const citation = (item.meta as DecisionMeta)?.citation;
                const quote = citation?.highlight_text;
                const location = citation?.location_info;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className="flex flex-col p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-4 mb-2">
                      <div className="shrink-0">
                        {getTypeIcon(item.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium truncate group-hover:text-accent transition-colors">
                          {item.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${getStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                        </div>
                      </div>

                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
                    </div>

                    {(quote || location) && (
                      <div className="ml-8 space-y-1.5 pt-2 border-t border-muted/50">
                        {quote && (
                          <div className="flex items-start gap-2 text-[11px] text-muted-foreground italic">
                            <Quote className="h-3 w-3 shrink-0 mt-0.5" />
                            <p className="line-clamp-1">"{quote}"</p>
                          </div>
                        )}
                        {location && (
                          <div className="flex items-center gap-2 text-[10px] text-accent/70">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span>{location}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}