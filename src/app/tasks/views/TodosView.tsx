import React, { useState, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { RefreshCw, ListChecks, Plus, Eye, EyeOff, Calendar } from 'lucide-react';
import { Item, Member } from '../../../lib/storage/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DraggableWBSCard } from '../components/DraggableWBSCard';
import { ItemEditDialog } from '../components/ItemEditDialog';
import { getStorageClient } from '../../../lib/storage';
import { useProject } from '@/app/context/ProjectContext';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface TodosViewProps {
    items: Item[];
    members: Member[];
    loading: boolean;
    onItemUpdate: (itemId: string, updates: Partial<Item>) => Promise<boolean>;
    onRefresh: () => void;
}

export function TodosView({
    items,
    members,
    loading,
    onItemUpdate,
    onRefresh
}: TodosViewProps) {
    const { currentProject } = useProject();
    const [showCompleted, setShowCompleted] = useState<boolean>(() => {
        const saved = localStorage.getItem('todosView_showCompleted');
        return saved === 'true';
    });
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    // Dialog states
    const [showItemDialog, setShowItemDialog] = useState(false);
    const [editingItem, setEditingItem] = useState<Item | undefined>();
    const [editingItemParent, setEditingItemParent] = useState<string>('');

    // Filter items
    const visibleItems = useMemo(() => {
        // Only show items with type === 'todo'
        let filtered = items.filter(item => item.type === 'todo');

        if (!showCompleted) {
            filtered = filtered.filter(item => item.status !== 'completed');
        }
        return filtered;
    }, [items, showCompleted]);

    // Root items (no parent)
    const rootItems = useMemo(() => {
        return visibleItems
            .filter(item => !item.parent_id)
            .sort((a, b) => {
                const orderA = a.meta?.order ?? new Date(a.created_at).getTime();
                const orderB = b.meta?.order ?? new Date(b.created_at).getTime();
                return orderA - orderB;
            });
    }, [visibleItems]);

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) {
                next.delete(groupId);
            } else {
                next.add(groupId);
            }
            return next;
        });
    };

    const toggleShowCompleted = () => {
        const newValue = !showCompleted;
        setShowCompleted(newValue);
        localStorage.setItem('todosView_showCompleted', String(newValue));
    };

    // Item CRUD operations
    const handleAddItem = () => {
        setEditingItem(undefined);
        setEditingItemParent('');
        setShowItemDialog(true);
    };

    const handleEditItem = (item: Item) => {
        setEditingItem(item);
        setShowItemDialog(true);
    };

    const handleSaveItem = async (data: Partial<Item>) => {
        const storage = getStorageClient();
        const projectId = currentProject?.id;
        if (!projectId) {
            toast.error('找不到專案 ID');
            return false;
        }

        try {
            if (editingItem) {
                const { error } = await storage.updateItem(editingItem.id, {
                    ...data,
                    updated_at: new Date().toISOString(),
                });
                if (error) throw error;
                toast.success('待辦事項已更新');
            } else {
                const { error } = await storage.createItem({
                    project_id: projectId,
                    title: data.title!,
                    description: data.description,
                    type: 'todo', // Explicitly set type to 'todo'
                    status: data.status || 'not_started',
                    assignee_id: data.assignee_id,
                    due_date: data.due_date,
                    parent_id: editingItemParent,
                    meta: {
                        order: Date.now(),
                        source: '手動新增',
                    }
                } as Item);
                if (error) throw error;
                toast.success('待辦事項已建立');
            }

            onRefresh();
            return true;
        } catch (error) {
            console.error('Error saving item:', error);
            toast.error('儲存失敗');
            return false;
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        const storage = getStorageClient();
        try {
            const { error } = await storage.deleteItem(itemId);
            if (error) throw error;

            onRefresh();
            return true;
        } catch (error) {
            console.error('Error deleting item:', error);
            return false;
        }
    };

    // Handle adding sub-task
    const handleAddSubTask = (parentItem: Item) => {
        setEditingItem(undefined);
        setEditingItemParent(parentItem.id);
        setShowItemDialog(true);
    };

    // Handle move item (reorder)
    const handleMoveItem = async (draggedId: string, targetId: string, position: 'before' | 'after' | 'inside') => {
        // Similar logic to ProjectWorkView but simplified
        const draggedItem = items.find(i => i.id === draggedId);
        const targetItem = items.find(i => i.id === targetId);

        if (!draggedItem || !targetItem) return;

        if (position === 'inside') {
            await onItemUpdate(draggedId, {
                parent_id: targetId,
                meta: { ...draggedItem.meta, order: Date.now() }
            });
        } else {
            const targetParentId = targetItem.parent_id ?? null;
            // Get siblings
            const siblings = items
                .filter(i => {
                    const pId = i.parent_id ?? null;
                    return pId === targetParentId && i.id !== draggedId && i.type === 'todo';
                })
                .sort((a, b) => {
                    const orderA = a.meta?.order ?? new Date(a.created_at).getTime();
                    const orderB = b.meta?.order ?? new Date(b.created_at).getTime();
                    return orderA - orderB;
                });

            const targetIndex = siblings.findIndex(i => i.id === targetId);
            const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;

            const prevItem = siblings[insertIndex - 1];
            const nextItem = siblings[insertIndex];

            let newOrder: number;
            if (!prevItem) {
                newOrder = (nextItem?.meta?.order ?? Date.now()) - 1000;
            } else if (!nextItem) {
                newOrder = (prevItem?.meta?.order ?? Date.now()) + 1000;
            } else {
                const prevOrder = prevItem.meta?.order ?? new Date(prevItem.created_at).getTime();
                const nextOrder = nextItem.meta?.order ?? new Date(nextItem.created_at).getTime();
                newOrder = (prevOrder + nextOrder) / 2;
            }

            await onItemUpdate(draggedId, {
                parent_id: targetParentId as string, // Cast to string if needed, or null
                meta: { ...draggedItem.meta, order: newOrder }
            });
        }
        onRefresh();
    };

    // Recursive renderer
    const renderRecursiveItems = (parentId: string | null, level: number) => {
        const children = visibleItems
            .filter(i => {
                if (parentId === null) return !i.parent_id;
                return i.parent_id === parentId;
            })
            .sort((a, b) => {
                const orderA = a.meta?.order ?? new Date(a.created_at).getTime();
                const orderB = b.meta?.order ?? new Date(b.created_at).getTime();
                return orderA - orderB;
            });

        if (children.length === 0) return null;

        return (
            <div className="space-y-3">
                {children.map((child) => {
                    const hasChildren = visibleItems.some(i => i.parent_id === child.id);
                    const isExpanded = expandedGroups.has(child.id);

                    return (
                        <div key={child.id} id={`task-${child.id}`} className="relative transition-all duration-300">
                            {/* Indent Line */}
                            {level > 1 && (
                                <div
                                    className="absolute left-0 top-0 bottom-0 border-l-2 border-muted"
                                    style={{ marginLeft: `${(level - 1) * 1.5}rem` }}
                                />
                            )}

                            {/* Horizontal Line */}
                            <div style={{ marginLeft: `${level > 1 ? level * 1.5 : 0}rem` }} className="relative">
                                {level > 1 && (
                                    <div className="absolute left-0 top-1/2 w-4 border-t-2 border-muted" style={{ marginLeft: '-1.5rem' }} />
                                )}

                                <DraggableWBSCard
                                    item={child}
                                    members={members}
                                    isExpanded={isExpanded}
                                    level={level}
                                    hasChildren={hasChildren}
                                    onToggleExpand={() => toggleGroup(child.id)}
                                    onItemUpdate={onItemUpdate}
                                    onEditItem={handleEditItem}
                                    onDeleteItem={handleDeleteItem}
                                    onMoveItem={handleMoveItem}
                                    onAddSubTask={handleAddSubTask}
                                    renderChildren={() => renderRecursiveItems(child.id, level + 1)}
                                    renderExtraInfo={() => (
                                        child.meta?.source ? (
                                            <Badge variant="outline" className="text-xs text-muted-foreground bg-muted/30 ml-2">
                                                <Calendar className="w-3 h-3 mr-1" />
                                                {child.meta.source}
                                            </Badge>
                                        ) : null
                                    )}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="text-center space-y-3">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground">載入中...</p>
                </div>
            </div>
        );
    }

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="space-y-6">
                {/* Toolbar */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="default"
                            size="sm"
                            onClick={handleAddItem}
                            className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                        >
                            <Plus className="h-4 w-4" />
                            新增待辦事項
                        </Button>

                        <Button
                            variant={showCompleted ? 'default' : 'outline'}
                            size="sm"
                            onClick={toggleShowCompleted}
                        >
                            {showCompleted ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                            {showCompleted ? '隱藏已完成' : '顯示已完成'}
                        </Button>
                    </div>
                </div>

                {/* Content */}
                {rootItems.length === 0 ? (
                    <Card>
                        <CardContent className="py-16">
                            <div className="text-center space-y-3">
                                <ListChecks className="h-16 w-16 mx-auto text-muted-foreground opacity-30" />
                                <div>
                                    <p className="text-muted-foreground">目前沒有待辦事項</p>
                                    <p className="text-muted-foreground text-sm">
                                        點擊上方「新增待辦事項」或從會議記錄匯入
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {renderRecursiveItems(null, 1)}
                    </div>
                )}

                {/* Dialogs */}
                {showItemDialog && (
                    <ItemEditDialog
                        open={showItemDialog}
                        onOpenChange={setShowItemDialog}
                        item={editingItem}
                        workPackageId=""
                        mode={editingItem ? 'edit' : 'create'}
                        onSave={handleSaveItem}
                        members={members}
                    />
                )}
            </div>
        </DndProvider>
    );
}
