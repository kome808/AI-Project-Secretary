import React, { useState, useMemo } from 'react';
import { Item, ItemStatus, ItemPriority } from '../../lib/storage/types';
import { ActionFilters } from './ActionFilters';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, User, AlertCircle, Loader2 } from 'lucide-react';
import { ActionDetail } from './ActionDetail';
import { getStorageClient } from '../../lib/storage';
import { Member } from '../../lib/storage/types';
import { useProject } from '../context/ProjectContext';

interface ActionsListProps {
  items: Item[];
  onUpdate: () => void;
}

export function ActionsList({ items, onUpdate }: ActionsListProps) {
  const { currentProject } = useProject();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<ItemPriority | 'all'>('all');
  const [dueDateFilter, setDueDateFilter] = useState<'all' | 'overdue' | 'today' | 'week'>('all');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  React.useEffect(() => {
    if (currentProject) {
      loadMembers();
    }
  }, [currentProject]);

  const loadMembers = async () => {
    const storage = getStorageClient();
    const { data } = await storage.getMembers(currentProject!.id);
    if (data) setMembers(data);
  };

  // Filter and search logic
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

      // Priority filter
      const matchesPriority = priorityFilter === 'all' || item.priority === priorityFilter;

      // Due date filter
      let matchesDueDate = true;
      if (dueDateFilter !== 'all' && item.due_date) {
        const dueDate = new Date(item.due_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);

        if (dueDateFilter === 'overdue') {
          matchesDueDate = dueDate < today;
        } else if (dueDateFilter === 'today') {
          matchesDueDate = dueDate >= today && dueDate < tomorrow;
        } else if (dueDateFilter === 'week') {
          matchesDueDate = dueDate >= today && dueDate < weekEnd;
        }
      } else if (dueDateFilter !== 'all') {
        matchesDueDate = false;
      }

      return matchesSearch && matchesStatus && matchesPriority && matchesDueDate;
    });
  }, [items, searchQuery, statusFilter, priorityFilter, dueDateFilter]);

  const getStatusBadgeVariant = (status: ItemStatus) => {
    switch (status) {
      case 'done':
        return 'default';
      case 'in_progress':
        return 'secondary';
      case 'blocked':
        return 'destructive';
      case 'pending':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusStyle = (status: ItemStatus) => {
    switch (status) {
      case 'done':
        return 'bg-[var(--chart-4)] text-white border-transparent';
      case 'in_progress':
        return 'bg-[var(--accent)] text-white border-transparent';
      case 'blocked':
        return 'bg-[var(--destructive)] text-white border-transparent';
      case 'pending':
        return 'bg-[var(--chart-5)] text-white border-transparent';
      default:
        return 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]';
    }
  };

  const getStatusLabel = (status: ItemStatus) => {
    const labels: Record<ItemStatus, string> = {
      suggestion: '建議',
      open: '待處理',
      in_progress: '進行中',
      pending: '等待中',
      blocked: '已阻塞',
      done: '已完成',
    };
    return labels[status] || status;
  };

  const getPriorityBadgeVariant = (priority?: ItemPriority) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getPriorityLabel = (priority?: ItemPriority) => {
    const labels: Record<ItemPriority, string> = {
      high: '高',
      medium: '中',
      low: '低',
    };
    return priority ? labels[priority] : '未設定';
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(dueDate) < today;
  };

  const getAssigneeName = (id?: string) => {
    if (!id) return '未指派';
    const member = members.find(m => m.id === id);
    return member ? member.name : id;
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <ActionFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        priorityFilter={priorityFilter}
        onPriorityChange={setPriorityFilter}
        dueDateFilter={dueDateFilter}
        onDueDateChange={setDueDateFilter}
      />

      {/* Results Count */}
      <div className="text-[var(--muted-foreground)] text-sm font-medium flex items-center justify-between">
        <span>共 {filteredItems.length} 筆任務</span>
      </div>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-[var(--muted)]/20 border-2 border-dashed border-[var(--border)] rounded-[var(--radius-lg)]">
          <FileText className="h-12 w-12 text-[var(--muted-foreground)] mb-4 opacity-20" />
          <p className="text-[var(--muted-foreground)]">沒有符合條件的任務</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-lg)] hover:shadow-[var(--elevation-sm)] hover:border-[var(--accent)]/30 transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-6">
                {/* Left: Main Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <h3 className="text-lg font-bold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors truncate">
                      {item.title}
                    </h3>
                    <Badge className={`text-[10px] px-2 py-0 h-5 font-bold uppercase tracking-wider ${getStatusStyle(item.status)}`}>
                      {getStatusLabel(item.status)}
                    </Badge>
                    {item.priority && (
                      <Badge variant={getPriorityBadgeVariant(item.priority)} className="text-[10px] px-2 py-0 h-5 font-bold uppercase">
                        {getPriorityLabel(item.priority)} 優先級
                      </Badge>
                    )}
                    {item.meta?.tags && Array.isArray(item.meta.tags) && item.meta.tags.length > 0 && (
                      item.meta.tags.map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-[10px] px-2 py-0 h-5 border-[var(--border)] text-[var(--muted-foreground)]">
                          {tag}
                        </Badge>
                      ))
                    )}
                  </div>
                  <p className="text-[var(--muted-foreground)] line-clamp-2 text-sm leading-relaxed mb-4">
                    {item.description}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
                    {item.assignee_id && (
                      <div className="flex items-center gap-1.5 bg-[var(--muted)] px-2 py-1 rounded-[var(--radius-sm)]">
                        <User className="h-3.5 w-3.5" />
                        <span className="font-medium">{getAssigneeName(item.assignee_id)}</span>
                      </div>
                    )}
                    {item.due_date && (
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-sm)] ${isOverdue(item.due_date) ? 'bg-[var(--destructive)]/10 text-[var(--destructive)] font-bold' : 'bg-[var(--muted)]'}`}>
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{new Date(item.due_date).toLocaleDateString()} 到期</span>
                        {isOverdue(item.due_date) && <AlertCircle className="h-3.5 w-3.5" />}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Evidence Info */}
                {item.source_artifact_id && (
                  <div className="shrink-0 pt-1">
                    <div className="flex flex-col items-center gap-1 text-[var(--accent)] bg-[var(--accent)]/5 p-3 rounded-[var(--radius-lg)] border border-[var(--accent)]/10">
                      <FileText className="h-5 w-5" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.1em]">SSOT</span>
                      <span className="text-[9px] text-[var(--muted-foreground)] font-normal">具備證據</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      {selectedItem && (
        <ActionDetail
          item={selectedItem}
          open={!!selectedItem}
          onOpenChange={(open) => !open && setSelectedItem(null)}
          onUpdate={() => {
            setSelectedItem(null);
            onUpdate();
          }}
        />
      )}
    </div>
  );
}