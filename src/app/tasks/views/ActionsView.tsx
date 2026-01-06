import React, { useState, useMemo } from 'react';
import { Calendar, Clock, Ban, Filter, RefreshCw } from 'lucide-react';
import { Item, Member } from '../../../lib/storage/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CompactItemCard } from '../components/CompactItemCard';
import { getStorageClient } from '../../../lib/storage';

interface ActionsViewProps {
  items: Item[];
  members: Member[];
  currentUser: any;
  loading: boolean;
  onItemUpdate: (itemId: string, updates: Partial<Item>) => Promise<boolean>;
  onRefresh: () => void;
}

type FilterType = 'all' | 'today' | 'week' | 'overdue' | 'blocked';

export function ActionsView({
  items,
  members,
  currentUser,
  loading,
  onItemUpdate,
  onRefresh
}: ActionsViewProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  const handleDeleteItem = async (itemId: string): Promise<boolean> => {
    const storage = getStorageClient();
    const { error } = await storage.deleteItem(itemId);

    if (!error) {
      onRefresh();
      return true;
    }
    return false;
  };

  const myActions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // 根據 rules.md：我的任務顯示 type='general' 且指派給當前使用者的任務
    return items
      .filter(item =>
        item.type === 'general' &&
        item.assignee_id === currentUser?.id &&
        item.status !== 'completed'  // 根據 rules.md：已完成不顯示
      )
      .map(item => {
        let isToday = false;
        let isWeek = false;
        let isOverdue = false;

        if (item.due_date) {
          const dueDate = new Date(item.due_date);
          dueDate.setHours(0, 0, 0, 0);

          isToday = dueDate.getTime() === today.getTime();
          isWeek = dueDate >= today && dueDate <= weekEnd;
          isOverdue = dueDate < today;
        }

        return {
          ...item,
          isToday,
          isWeek,
          isOverdue,
          isBlocked: item.status === 'blocked'  // 使用新的狀態值
        };
      })
      .sort((a, b) => {
        // Sort: overdue > blocked > today > week > others
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
        if (a.isBlocked !== b.isBlocked) return a.isBlocked ? -1 : 1;
        if (a.isToday !== b.isToday) return a.isToday ? -1 : 1;
        if (a.isWeek !== b.isWeek) return a.isWeek ? -1 : 1;

        // Then by due date
        if (a.due_date && b.due_date) {
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }
        if (a.due_date) return -1;
        if (b.due_date) return 1;

        return 0;
      });
  }, [items, currentUser]);

  const filteredActions = useMemo(() => {
    if (filter === 'all') return myActions;
    if (filter === 'today') return myActions.filter(a => a.isToday);
    if (filter === 'week') return myActions.filter(a => a.isWeek);
    if (filter === 'overdue') return myActions.filter(a => a.isOverdue);
    if (filter === 'blocked') return myActions.filter(a => a.isBlocked);
    return myActions;
  }, [myActions, filter]);

  const counts = {
    all: myActions.length,
    today: myActions.filter(a => a.isToday).length,
    week: myActions.filter(a => a.isWeek).length,
    overdue: myActions.filter(a => a.isOverdue).length,
    blocked: myActions.filter(a => a.isBlocked).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">
            <label>載入中...</label>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <div className="flex items-center gap-1 shrink-0">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <label className="text-muted-foreground">快速篩選：</label>
          </div>
          <Badge
            variant={filter === 'all' ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setFilter('all')}
          >
            全部 ({counts.all})
          </Badge>
          <Badge
            variant={filter === 'today' ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setFilter('today')}
          >
            <Calendar className="w-3 h-3 mr-1" />
            今日到期 ({counts.today})
          </Badge>
          <Badge
            variant={filter === 'week' ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setFilter('week')}
          >
            本週到期 ({counts.week})
          </Badge>
          <Badge
            variant={filter === 'overdue' ? 'default' : 'outline'}
            className={`cursor-pointer whitespace-nowrap ${counts.overdue > 0 ? 'bg-destructive/10 text-destructive border-destructive/30' : ''
              }`}
            onClick={() => setFilter('overdue')}
          >
            <Clock className="w-3 h-3 mr-1" />
            逾期 ({counts.overdue})
          </Badge>
          <Badge
            variant={filter === 'blocked' ? 'default' : 'outline'}
            className={`cursor-pointer whitespace-nowrap ${counts.blocked > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : ''
              }`}
            onClick={() => setFilter('blocked')}
          >
            <Ban className="w-3 h-3 mr-1" />
            卡關 ({counts.blocked})
          </Badge>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          <label>重新整理</label>
        </Button>
      </div>

      {/* Actions List */}
      {filteredActions.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center space-y-3">
              <div className="text-6xl">🎉</div>
              <div>
                <p className="text-muted-foreground">
                  <label>
                    {filter === 'all'
                      ? '太好了！目前沒有指派給您的任務'
                      : `沒有符合「${filter === 'today' ? '今日到期' :
                        filter === 'week' ? '本週到期' :
                          filter === 'overdue' ? '逾期' :
                            '卡關'
                      }」的任務`
                    }
                  </label>
                </p>
                {filter === 'all' && (
                  <label className="text-muted-foreground opacity-70">
                    新任務會在這裡出現
                  </label>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredActions.map(item => (
            <div key={item.id} id={`task-${item.id}`} className="transition-all duration-300">
              <CompactItemCard
                item={item}
                members={members}
                onUpdate={onItemUpdate}
                onEdit={() => {
                  // TODO: 實作編輯功能
                  console.log('編輯任務:', item);
                }}
                onDelete={() => handleDeleteItem(item.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}