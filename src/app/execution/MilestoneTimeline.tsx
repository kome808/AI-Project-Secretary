import React from 'react';
import { Milestone, Module, Page } from '../../lib/storage/types';
import { Calendar, ChevronRight } from 'lucide-react';

interface MilestoneTimelineProps {
  milestones: Milestone[];
  modules: Module[];
  pages: Page[];
}

export function MilestoneTimeline({ milestones, modules, pages }: MilestoneTimelineProps) {
  if (milestones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-xl border border-dashed border-border">
        <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">尚無里程碑規劃</h3>
        <p className="text-muted-foreground mt-1"><label>請在專案設定中建立里程碑或波段</label></p>
        <button className="mt-4 bg-primary text-white px-4 py-2 rounded-lg text-sm">新增里程碑</button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {milestones.map((milestone, index) => (
        <div key={milestone.id} className="relative">
          {/* Timeline Connector Line */}
          {index < milestones.length - 1 && (
            <div className="absolute left-6 top-12 bottom-[-32px] w-0.5 bg-border z-0"></div>
          )}

          {/* Milestone Card */}
          <div className="flex gap-6 relative z-10">
            {/* Date/Status Indicator */}
            <div className="shrink-0 flex flex-col items-center">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
                style={{ backgroundColor: milestone.color || 'var(--primary)' }}
              >
                {index + 1}
              </div>
            </div>

            {/* Content Card */}
            <div className="flex-1 bg-white rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="p-4 border-b border-border bg-muted/5 flex justify-between items-center">
                <div>
                  <h3 className="m-0 text-lg font-bold">{milestone.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Calendar className="w-4 h-4" />
                    <span><label>{milestone.start_date} ~ {milestone.end_date}</label></span>
                  </div>
                </div>
                <div className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
                  <label className="text-primary font-bold">規劃中</label>
                </div>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* For demo, we just show some modules here. In reality, you'd link them via Alignment table */}
                  {modules.slice(0, 3).map(module => (
                    <div key={module.id} className="p-3 rounded-lg border border-border bg-muted/10">
                      <div className="text-sm font-bold truncate">{module.name}</div>
                      <div className="flex items-center justify-between mt-2">
                         <span className="text-xs text-muted-foreground"><label>{pages.filter(p => p.module_id === module.id).length} 頁面</label></span>
                         <span className="text-xs font-medium text-primary"><label className="text-primary font-medium">已排程</label></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}