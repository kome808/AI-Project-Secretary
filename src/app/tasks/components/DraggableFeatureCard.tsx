import React, { useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import {
    GripVertical, ChevronDown, ChevronRight, Layers, User, Calendar,
    MoreVertical, Edit, Briefcase, Trash2, Plus, ExternalLink
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Item, Member } from '../../../lib/storage/types';
import { getStatusColor, getStatusLabel } from '../../../lib/storage/statusHelpers';

const FEATURE_DND_TYPE = 'FEATURE_MODULE';

interface DraggableFeatureCardProps {
    feature: Item;
    level: number;
    members: Member[];
    isExpanded: boolean;
    hasChildren: boolean;
    onToggleExpand: (id: string) => void;
    onEdit: (feature: Item) => void;
    onConvert: (feature: Item) => void;
    onDelete: (id: string) => void;
    onMoveFeature: (draggedId: string, targetId: string, position: 'before' | 'after' | 'inside') => void;
    onCreateSubFeature: (parentId: string) => void;
    onViewDetails: (id: string) => void;
    renderChildren?: () => React.ReactNode;
    showCompleted: boolean;
}

export function DraggableFeatureCard({
    feature,
    level,
    members,
    isExpanded,
    hasChildren,
    onToggleExpand,
    onEdit,
    onConvert,
    onDelete,
    onMoveFeature,
    onCreateSubFeature,
    onViewDetails,
    renderChildren,
    showCompleted
}: DraggableFeatureCardProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'inside' | null>(null);

    const getMemberName = (memberId?: string) => {
        if (!memberId) return '未指派';
        const member = members.find(m => m.id === memberId);
        return member?.name || '未知';
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return null;
        return new Date(dateString).toLocaleDateString('zh-TW', {
            month: 'numeric',
            day: 'numeric'
        });
    };

    // Drag Logic
    const [{ isDragging }, drag] = useDrag(() => ({
        type: FEATURE_DND_TYPE,
        item: { id: feature.id, parentId: feature.parent_id },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }), [feature.id, feature.parent_id]);

    // Drop Logic
    const [, drop] = useDrop(() => ({
        accept: FEATURE_DND_TYPE,
        hover: (draggedItem: { id: string }, monitor) => {
            if (!ref.current) return;
            if (draggedItem.id === feature.id) {
                setDropPosition(null);
                return;
            }

            const hoverBoundingRect = ref.current.getBoundingClientRect();
            const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
            const clientOffset = monitor.getClientOffset();
            const hoverClientY = (clientOffset as any).y - hoverBoundingRect.top;

            // Define zones: Top 25% (Before), Middle 50% (Inside), Bottom 25% (After)
            const zoneHeight = (hoverBoundingRect.bottom - hoverBoundingRect.top);
            const insideZoneTop = zoneHeight * 0.25;
            const insideZoneBottom = zoneHeight * 0.75;

            if (hoverClientY < insideZoneTop) {
                setDropPosition('before');
            } else if (hoverClientY > insideZoneBottom) {
                setDropPosition('after');
            } else {
                setDropPosition('inside');
            }
        },
        drop: (draggedItem: { id: string }) => {
            if (dropPosition && draggedItem.id !== feature.id) {
                onMoveFeature(draggedItem.id, feature.id, dropPosition);
            }
            setDropPosition(null);
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
        }),
    }), [feature.id, dropPosition, onMoveFeature]);

    // Connect drag and drop refs
    drag(drop(ref));

    // Cleanup local state on drag leave (simulated by hover logic resetting, but could be cleaner)
    // For simplicity relying on hover.

    const status = feature.status as string;
    const isCompleted = status === 'completed' || status === 'done';

    // Logic moved from parent: hide completed if needed
    if (!showCompleted && isCompleted) return null;

    // Visual styles for drop indicator
    const getDropStyle = () => {
        switch (dropPosition) {
            case 'before': return 'border-t-2 border-t-primary';
            case 'after': return 'border-b-2 border-b-primary';
            case 'inside': return 'bg-primary/5 border-primary';
            default: return '';
        }
    };

    return (
        <div className="transition-all duration-300">
            <div
                ref={ref}
                className={`
                    bg-card border border-border rounded-[var(--radius-lg)] px-4 py-3 
                    hover:bg-muted/30 transition-colors flex items-center gap-2
                    ${isDragging ? 'opacity-50' : 'opacity-100'}
                    ${getDropStyle()}
                `}
                style={{ marginLeft: `${(level - 1) * 1.5}rem` }}
            >
                {/* Drag Handle */}
                <div className="shrink-0 cursor-grab hover:bg-muted/50 p-1 rounded">
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                </div>

                {/* Expand/Collapse */}
                <button
                    onClick={() => hasChildren && onToggleExpand(feature.id)}
                    className="shrink-0 p-0.5 hover:bg-muted rounded transition-colors"
                    style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
                >
                    {isExpanded ?
                        <ChevronDown className="h-4 w-4 text-muted-foreground" /> :
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    }
                </button>

                {/* Title */}
                <div
                    onClick={() => onViewDetails(feature.id)}
                    className="flex-1 flex items-center gap-2 min-w-0 cursor-pointer hover:text-primary transition-colors"
                >
                    <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-foreground truncate hover:underline">{feature.title}</span>
                </div>

                {/* Assignee */}
                <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                    <User className="h-4 w-4" />
                    <span className="text-sm">{getMemberName(feature.assignee_id)}</span>
                </div>

                {/* Due Date */}
                {feature.due_date && (
                    <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">{formatDate(feature.due_date)}</span>
                    </div>
                )}

                {/* Status */}
                <Badge
                    variant="outline"
                    className={`h-7 px-2 font-medium shrink-0 ${getStatusColor(feature.status)}`}
                >
                    {getStatusLabel(feature.status)}
                </Badge>

                {/* Add Sub-Feature */}
                <Button
                    onClick={(e) => {
                        e.stopPropagation();
                        onCreateSubFeature(feature.id);
                    }}
                    variant="ghost"
                    size="sm"
                    className="shrink-0 h-7 px-2"
                    title="新增子功能"
                >
                    <Plus className="h-4 w-4" />
                </Button>

                {/* More Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="shrink-0 p-1 hover:bg-muted rounded transition-colors">
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onViewDetails(feature.id)}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            查看詳情
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(feature)}>
                            <Edit className="h-4 w-4 mr-2" />
                            編輯
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onConvert(feature)}>
                            <Briefcase className="h-4 w-4 mr-2" />
                            轉換為一般任務
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => onDelete(feature.id)}
                            className="text-destructive"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            刪除
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Children */}
            {isExpanded && hasChildren && renderChildren && (
                <div className="mt-2 space-y-2">
                    {renderChildren()}
                </div>
            )}
        </div>
    );
}
