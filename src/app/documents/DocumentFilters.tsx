import React from 'react';
import { Search, ListFilter, Calendar, Hash, Archive } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArtifactType } from '@/lib/storage/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface DocumentFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTypes: ArtifactType[];
  onTypeChange: (types: ArtifactType[]) => void;
  selectedChannels: string[];
  onChannelChange: (channels: string[]) => void;
  usageFilter: 'all' | 'with_usage' | 'no_usage';
  onUsageFilterChange: (filter: 'all' | 'with_usage' | 'no_usage') => void;
  dateFilter: 'all' | 'today' | 'week';
  onDateFilterChange: (filter: 'all' | 'today' | 'week') => void;
  showArchived: boolean;
  onShowArchivedChange: (show: boolean) => void;
}

export function DocumentFilters({
  searchQuery,
  onSearchChange,
  selectedTypes,
  onTypeChange,
  selectedChannels,
  onChannelChange,
  usageFilter,
  onUsageFilterChange,
  dateFilter,
  onDateFilterChange,
  showArchived,
  onShowArchivedChange
}: DocumentFiltersProps) {
  const types: { value: ArtifactType; label: string }[] = [
    { value: 'text', label: '文字內容' },
    { value: 'file', label: '檔案文件' },
    { value: 'image', label: '圖片影像' },
    { value: 'link', label: '外部連結' },
    { value: 'conversation', label: '對話串' },
  ];

  const channels = [
    { value: 'line', label: 'LINE' },
    { value: 'email', label: 'Email' },
    { value: 'meeting', label: '會議錄' },
    { value: 'upload', label: '上傳' },
    { value: 'paste', label: '貼上' },
  ];

  const toggleType = (type: ArtifactType) => {
    if (selectedTypes.includes(type)) {
      onTypeChange(selectedTypes.filter((t) => t !== type));
    } else {
      onTypeChange([...selectedTypes, type]);
    }
  };

  const toggleChannel = (channel: string) => {
    if (selectedChannels.includes(channel)) {
      onChannelChange(selectedChannels.filter((c) => c !== channel));
    } else {
      onChannelChange([...selectedChannels, channel]);
    }
  };

  const activeFiltersCount = 
    selectedTypes.length + 
    selectedChannels.length + 
    (usageFilter !== 'all' ? 1 : 0) + 
    (dateFilter !== 'all' ? 1 : 0);

  return (
    <div className="space-y-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜尋文件內容或來源資訊..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* Type Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ListFilter className="h-4 w-4" />
                類型
                {selectedTypes.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                    {selectedTypes.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>依類型篩選</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {types.map((type) => (
                <DropdownMenuCheckboxItem
                  key={type.value}
                  checked={selectedTypes.includes(type.value)}
                  onCheckedChange={() => toggleType(type.value)}
                >
                  {type.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Channel Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                通路
                {selectedChannels.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                    {selectedChannels.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>來源通路</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {channels.map((channel) => (
                <DropdownMenuCheckboxItem
                  key={channel.value}
                  checked={selectedChannels.includes(channel.value)}
                  onCheckedChange={() => toggleChannel(channel.value)}
                >
                  {channel.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Usage Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                引用狀態
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>引用數篩選</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={usageFilter} onValueChange={(v) => onUsageFilterChange(v as any)}>
                <DropdownMenuRadioItem value="all">全部</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="with_usage">已有引用</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="no_usage">無引用</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Date Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                時間
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>建立時間</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={dateFilter} onValueChange={(v) => onDateFilterChange(v as any)}>
                <DropdownMenuRadioItem value="all">全部</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="today">今天新增</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="week">本週新增</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Archived Toggle */}
          <Button 
            variant={showArchived ? "secondary" : "outline"} 
            size="sm"
            onClick={() => onShowArchivedChange(!showArchived)}
            className="flex items-center gap-2"
          >
            <Archive className="h-4 w-4" />
            已封存
          </Button>

          {(activeFiltersCount > 0 || searchQuery) && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                onSearchChange('');
                onTypeChange([]);
                onChannelChange([]);
                onUsageFilterChange('all');
                onDateFilterChange('all');
              }}
              className="text-muted-foreground"
            >
              清除篩選
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}