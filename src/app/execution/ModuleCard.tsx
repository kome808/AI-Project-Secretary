import React, { useState } from 'react';
import { ChevronRight, ChevronDown, CheckCircle2, Clock, PlayCircle, Layers, AlertCircle, ExternalLink } from 'lucide-react';
import { Module, Page, Item } from '../../lib/storage/types';

interface ModuleCardProps {
  module: Module;
  pages: Page[];
  items: Item[];
}

export function ModuleCard({ module, pages, items }: ModuleCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'developing': return <PlayCircle className="w-4 h-4 text-blue-500" />;
      case 'testing': return <Clock className="w-4 h-4 text-orange-500" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'done': return '已完成';
      case 'developing': return '開發中';
      case 'testing': return '測試中';
      case 'designing': return '設計中';
      default: return '待啟動';
    }
  };

  const completedPages = pages.filter(p => p.status === 'done').length;
  const progress = pages.length > 0 ? Math.round((completedPages / pages.length) * 100) : 0;
  
  // Find blocked items related to this module/page
  const blockedItems = items.filter(i => 
    i.status === 'blocked' && 
    (i.meta?.impact_modules?.includes(module.name) || pages.some(p => i.meta?.impact_pages?.includes(p.name)))
  );

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Module Header */}
      <div 
        className="p-4 flex items-center justify-between cursor-pointer bg-muted/10 hover:bg-muted/20"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Layers className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="m-0 text-base font-bold">{module.name}</h4>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-xs text-muted-foreground"><label>{pages.length} 頁面</label></span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-border h-1.5 rounded-full">
                  <div className="bg-primary h-full rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
                <span className="text-xs font-medium"><label>{progress}%</label></span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {blockedItems.length > 0 && (
            <div className="flex items-center gap-1 text-destructive text-xs font-bold px-2 py-1 bg-destructive/10 rounded-full">
              <AlertCircle className="w-3 h-3" />
              <label className="text-destructive">{blockedItems.length} Blocked</label>
            </div>
          )}
          {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </div>
      </div>

      {/* Pages List */}
      {isExpanded && (
        <div className="p-4 space-y-3 bg-white">
          {pages.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4"><label>尚無頁面規劃</label></div>
          ) : (
            pages.map(page => (
              <div key={page.id} className="group flex items-center justify-between p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/10 transition-all">
                <div className="flex items-center gap-3">
                  <div className="shrink-0">{getStatusIcon(page.status)}</div>
                  <div>
                    <div className="text-sm font-medium flex items-center gap-2">
                      {page.name}
                      {page.reference_link && (
                        <a href={page.reference_link} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span><label>{getStatusLabel(page.status)}</label></span>
                      {page.path && <span className="text-muted-foreground/50"><label>• {page.path}</label></span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button className="text-xs text-primary hover:underline">詳情</button>
                   <button className="text-xs text-muted-foreground hover:text-foreground">編輯</button>
                </div>
              </div>
            ))
          )}
          
          <button className="w-full mt-2 py-2 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-all flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            新增頁面
          </button>
        </div>
      )}
    </div>
  );
}

function Plus({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14"/><path d="M12 5v14"/>
    </svg>
  );
}