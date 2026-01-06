import React, { useState } from 'react';
import { CheckCircle2, X, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskPreviewCard, TaskSuggestion } from './TaskPreviewCard';
import { motion, AnimatePresence } from 'motion/react';

interface TaskPreviewPanelProps {
  tasks: TaskSuggestion[];
  aiMessage?: string;
  onConfirm: (selectedTasks: TaskSuggestion[]) => void;
  onCancel: () => void;
  isLoading?: boolean;
  members?: Array<{ id: string; name: string; email: string }>;
}

export function TaskPreviewPanel({
  tasks: initialTasks,
  aiMessage,
  onConfirm,
  onCancel,
  isLoading = false,
  members = [],
}: TaskPreviewPanelProps) {
  const [tasks, setTasks] = useState<TaskSuggestion[]>(initialTasks);

  const handleTaskUpdate = (id: string, updates: Partial<TaskSuggestion>) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, ...updates } : task))
    );
  };

  const handleSelectAll = () => {
    const allSelected = tasks.every((t) => t.selected);
    setTasks((prev) => prev.map((task) => ({ ...task, selected: !allSelected })));
  };

  const handleConfirm = () => {
    const selectedTasks = tasks.filter((t) => t.selected);
    if (selectedTasks.length === 0) {
      return;
    }
    onConfirm(selectedTasks);
  };

  const selectedCount = tasks.filter((t) => t.selected).length;
  const allSelected = tasks.length > 0 && tasks.every((t) => t.selected);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
        className="mt-4 p-6 rounded-[var(--radius-lg)] border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 shadow-[var(--elevation-md)]"
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20 text-primary shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="flex items-center gap-2 mb-1">
              任務規劃草稿
              <span className="text-sm font-normal text-muted-foreground">
                （{selectedCount}/{tasks.length} 已選取）
              </span>
            </h3>
            {aiMessage && (
              <p className="text-sm text-muted-foreground leading-relaxed">{aiMessage}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="shrink-0 h-8 w-8 p-0"
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Info Alert */}
        <div className="flex items-start gap-2 p-3 mb-4 rounded-[var(--radius)] bg-background/80 border border-border/50">
          <AlertCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            請檢視以下任務建議。您可以勾選要建立的任務、編輯內容或調整日期。確認後將自動建立至專案看板。
          </p>
        </div>

        {/* Tasks List */}
        <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
          {tasks.map((task) => (
            <TaskPreviewCard
              key={task.id}
              task={task}
              onUpdate={handleTaskUpdate}
              members={members}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <Button variant="outline" size="sm" onClick={handleSelectAll} disabled={isLoading}>
            {allSelected ? '取消全選' : '全選'}
          </Button>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
              取消
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedCount === 0 || isLoading}
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              確認生成 {selectedCount > 0 && `${selectedCount} 張`}卡片
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
