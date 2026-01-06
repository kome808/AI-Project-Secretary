import React from 'react';
import { Search, ListFilter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DecisionFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTypes: string[];
  onTypeToggle: (type: string) => void;
  selectedCategories: string[];
  onCategoryToggle: (category: string) => void;
  selectedScopes: string[];
  onScopeToggle: (scope: string) => void;
  selectedStatuses: string[];
  onStatusToggle: (status: string) => void;
}

export const CATEGORIES = [
  { id: 'technical', name: '技術' },
  { id: 'business', name: '業務' },
  { id: 'ui_ux', name: 'UI/UX' },
  { id: 'process', name: '流程' },
  { id: 'other', name: '其他' },
];

export const SCOPES = [
  { id: 'global', name: '全專案 (Global)' },
  { id: 'module', name: '模組 (Module)' },
  { id: 'page', name: '頁面 (Page)' },
];

export const STATUSES = [
  { id: 'active', name: '生效中 (Active)' },
  { id: 'deprecated', name: '已停用 (Deprecated)' },
];

export function DecisionFilters({
  searchQuery,
  onSearchChange,
  selectedTypes = [],
  onTypeToggle,
  selectedCategories = [],
  onCategoryToggle,
  selectedScopes = [],
  onScopeToggle,
  selectedStatuses = [],
  onStatusToggle,
}: DecisionFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜尋決議標題、內容或原文片段..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-11 bg-background shadow-inner"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Type Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 h-11 px-4 border-dashed hover:border-primary/50 transition-colors">
              <ListFilter className="h-4 w-4" />
              類型
              {(selectedTypes?.length || 0) > 0 && (
                <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  {selectedTypes.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>過濾類型</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={selectedTypes.includes('decision')}
              onCheckedChange={() => onTypeToggle('decision')}
            >
              決議 (Decision)
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={selectedTypes.includes('rule')}
              onCheckedChange={() => onTypeToggle('rule')}
            >
              規則 (Rule)
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Category Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 h-11 px-4 border-dashed hover:border-primary/50 transition-colors">
              <ListFilter className="h-4 w-4" />
              類別
              {(selectedCategories?.length || 0) > 0 && (
                <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  {selectedCategories.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs">過濾類別</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {CATEGORIES.map((cat) => (
              <DropdownMenuCheckboxItem
                key={cat.id}
                checked={selectedCategories.includes(cat.id)}
                onCheckedChange={() => onCategoryToggle(cat.id)}
                className="text-xs"
              >
                {cat.name}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Scope Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 h-11 px-4 border-dashed hover:border-primary/50 transition-colors">
              <ListFilter className="h-4 w-4" />
              範圍
              {(selectedScopes?.length || 0) > 0 && (
                <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  {selectedScopes.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs">過濾適用範圍</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {SCOPES.map((s) => (
              <DropdownMenuCheckboxItem
                key={s.id}
                checked={selectedScopes.includes(s.id)}
                onCheckedChange={() => onScopeToggle(s.id)}
                className="text-xs"
              >
                {s.name}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Status Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 h-11 px-4 border-dashed hover:border-primary/50 transition-colors">
              <ListFilter className="h-4 w-4" />
              狀態
              {(selectedStatuses?.length || 0) > 0 && (
                <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  {selectedStatuses.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs">過濾狀態</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {STATUSES.map((s) => (
              <DropdownMenuCheckboxItem
                key={s.id}
                checked={selectedStatuses.includes(s.id)}
                onCheckedChange={() => onStatusToggle(s.id)}
                className="text-xs"
              >
                {s.name}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}