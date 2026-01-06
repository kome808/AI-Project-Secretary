import React from 'react';
import { Gavel, Shield, Calendar, Link as LinkIcon, ChevronRight, Globe, Layers, FileText, AlertCircle } from 'lucide-react';
import { Item, DecisionMeta } from '../../lib/storage/types';
import { Badge } from '@/components/ui/badge';
import { CATEGORIES, SCOPES } from './DecisionFilters';

interface DecisionCardProps {
  decision: Item;
  onClick: (decision: Item) => void;
}

export function DecisionCard({ decision, onClick }: DecisionCardProps) {
  const meta = decision.meta as DecisionMeta || {};
  const categoryName = CATEGORIES.find(c => c.id === meta.category)?.name || '其他';
  const scopeName = SCOPES.find(s => s.id === meta.scope)?.name || '全專案';
  const scopeTarget = meta.scope_target;
  const isRule = decision.type === 'rule';
  const isDeprecated = meta.status === 'deprecated';
  
  const ScopeIcon = meta.scope === 'module' ? Layers : meta.scope === 'page' ? FileText : Globe;
  
  return (
    <div 
      className={`group bg-card hover:bg-accent/5 transition-all border border-border rounded-xl p-5 cursor-pointer relative shadow-sm hover:shadow-md ${isDeprecated ? 'opacity-60 grayscale-[0.5]' : ''}`}
      onClick={() => onClick(decision)}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`p-3 rounded-xl shrink-0 transition-transform group-hover:scale-110 ${isDeprecated ? 'bg-muted text-muted-foreground' : isRule ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-purple-50 text-purple-600 border border-purple-100'}`}>
          {isRule ? <Shield className="h-6 w-6" /> : <Gavel className="h-6 w-6" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 ${isDeprecated ? 'border-muted-foreground text-muted-foreground' : isRule ? 'border-blue-200 text-blue-700 bg-blue-50/30' : 'border-purple-200 text-purple-700 bg-purple-50/30'}`}>
              {isRule ? '規則' : '決議'}
            </Badge>
            {isDeprecated && (
              <Badge variant="destructive" className="text-[10px] bg-red-500/10 text-red-600 border-red-200">
                <AlertCircle className="h-3 w-3 mr-1" />
                已停用
              </Badge>
            )}
            <Badge variant="secondary" className="text-[10px] font-medium bg-muted/50">
              {categoryName}
            </Badge>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/30 px-2 py-0.5 rounded border border-border/50">
              <ScopeIcon className="h-3 w-3" />
              <span>{scopeName}</span>
              {scopeTarget && <span className="text-primary/70 font-semibold ml-1">({scopeTarget})</span>}
            </div>
          </div>
          
          <h3 className={`mb-1.5 truncate font-bold text-lg transition-colors ${isDeprecated ? 'text-muted-foreground' : 'group-hover:text-primary'}`}>
            {decision.title}
          </h3>
          
          <p className="text-muted-foreground line-clamp-2 mb-4 text-sm leading-relaxed">
            {decision.description}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="flex items-center gap-1 text-[11px]">
                <Calendar className="h-3 w-3" />
                <span>{new Date(decision.created_at).toLocaleDateString('zh-TW')}</span>
              </div>
            </div>

            {decision.source_artifact_id && (
              <div className="flex items-center text-[10px] text-primary/80 font-bold gap-1 bg-primary/5 px-2 py-1 rounded-full border border-primary/10">
                <LinkIcon className="h-3 w-3" />
                <span>強溯源 CITATION</span>
              </div>
            )}
          </div>
        </div>

        {/* Action */}
        <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}