import React from 'react';
import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WaitingOnType } from '../../lib/storage/types';

interface PendingFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  waitingOnFilter: WaitingOnType | 'all';
  onWaitingOnFilterChange: (value: WaitingOnType | 'all') => void;
  quickFilter: 'all' | 'overdue' | 'recent';
  onQuickFilterChange: (value: 'all' | 'overdue' | 'recent') => void;
  sortBy: 'overdue' | 'waiting_days' | 'due_date' | 'recent';
  onSortByChange: (value: 'overdue' | 'waiting_days' | 'due_date' | 'recent') => void;
}

export function PendingFilters({
  searchQuery,
  onSearchChange,
  waitingOnFilter,
  onWaitingOnFilterChange,
  quickFilter,
  onQuickFilterChange,
  sortBy,
  onSortByChange,
}: PendingFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="搜尋待確認事項..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-3">
        {/* Waiting On Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={waitingOnFilter} onValueChange={onWaitingOnFilterChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="等待對象" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部對象</SelectItem>
              <SelectItem value="client">等待客戶</SelectItem>
              <SelectItem value="internal">等待內部</SelectItem>
              <SelectItem value="external">等待外部</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quick Filter */}
        <Select value={quickFilter} onValueChange={onQuickFilterChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="快捷篩選" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="overdue">逾期未回覆</SelectItem>
            <SelectItem value="recent">最近新增</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort By */}
        <Select value={sortBy} onValueChange={onSortByChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="排序方式" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="overdue">逾期優先</SelectItem>
            <SelectItem value="waiting_days">等待最久</SelectItem>
            <SelectItem value="due_date">期限優先</SelectItem>
            <SelectItem value="recent">最近新增</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
