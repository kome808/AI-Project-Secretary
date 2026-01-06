import React from 'react';
import { Item, Member } from '../../lib/storage/types';
import { Badge } from '@/components/ui/badge';
import { 
  GitPullRequest, AlertTriangle, Calendar, 
  User, ChevronRight, FileText, Layers 
} from 'lucide-react';

interface CRListProps {
  items: Item[];
  members?: Member[];
  onItemClick: (item: Item) => void;
}

export function CRList({ items, members = [], onItemClick }: CRListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-muted/20 border-2 border-dashed rounded-2xl">
        <GitPullRequest className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
        <p className="text-muted-foreground">尚無符合條件的需求變更記錄</p>
      </div>
    );
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'requested': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">已提出</Badge>;
      case 'reviewing': return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">審核中</Badge>;
      case 'approved': return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">已核准</Badge>;
      case 'rejected': return <Badge variant="outline" className="bg-destructive/5 text-destructive border-destructive/20">已駁回</Badge>;
      case 'implemented': return <Badge variant="secondary" className="bg-slate-100 text-slate-700">已實作</Badge>;
      case 'canceled': return <Badge variant="outline" className="bg-slate-50 text-slate-500">已取消</Badge>;
      default: return <Badge variant="outline">未知</Badge>;
    }
  };

  const getRiskIndicator = (risk?: string) => {
    switch (risk) {
      case 'high': return <div className="flex items-center gap-1 text-destructive font-bold text-xs"><AlertTriangle className="h-3 w-3" /> HIGH</div>;
      case 'medium': return <div className="flex items-center gap-1 text-amber-600 font-bold text-xs">MEDIUM</div>;
      case 'low': return <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs">LOW</div>;
      default: return null;
    }
  };

  const getOwnerName = (id?: string) => {
    if (!id) return null;
    const member = members.find(m => m.id === id);
    return member ? member.name : null;
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      {items.map((item) => {
        const meta = item.meta || {};
        const ownerName = getOwnerName(meta.owner_id);
        
        return (
          <div 
            key={item.id}
            onClick={() => onItemClick(item)}
            className="group bg-card border border-border rounded-xl p-5 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
          >
            {/* Risk side bar */}
            {meta.risk_level === 'high' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-destructive" />}

            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge(meta.cr_status)}
                  {getRiskIndicator(meta.risk_level)}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold group-hover:text-accent transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {item.description}
                  </p>
                </div>

                <div className="flex items-center gap-6 pt-2">
                  {meta.impact_modules?.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Layers className="h-3 w-3" />
                      {meta.impact_modules[0]} {meta.impact_modules.length > 1 && `+${meta.impact_modules.length - 1}`}
                    </div>
                  )}
                  {item.source_artifact_id && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      有證據溯源
                    </div>
                  )}
                  {ownerName && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      負責人：{ownerName}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end justify-between h-full self-stretch">
                <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                  <ChevronRight className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}