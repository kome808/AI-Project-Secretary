import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDrag, useDrop } from 'react-dnd';
import { ChevronDown, ChevronRight, User, Calendar, MoreVertical, Edit, Trash2, Plus, GripVertical, ExternalLink, Layers } from 'lucide-react';
import { Item, Member } from '../../../lib/storage/types';
import { ItemCard } from './ItemCard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { STATUS_LABELS, getStatusColor, getStatusLabel } from '../../../lib/storage/statusHelpers';

const DEFAULT_ACCEPT_TYPES = ['WBS_CARD', 'TASK_CARD'];
const UNIVERSAL_DND_TYPE = 'UNIVERSAL_DND_ITEM';

interface DraggableWBSCardProps {
  item: Item;
  members: Member[];
  isExpanded: boolean;
  level: number;
  hasChildren: boolean;
  onToggleExpand: (itemId: string) => void;
  onItemUpdate: (itemId: string, updates: Partial<Item>) => Promise<boolean>;
  onEditItem: (item: Item) => void;
  onDeleteItem: (itemId: string) => Promise<boolean>;
  onMoveItem: (draggedId: string, targetId: string, position: 'before' | 'after' | 'inside') => void;
  onAddSubTask?: (parentItem: Item) => void;
  renderChildren?: () => React.ReactNode;
  renderMainContent?: () => React.ReactNode;
  renderExtraInfo?: () => React.ReactNode; // New prop for extra info badges
  dndType?: string;
  acceptTypes?: string[];
  hideStatus?: boolean; // Option to hide status if needed
  showType?: boolean;
  extraBadge?: React.ReactNode;
}

export function DraggableWBSCard({
  item,
  members,
  isExpanded,
  level,
  hasChildren,
  onToggleExpand,
  onItemUpdate,
  onEditItem,
  onDeleteItem,
  onMoveItem,
  onAddSubTask,
  renderChildren,
  renderMainContent,
  renderExtraInfo,
  dndType = UNIVERSAL_DND_TYPE,
  acceptTypes = [UNIVERSAL_DND_TYPE],
  hideStatus = false,
  showType = true,
  extraBadge,
}: DraggableWBSCardProps) {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'inside' | null>(null);

  // Navigate to task detail page
  const handleViewDetails = () => {
    navigate(`/tasks/${item.id}`);
  };

  // Drag functionality
  const [{ isDragging }, drag, dragPreview] = useDrag(() => ({
    type: UNIVERSAL_DND_TYPE, // Force universal type to ensure compatibility
    item: { id: item.id, parentId: item.parent_id, level, type: dndType }, // Keep original type in payload
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [item.id, item.parent_id, level, dndType]);

  // Drop functionality
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: [UNIVERSAL_DND_TYPE], // Accept universal type
    hover: (draggedItem: { id: string; parentId?: string | null; level?: number; type?: string }, monitor) => {
      if (draggedItem.id === item.id) {
        setDropPosition(null);
        return;
      }

      if (!cardRef.current) {
        setDropPosition(null);
        return;
      }

      const hoverBoundingRect = cardRef.current.getBoundingClientRect();
      const clientOffset = monitor.getClientOffset();

      if (!clientOffset) {
        setDropPosition(null);
        return;
      }

      const hoverClientY = clientOffset.y - hoverBoundingRect.top;
      const hoverHeight = hoverBoundingRect.height;

      // 計算拖放區域
      // 判斷被拖曳項目與目標項目的關係
      const draggedParentId = draggedItem.parentId ?? null;
      const targetParentId = item.parent_id ?? null;

      // 判斷是否為同一個父項目（注意：null == null 要算作相同）
      const isSameParent = draggedParentId === targetParentId;

      // 判斷是否為 WorkPackage（專案工作）
      const isWorkPackage = item.meta?.isWorkPackage === true;
      const draggedIsWorkPackage = draggedItem.type === 'WORK_PACKAGE';

      // 判斷是否為第一層項目
      const isLevel1 = level === 1;
      const draggedIsLevel1 = (draggedItem.level || 2) === 1;

      // 計算區域
      // 區域計算邏輯：
      // 1. 如果是 WorkPackage 之間的拖曳：50/50（只有 before/after，不允許巢狀）
      // 2. 如果是同一個父項目下的非第一層項目：50/50（只需重排序）
      // 3. 其他情況（包括第一層之間）：25/50/25（允許 before/inside/after）

      const isReorderingWorkPackages = isWorkPackage && draggedIsWorkPackage;

      // 決定使用哪種分割模式
      let useThreeZone = true;

      if (isReorderingWorkPackages) {
        // WorkPackage 之間不允許巢狀，只能排序
        useThreeZone = false;
      } else if (isSameParent && !isLevel1) {
        // 同父項目下的非第一層項目：只需排序
        // 注意：第一層項目之間要允許三區（拖到其他第一層的 before/after 進行排序，或 inside 變成子項目）
        useThreeZone = false;
      }
      // 第一層之間：使用三區，這樣既可以 before/after 排序，也可以 inside 變成子項目

      let newDropPosition: 'before' | 'after' | 'inside';

      if (useThreeZone) {
        // 25/50/25 三區分割
        const quarterHeight = hoverHeight / 4;

        if (hoverClientY < quarterHeight) {
          newDropPosition = 'before';
        } else if (hoverClientY > hoverHeight - quarterHeight) {
          newDropPosition = 'after';
        } else {
          newDropPosition = 'inside';
        }
      } else {
        // 50/50 split - 只有 before/after
        const hoverMiddleY = hoverHeight / 2;
        if (hoverClientY < hoverMiddleY) {
          newDropPosition = 'before';
        } else {
          newDropPosition = 'after';
        }
      }

      setDropPosition(newDropPosition);

      // Debug 日誌（可在瀏覽器控制台查看）
      console.log(`[DraggableWBSCard Hover] 
        拖曳: ${draggedItem.id} (Level ${draggedItem.level}, Parent: ${draggedParentId})
        目標: ${item.id} (Level ${level}, Parent: ${targetParentId})
        isSameParent: ${isSameParent}, isLevel1: ${isLevel1}, useThreeZone: ${useThreeZone}
        Position: ${newDropPosition}`);
    },
    drop: (draggedItem: { id: string; parentId?: string | null; level?: number; type?: string }, monitor) => {
      if (draggedItem.id === item.id) return;

      const position = dropPosition || 'after'; // 預設放到後面
      console.log(`[DraggableWBSCard] Drop 執行: ${draggedItem.id} -> ${item.id} (Position: ${position})`);
      onMoveItem(draggedItem.id, item.id, position);
      setDropPosition(null);
    },
    canDrop: (draggedItem: { id: string; parentId?: string | null; level?: number; type?: string }) => {
      // 基本檢查：不能拖到自己
      if (draggedItem.id === item.id) return false;
      return true;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  }), [item.id, item.parent_id, item.meta, onMoveItem, dropPosition, level]);

  // Combine refs - attach drop to card container, drag to handle only
  drop(cardRef);
  drag(dragHandleRef);

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // Get assignee name
  const getAssigneeName = () => {
    // Try both assignee_id (standard) and assignee (legacy/string)
    const assigneeId = item.assignee_id;
    if (!assigneeId) return '未指派';

    // Try to find by ID first, then email
    const member = members.find(m => m.id === assigneeId || m.email === assigneeId);
    return member?.name || assigneeId;
  };

  // Calculate overdue info
  const getDaysInfo = () => {
    // Don't show overdue for completed tasks (handle both new 'completed' and legacy 'done' status)
    const status = item.status as string;
    if (!item.due_date || status === 'completed' || status === 'done') return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(item.due_date);
    dueDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `逾期 ${Math.abs(diffDays)} 天`, isOverdue: true };
    } else if (diffDays === 0) {
      return { text: '今日到期', isToday: true };
    } else if (diffDays <= 3) {
      return { text: `${diffDays} 天後到期`, isSoon: true };
    }
    return null;
  };

  const daysInfo = getDaysInfo();

  // Get drop indicator classes
  const getDropIndicatorClass = () => {
    if (!isOver || !canDrop || !dropPosition) return '';

    if (dropPosition === 'before') {
      return 'border-t-2 border-primary';
    } else if (dropPosition === 'after') {
      return 'border-b-2 border-primary';
    } else {
      return 'ring-2 ring-primary ring-offset-2';
    }
  };

  // 🔥 統一 Header 渲染函數 (解決樣式跑位、負責人消失、箭頭外露問題)
  const renderHeader = () => {
    return (
      <div className="flex items-center gap-2 bg-card border border-border rounded-[var(--radius-lg)] px-4 py-3 hover:bg-muted/30 transition-colors relative">
        {/* 拖曳手柄 */}
        <div
          ref={dragHandleRef}
          className="shrink-0 cursor-grab active:cursor-grabbing hover:bg-muted/50 p-1 rounded transition-colors"
          title="拖曳以重新排序或移動"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* 展開/收合箭頭 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) {
              onToggleExpand(item.id);
            } else {
              onEditItem(item);
            }
          }}
          className="shrink-0 p-0.5 hover:bg-muted rounded transition-colors"
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <div className="h-4 w-4" /> // 佔位符
          )}
        </button>

        {/* 標題 - Click to navigate to detail page */}
        <div
          onClick={handleViewDetails}
          className="flex-1 flex items-center gap-2 min-w-0 cursor-pointer hover:text-primary transition-colors"
        >
          <span className="text-foreground truncate hover:underline">{item.title}</span>
          {extraBadge}
          {renderExtraInfo && renderExtraInfo()}
        </div>

        {/* 優先度/逾期標籤 (保持在原位) */}
        {(daysInfo || (item.priority && item.priority !== 'medium')) && (
          <div className="flex items-center gap-1.5 shrink-0">
            {item.priority && item.priority !== 'medium' && (
              <Badge
                variant="outline"
                className={`text-xs ${item.priority === 'high'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}
              >
                {item.priority === 'high' ? '高優先' : '低優先'}
              </Badge>
            )}

            {daysInfo && (
              <Badge
                variant="outline"
                className={`text-xs ${daysInfo.isOverdue ? 'bg-destructive/10 text-destructive border-destructive/30' :
                  daysInfo.isToday ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-blue-50 text-blue-700 border-blue-200'
                  }`}
              >
                {daysInfo.text}
              </Badge>
            )}
          </div>
        )}

        {/* 負責人 (確保存在) */}
        <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
          <User className="h-4 w-4" />
          <span className="text-sm">{getAssigneeName()}</span>
        </div>

        {/* 期限 */}
        {item.due_date && (
          <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">{formatDate(item.due_date)}</span>
          </div>
        )}

        {/* 狀態 */}
        {!hideStatus && (
          <Badge
            variant="outline"
            className={`h-7 px-2 font-medium shrink-0 ${getStatusColor(item.status)}`}
          >
            {getStatusLabel(item.status)}
          </Badge>
        )}

        {/* 增加子任務按鈕 (展開收合都在這裡顯示) */}
        {onAddSubTask && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onAddSubTask(item);
            }}
            variant="ghost"
            size="sm"
            className="shrink-0 h-7 px-2"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}

        {/* 更多選單 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="shrink-0 p-1 hover:bg-muted rounded transition-colors">
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleViewDetails}>
              <ExternalLink className="h-4 w-4 mr-2" />
              查看詳情
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEditItem(item)}>
              <Edit className="h-4 w-4 mr-2" />
              編輯
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              if (!confirm('確定要將此任務轉換為功能模組嗎？\n轉換後將移至「功能模組」頁面。')) return;
              onItemUpdate(item.id, {
                meta: { ...item.meta, isFeatureModule: true }
              }).then(() => toast.success('已轉換為功能模組'));
            }}>
              <Layers className="h-4 w-4 mr-2" />
              轉換為功能模組
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDeleteItem(item.id)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              刪除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <div
      ref={cardRef}
      className={`
        relative
        transition-all
        ${isDragging ? 'opacity-50' : 'opacity-100'}
        ${getDropIndicatorClass()}
      `}
    >
      {/* Container Group */}
      <div className="group relative">
        {/* 1. Header Card (Same Layout for Expanded/Collapsed) */}
        {renderHeader()}

        {/* 2. Children (Rendered BELOW the card, if expanded) */}
        {isExpanded && hasChildren && renderChildren && (
          <div className="mt-2">
            {renderChildren()}
          </div>
        )}
      </div>
    </div>
  );
}