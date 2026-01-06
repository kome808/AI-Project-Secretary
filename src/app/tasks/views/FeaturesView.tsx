import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Plus, RefreshCw, Eye, EyeOff, Layers } from 'lucide-react';
import { Item, Member } from '../../../lib/storage/types';
import { DraggableFeatureCard } from '../components/DraggableFeatureCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useProject } from '../../context/ProjectContext';
import { getStorageClient } from '../../../lib/storage';
import { toast } from 'sonner';
import { STATUS_OPTIONS } from '../../../lib/storage/statusHelpers';

interface FeaturesViewProps {
    items: Item[];
    members: Member[];
    loading: boolean;
    onItemUpdate: (itemId: string, updates: Partial<Item>) => Promise<boolean>;
    onRefresh: () => void;
}

export function FeaturesView({
    items,
    members,
    loading,
    // onItemUpdate,
    onRefresh
}: FeaturesViewProps) {
    const navigate = useNavigate();
    const { currentProject } = useProject();
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [showCompleted, setShowCompleted] = useState(() => {
        return localStorage.getItem('features_showCompleted') === 'true';
    });
    const [showFeatureDialog, setShowFeatureDialog] = useState(false);
    const [editingFeature, setEditingFeature] = useState<Item | undefined>(undefined);
    const [editingParentId, setEditingParentId] = useState<string | undefined>(undefined);

    // Filter feature modules (items with meta.isFeatureModule = true)
    const featureModules = useMemo(() => {
        return items
            .filter(item => item.meta?.isFeatureModule === true && !item.parent_id)
            .sort((a, b) => {
                const orderA = a.meta?.order ?? new Date(a.created_at).getTime();
                const orderB = b.meta?.order ?? new Date(b.created_at).getTime();
                return orderA - orderB;
            });
    }, [items]);

    const getChildFeatures = useCallback((parentId: string) => {
        return items
            .filter(item => item.parent_id === parentId)
            .sort((a, b) => {
                const orderA = a.meta?.order ?? new Date(a.created_at).getTime();
                const orderB = b.meta?.order ?? new Date(b.created_at).getTime();
                return orderA - orderB;
            });
    }, [items]);

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
        localStorage.setItem('features_showCompleted', String(newValue));
    };

    const handleCreateFeature = (parentId?: string) => {
        setEditingFeature(undefined);
        setEditingParentId(parentId);
        setShowFeatureDialog(true);
    };

    const handleEditFeature = (feature: Item) => {
        setEditingFeature(feature);
        setEditingParentId(undefined);
        setShowFeatureDialog(true);
    };

    const handleSaveFeature = async (data: { title: string; description: string; assignee_id?: string; due_date?: string; status?: string }) => {
        const storage = getStorageClient();
        const projectId = currentProject?.id;
        if (!projectId) {
            toast.error('找不到專案 ID');
            return false;
        }

        try {
            if (editingFeature) {
                // Update existing
                const { error } = await storage.updateItem(editingFeature.id, {
                    title: data.title,
                    description: data.description,
                    assignee_id: data.assignee_id,
                    due_date: data.due_date,
                    status: data.status as any,
                    updated_at: new Date().toISOString(),
                });
                if (error) throw error;
                toast.success('功能模組已更新');
            } else {
                // Create new
                const newItem: Partial<Item> = {
                    project_id: projectId,
                    type: 'general',
                    title: data.title,
                    description: data.description,
                    assignee_id: data.assignee_id,
                    due_date: data.due_date,
                    status: (data.status as any) || 'not_started',
                    parent_id: editingParentId,
                    meta: {
                        isFeatureModule: true,
                        order: Date.now(),
                    }
                };

                const { error } = await storage.createItem(newItem as Item);
                if (error) throw error;
                toast.success('功能模組已建立');
            }

            onRefresh();
            setShowFeatureDialog(false);
            return true;
        } catch (error) {
            console.error('Error saving feature:', error);
            toast.error('儲存失敗');
            return false;
        }
    };

    const handleConvertToTask = async (feature: Item) => {
        if (!confirm('確定要將此功能模組轉換為一般任務嗎？\n轉換後將移至「專案工作」頁面。')) return;

        const storage = getStorageClient();
        try {
            await storage.updateItem(feature.id, {
                meta: { ...feature.meta, isFeatureModule: false }
            });
            toast.success('已轉換為一般任務');
            onRefresh();
        } catch (error) {
            console.error('Error converting feature:', error);
            toast.error('轉換失敗');
        }
    };

    const handleMoveFeature = async (draggedId: string, targetId: string, position: 'before' | 'after' | 'inside') => {
        if (draggedId === targetId) return;

        const draggedItem = items.find(i => i.id === draggedId);
        const targetItem = items.find(i => i.id === targetId);

        if (!draggedItem || !targetItem) return;

        const storage = getStorageClient();
        let newParentId = draggedItem.parent_id;
        let newOrder = draggedItem.meta?.order || Date.now();

        if (position === 'inside') {
            newParentId = targetId;
            newOrder = Date.now(); // Put at end
        } else {
            newParentId = targetItem.parent_id;

            // Calculate Order
            const siblings = items
                .filter(i => i.parent_id === newParentId)
                .sort((a, b) => {
                    const orderA = a.meta?.order ?? new Date(a.created_at).getTime();
                    const orderB = b.meta?.order ?? new Date(b.created_at).getTime();
                    return orderA - orderB;
                });

            const targetIndex = siblings.findIndex(i => i.id === targetId);
            const targetOrder = targetItem.meta?.order ?? new Date(targetItem.created_at).getTime();

            if (position === 'before') {
                const prevItem = siblings[targetIndex - 1];
                const prevOrder = prevItem ? (prevItem.meta?.order ?? new Date(prevItem.created_at).getTime()) : (targetOrder - 100000);
                newOrder = (prevOrder + targetOrder) / 2;
            } else { // after
                const nextItem = siblings[targetIndex + 1];
                const nextOrder = nextItem ? (nextItem.meta?.order ?? new Date(nextItem.created_at).getTime()) : (targetOrder + 100000);
                newOrder = (targetOrder + nextOrder) / 2;
            }
        }

        try {
            await storage.updateItem(draggedId, {
                parent_id: newParentId,
                meta: { ...draggedItem.meta, order: newOrder }
            });
            onRefresh();
        } catch (e) {
            console.error('Move failed', e);
            toast.error('移動失敗');
        }
    };

    const handleDeleteFeature = async (featureId: string) => {
        if (!confirm('確定要刪除此功能模組嗎？')) return false;

        const storage = getStorageClient();
        try {
            const { error } = await storage.deleteItem(featureId);
            if (error) throw error;
            toast.success('功能模組已刪除');
            onRefresh();
            return true;
        } catch (error) {
            console.error('Error deleting feature:', error);
            toast.error('刪除失敗');
            return false;
        }
    };

    const handleViewDetails = (featureId: string) => {
        navigate(`/features/${featureId}`);
    };



    // Render feature card using Draggable Component
    const renderFeatureCard = (feature: Item, level: number = 1) => {
        const children = getChildFeatures(feature.id);
        const hasChildren = children.length > 0;
        const isExpanded = expandedGroups.has(feature.id);

        return (
            <DraggableFeatureCard
                key={feature.id}
                feature={feature}
                level={level}
                members={members}
                isExpanded={isExpanded}
                hasChildren={hasChildren}
                onToggleExpand={toggleGroup}
                onEdit={handleEditFeature}
                onConvert={handleConvertToTask}
                onDelete={handleDeleteFeature}
                onMoveFeature={handleMoveFeature}
                onCreateSubFeature={handleCreateFeature}
                onViewDetails={handleViewDetails}
                showCompleted={showCompleted}
                renderChildren={() => (
                    <>
                        {children.map(child => renderFeatureCard(child, level + 1))}
                    </>
                )}
            />
        );
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
        <DndProvider backend={HTML5Backend}>
            <div className="space-y-6">
                {/* Toolbar */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleCreateFeature()}
                            className="gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            新增功能模組
                        </Button>

                        <Button
                            variant={showCompleted ? 'default' : 'outline'}
                            size="sm"
                            onClick={toggleShowCompleted}
                        >
                            {showCompleted ? (
                                <Eye className="h-4 w-4 mr-2" />
                            ) : (
                                <EyeOff className="h-4 w-4 mr-2" />
                            )}
                            <label>{showCompleted ? '隱藏已完成' : '顯示已完成'}</label>
                        </Button>
                    </div>

                    <Button variant="ghost" size="sm" onClick={onRefresh}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        重新整理
                    </Button>
                </div>

                {/* Feature List */}
                {featureModules.length === 0 ? (
                    <Card>
                        <CardContent className="py-16">
                            <div className="text-center space-y-3">
                                <Layers className="h-16 w-16 mx-auto text-muted-foreground opacity-30" />
                                <div>
                                    <p className="text-muted-foreground">
                                        <label>目前沒有功能模組</label>
                                    </p>
                                    <p className="text-muted-foreground text-sm">
                                        <label>點擊上方「新增功能模組」按鈕開始建立</label>
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {featureModules.map(feature => renderFeatureCard(feature))}
                    </div>
                )}
            </div>

            {/* Feature Edit Dialog */}
            <FeatureEditDialog
                feature={editingFeature}
                members={members}
                open={showFeatureDialog}
                onOpenChange={setShowFeatureDialog}
                onSave={handleSaveFeature}
            />
        </DndProvider>
    );
}

// Feature Edit Dialog Component
interface FeatureEditDialogProps {
    feature?: Item;
    members: Member[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (data: { title: string; description: string; assignee_id?: string; due_date?: string; status?: string }) => Promise<boolean>;
}

function FeatureEditDialog({ feature, members, open, onOpenChange, onSave }: FeatureEditDialogProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [assigneeId, setAssigneeId] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [status, setStatus] = useState('not_started');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (feature) {
            setTitle(feature.title);
            setDescription(feature.description || '');
            setAssigneeId(feature.assignee_id || '');
            setDueDate(feature.due_date ? feature.due_date.split('T')[0] : '');
            setStatus(feature.status || 'not_started');
        } else {
            setTitle('');
            setDescription('');
            setAssigneeId('');
            setDueDate('');
            setStatus('not_started');
        }
    }, [feature, open]);

    const handleSubmit = async () => {
        if (!title.trim()) {
            toast.error('請輸入功能名稱');
            return;
        }

        setSaving(true);
        const success = await onSave({
            title: title.trim(),
            description: description.trim(),
            assignee_id: assigneeId || undefined,
            due_date: dueDate || undefined,
            status,
        });
        setSaving(false);

        if (success) {
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{feature ? '編輯功能模組' : '新增功能模組'}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">功能名稱 *</label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="例如：使用者登入模組"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">說明</label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="功能簡述..."
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">負責人</label>
                            <Select value={assigneeId} onValueChange={(v) => setAssigneeId(v === 'none' ? '' : v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="選擇負責人" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">未指派</SelectItem>
                                    {members.map(m => (
                                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">到期日</label>
                            <Input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">狀態</label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {STATUS_OPTIONS.filter(opt =>
                                    ['not_started', 'in_progress', 'blocked', 'awaiting_response', 'completed'].includes(opt.value)
                                ).map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                        取消
                    </Button>
                    <Button onClick={handleSubmit} disabled={saving}>
                        {saving ? '儲存中...' : '儲存'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
