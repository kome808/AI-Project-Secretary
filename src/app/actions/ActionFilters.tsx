import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ItemStatus, ItemPriority } from '../../lib/storage/types';

interface ActionFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: ItemStatus | 'all';
  onStatusChange: (status: ItemStatus | 'all') => void;
  priorityFilter: ItemPriority | 'all';
  onPriorityChange: (priority: ItemPriority | 'all') => void;
  dueDateFilter: 'all' | 'overdue' | 'today' | 'week';
  onDueDateChange: (filter: 'all' | 'overdue' | 'today' | 'week') => void;
}

export function ActionFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  priorityFilter,
  onPriorityChange,
  dueDateFilter,
  onDueDateChange,
}: ActionFiltersProps) {
  return (
    <div className="space-y-4 p-4 bg-card border border-border rounded-lg">
      {/* Search */}
      <div>
        <Label htmlFor="search">搜尋</Label>
        <div className="relative mt-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="search"
            type="text"
            placeholder="搜尋標題或描述..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status Filter */}
        <div>
          <Label htmlFor="status-filter">狀態</Label>
          <Select value={statusFilter} onValueChange={(value) => onStatusChange(value as ItemStatus | 'all')}>
            <SelectTrigger id="status-filter" className="mt-1">
              <SelectValue placeholder="所有狀態" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有狀態</SelectItem>
              <SelectItem value="open">待處理</SelectItem>
              <SelectItem value="in_progress">進行中</SelectItem>
              <SelectItem value="pending">等待中</SelectItem>
              <SelectItem value="blocked">已阻塞</SelectItem>
              <SelectItem value="done">已完成</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Priority Filter */}
        <div>
          <Label htmlFor="priority-filter">優先級</Label>
          <Select value={priorityFilter} onValueChange={(value) => onPriorityChange(value as ItemPriority | 'all')}>
            <SelectTrigger id="priority-filter" className="mt-1">
              <SelectValue placeholder="所有優先級" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有優先級</SelectItem>
              <SelectItem value="high">高</SelectItem>
              <SelectItem value="medium">中</SelectItem>
              <SelectItem value="low">低</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Due Date Filter */}
        <div>
          <Label htmlFor="duedate-filter">到期日</Label>
          <Select value={dueDateFilter} onValueChange={(value) => onDueDateChange(value as any)}>
            <SelectTrigger id="duedate-filter" className="mt-1">
              <SelectValue placeholder="所有日期" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有日期</SelectItem>
              <SelectItem value="overdue">已逾期</SelectItem>
              <SelectItem value="today">今日到期</SelectItem>
              <SelectItem value="week">本週到期</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
