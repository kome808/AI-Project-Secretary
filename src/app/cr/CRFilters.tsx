import React from 'react';
import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert } from 'lucide-react';

interface CRFiltersProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusChange: (val: string) => void;
  riskFilter: string;
  onRiskChange: (val: string) => void;
}

export function CRFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  riskFilter,
  onRiskChange
}: CRFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4 bg-muted/30 p-4 rounded-xl border">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="搜尋變更標題或描述..." 
          className="pl-10"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      
      <div className="flex flex-wrap items-center gap-4">
        <div className="w-[180px]">
          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger>
              <SelectValue placeholder="狀態篩選" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有狀態</SelectItem>
              <SelectItem value="requested">已提出</SelectItem>
              <SelectItem value="reviewing">審核中</SelectItem>
              <SelectItem value="approved">已核准</SelectItem>
              <SelectItem value="rejected">已駁回</SelectItem>
              <SelectItem value="implemented">已實作</SelectItem>
              <SelectItem value="canceled">已取消</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-[180px]">
          <Select value={riskFilter} onValueChange={onRiskChange}>
            <SelectTrigger>
              <SelectValue placeholder="風險等級" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有風險</SelectItem>
              <SelectItem value="high">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-destructive" />
                  High Risk
                </div>
              </SelectItem>
              <SelectItem value="medium">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  Medium Risk
                </div>
              </SelectItem>
              <SelectItem value="low">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  Low Risk
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}