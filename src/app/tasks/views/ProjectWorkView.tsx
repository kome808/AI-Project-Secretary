import React, { useState, useMemo, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { RefreshCw, Briefcase, Plus, Eye, EyeOff } from 'lucide-react';
import { Item, Member, WorkPackage } from '../../../lib/storage/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DraggableWBSCard } from '../components/DraggableWBSCard';
import { WorkPackageEditDialog } from '../components/WorkPackageEditDialog';
import { ItemEditDialog } from '../components/ItemEditDialog';
import { WBSTreeGroup } from '../components/WBSTreeGroup';
import { getStorageClient } from '../../../lib/storage';
import { useProject } from '@/app/context/ProjectContext';
import { toast } from 'sonner';

interface ProjectWorkViewProps {
  items: Item[];
  members: Member[];
  loading: boolean;
  onItemUpdate: (itemId: string, updates: Partial<Item>) => Promise<boolean>;
  onRefresh: () => void;
}

const WP_ACCEPT_TYPES = ['WORK_PACKAGE', 'WBS_CARD', 'TASK_CARD'];

export function ProjectWorkView({
  items,
  members,
  loading,
  onItemUpdate,
  onRefresh
}: ProjectWorkViewProps) {
  const { currentProject } = useProject();
  const [showCompleted, setShowCompleted] = useState<boolean>(() => {
    const saved = localStorage.getItem('projectWork_showCompleted');
    return saved === 'true';
  });
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    // 默認展開未分類區塊
    return new Set(['uncategorized']);
  });

  // Dialog states
  const [showWorkPackageDialog, setShowWorkPackageDialog] = useState(false);
  const [editingWorkPackage, setEditingWorkPackage] = useState<WorkPackage | undefined>();
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | undefined>();
  const [targetWorkPackageId, setTargetWorkPackageId] = useState<string>('');
  const [editingItemParent, setEditingItemParent] = useState<string>('');

  // 🔥 不再使用舊版 work_packages 表，改用空陣列
  const workPackages: WorkPackage[] = [];
  const loadWorkPackages = async () => { /* no-op: deprecated */ };
  const setWorkPackages = (_: WorkPackage[]) => { /* no-op: deprecated */ };

  // Filter items by completion status
  const visibleItems = useMemo(() => {
    // 排除已標記為功能模組的項目 (它們在功能模組頁面管理)
    let filtered = items.filter(item => !item.meta?.isFeatureModule);

    if (!showCompleted) {
      filtered = filtered.filter(item => item.status !== 'completed');
    }
    return filtered;
  }, [items, showCompleted]);

  // Group items by work package
  const itemsByWorkPackage = useMemo(() => {
    const grouped = new Map<string, Item[]>();
    visibleItems.forEach(item => {
      if (item.work_package_id) {
        const existing = grouped.get(item.work_package_id) || [];
        grouped.set(item.work_package_id, [...existing, item]);
      }
    });
    return grouped;
  }, [visibleItems]);

  // Get uncategorized items (items without work_package_id)
  const uncategorizedItems = useMemo(() => {
    return visibleItems.filter(item => !item.work_package_id);
  }, [visibleItems]);

  // 🔥 統一：所有未分類的任務都使用 WBS 樹狀結構
  // 不再區分 wbsItems 和 trulyUncategorizedItems，全部使用相同的渲染邏輯
  const wbsItems = useMemo(() => {
    return uncategorizedItems;
  }, [uncategorizedItems]);

  // 🔥 取得 WBS 根任務（第一層，沒有 parent_id），並按 order 排序
  const wbsRootItems = useMemo(() => {
    return uncategorizedItems
      .filter(item => !item.parent_id)
      .sort((a, b) => {
        const orderA = a.meta?.order ?? new Date(a.created_at).getTime();
        const orderB = b.meta?.order ?? new Date(b.created_at).getTime();
        return orderA - orderB;
      });
  }, [uncategorizedItems]);

  // 🔥 統一所有第一層項目，按 order 排序
  // 現在只使用 items 表（不再使用舊版 work_packages 表）
  const allRootItems = useMemo(() => {
    return wbsRootItems.sort((a, b) => {
      const orderA = a.meta?.order ?? new Date(a.created_at).getTime();
      const orderB = b.meta?.order ?? new Date(b.created_at).getTime();
      return orderA - orderB;
    });
  }, [wbsRootItems]);

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
    localStorage.setItem('projectWork_showCompleted', String(newValue));
  };

  const handleDrop = async (itemId: string, targetWorkPackageId: string | null) => {
    await onItemUpdate(itemId, { work_package_id: targetWorkPackageId ?? undefined });
    onRefresh();
  };

  // Handle drop to set parent_id (for WBS hierarchy)
  const handleDropToParent = async (itemId: string, targetParentId: string) => {
    await onItemUpdate(itemId, {
      parent_id: targetParentId,
      work_package_id: undefined  // 移除 work_package_id，因為現在是 WBS 結構的一部分
    });
    onRefresh();
  };


  // Handle WBS item movement (reorder or change parent)
  // 支援以下操作：
  // 1. 同層級重新排序（before/after）
  // 2. 第一層變成另一個第一層的子項目（inside）
  // 3. 第二層提升為第一層（拖到第一層項目的 before/after）
  // 4. 跨父項移動（將 A 的子項目移到 B 之下）
  // 5. WorkPackage 之間的排序
  const handleMoveItem = async (draggedId: string, targetId: string, position: 'before' | 'after' | 'inside') => {
    // 嘗試從 items 陣列中找到項目
    let draggedItem = items.find(i => i.id === draggedId);
    let targetItem = items.find(i => i.id === targetId);

    // 檢查是否為 WorkPackage
    const draggedWP = workPackages.find(wp => wp.id === draggedId);
    const targetWP = workPackages.find(wp => wp.id === targetId);

    // 如果是 WorkPackage，轉換為虛擬 Item 格式
    if (!draggedItem && draggedWP) {
      draggedItem = adaptWorkPackageToItem(draggedWP);
    }
    if (!targetItem && targetWP) {
      targetItem = adaptWorkPackageToItem(targetWP);
    }

    if (!draggedItem || !targetItem) {
      console.log(`[handleMoveItem] 找不到項目: dragged=${draggedId}, target=${targetId}`);
      return;
    }

    // 判斷是否為 WorkPackage 操作
    const isDraggedWP = !!draggedWP;
    const isTargetWP = !!targetWP;

    console.log(`[handleMoveItem] 移動項目: ${draggedItem.title} → ${targetItem.title} (${position})`);
    console.log(`  - 被拖曳項目: ${isDraggedWP ? 'WorkPackage' : 'Item'}, parent_id: ${draggedItem.parent_id || '(無)'}`);
    console.log(`  - 目標項目: ${isTargetWP ? 'WorkPackage' : 'Item'}, parent_id: ${targetItem.parent_id || '(無)'}`);

    // === WorkPackage 之間的排序 ===
    if (isDraggedWP && isTargetWP) {
      console.log(`  → WorkPackage 排序`);

      // 對於 inside 位置，根據拖曳方向決定 before/after
      let effectivePosition = position;
      if (position === 'inside') {
        const draggedIndex = workPackages.findIndex(wp => wp.id === draggedId);
        const targetIndex = workPackages.findIndex(wp => wp.id === targetId);
        effectivePosition = draggedIndex > targetIndex ? 'before' : 'after';
      }

      // 計算新的 order 值
      const wpSorted = [...workPackages].sort((a, b) => {
        const orderA = a.meta?.order ?? new Date(a.created_at).getTime();
        const orderB = b.meta?.order ?? new Date(b.created_at).getTime();
        return orderA - orderB;
      });

      const targetIndex = wpSorted.findIndex(wp => wp.id === targetId);
      const insertIndex = effectivePosition === 'before' ? targetIndex : targetIndex + 1;

      const prevItem = wpSorted[insertIndex - 1];
      const nextItem = wpSorted[insertIndex];

      let newOrder: number;
      if (!prevItem || prevItem.id === draggedId) {
        newOrder = (nextItem?.meta?.order ?? Date.now()) - 1000;
      } else if (!nextItem || nextItem.id === draggedId) {
        newOrder = (prevItem?.meta?.order ?? Date.now()) + 1000;
      } else {
        const prevOrder = prevItem.meta?.order ?? new Date(prevItem.created_at).getTime();
        const nextOrder = nextItem.meta?.order ?? new Date(nextItem.created_at).getTime();
        newOrder = (prevOrder + nextOrder) / 2;
      }

      console.log(`  → 更新 WorkPackage 排序: order = ${newOrder}`);

      await handleUpdateWorkPackage(draggedId, {
        meta: { ...draggedWP.meta, order: newOrder }
      });

      await loadWorkPackages();
      return;
    }

    // === 普通 Item 操作（或 WorkPackage 與 Item 的混合操作）===
    if (position === 'inside') {
      // 情況 1: 將項目變成目標項目的子項目

      if (isDraggedWP) {
        // WorkPackage 不支援變成子項目，忽略此操作
        console.log(`  ⚠️ WorkPackage 不支援變成子項目，操作已忽略`);
        return;
      }

      console.log(`  → 將 "${draggedItem.title}" 設為 "${targetItem.title}" 的子項目`);

      // 🔥 檢查目標是否為舊的 WorkPackage（在 work_packages 表中）
      if (isTargetWP && targetWP) {
        // 目標是舊的 WorkPackage，設定 work_package_id
        console.log(`  → 目標是舊的 WorkPackage，設定 work_package_id`);
        await onItemUpdate(draggedId, {
          parent_id: null as any, // 🔥 修正: 必須用 null 才能清除 parent_id
          work_package_id: targetId, // 設定 work_package_id
          meta: { ...draggedItem.meta, order: Date.now() }
        });
      } else {
        // 目標是普通 Item 或新的專案工作（在 items 表中），設定 parent_id
        const newWorkPackageId = targetItem.work_package_id ?? null as any; // 🔥 Fix: ensure cleared
        await onItemUpdate(draggedId, {
          parent_id: targetId,
          work_package_id: newWorkPackageId,
          meta: { ...draggedItem.meta, order: Date.now() }
        });
      }
    } else {
      // 情況 2: before/after - 重新排序或變更層級
      // 🔥 Fix: Use null to ensure fields are cleared in database
      const targetParentId = targetItem.parent_id ?? null as any;
      const newParentId = targetParentId;
      const newWorkPackageId = targetItem.work_package_id ?? null as any;

      const draggedParentId = draggedItem.parent_id ?? null; // For comparison only
      const isLevelChange = draggedParentId !== newParentId;
      if (isLevelChange) {
        console.log(`  → 層級變更: parent_id 從 "${draggedParentId || '(無)'}" 變為 "${newParentId || '(無)'}"`);
      }

      // 找出同層級的所有兄弟項目
      // 對於第一層項目，需要同時考慮 WorkPackage 和普通 Item
      let siblings: Item[];

      if (newParentId === undefined) {
        // 第一層：使用 allRootItems（包含 WorkPackage 和 Item）
        siblings = allRootItems.filter(i => i.id !== draggedId);
      } else {
        // 非第一層：只使用 items 陣列
        siblings = items
          .filter(i => {
            const itemParentId = i.parent_id ?? undefined;
            return itemParentId === newParentId && i.id !== draggedId;
          })
          .sort((a, b) => {
            const orderA = a.meta?.order ?? new Date(a.created_at).getTime();
            const orderB = b.meta?.order ?? new Date(b.created_at).getTime();
            return orderA - orderB;
          });
      }

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

      console.log(`  → 更新排序: order = ${newOrder}, 目標位置索引: ${targetIndex}`);

      if (isDraggedWP && draggedWP) {
        // 被拖曳的是舊的 WorkPackage（在 work_packages 表中）
        // 檢查是否實際上是 items 表中的項目
        const isInItemsTable = items.find(i => i.id === draggedId);
        if (isInItemsTable) {
          // 在 items 表中，使用 onItemUpdate
          await onItemUpdate(draggedId, {
            parent_id: newParentId,
            work_package_id: newWorkPackageId,
            meta: { ...draggedItem.meta, order: newOrder }
          });
        } else {
          // 在舊的 work_packages 表中，使用 handleUpdateWorkPackage
          await handleUpdateWorkPackage(draggedId, {
            meta: { ...draggedWP.meta, order: newOrder }
          });
          await loadWorkPackages();
        }
      } else {
        // 被拖曳的是普通 Item
        await onItemUpdate(draggedId, {
          parent_id: newParentId,
          work_package_id: newWorkPackageId,
          meta: { ...draggedItem.meta, order: newOrder }
        });
      }
    }

    onRefresh();
  };

  // Handle adding sub-task
  const handleAddSubTask = (parentItem: Item) => {
    setEditingItem(undefined);
    setEditingItemParent(parentItem.id);
    setTargetWorkPackageId(parentItem.work_package_id || '');
    setShowItemDialog(true);
  };

  // WorkPackage CRUD operations
  const handleCreateWorkPackage = () => {
    setEditingWorkPackage(undefined);
    setShowWorkPackageDialog(true);
  };

  const handleEditWorkPackage = (wp: WorkPackage) => {
    setEditingWorkPackage(wp);
    setShowWorkPackageDialog(true);
  };

  // 🔥 重構：新增專案工作改為新增 Item（帶有 meta.isWorkPackage: true）
  // 這樣所有專案工作都在 items 表中，與收件匣過來的項目一致
  const handleSaveWorkPackage = async (data: Partial<WorkPackage>) => {
    const storage = getStorageClient();
    const projectId = currentProject?.id;
    if (!projectId) {
      toast.error('找不到專案 ID');
      return false;
    }

    try {
      if (editingWorkPackage) {
        // 編輯現有專案工作
        // 檢查是否為 items 表中的項目（通過 meta.isWorkPackage 判斷）
        const existingItem = items.find(i => i.id === editingWorkPackage.id);
        if (existingItem) {
          // 是 items 表中的項目，使用 onItemUpdate
          await onItemUpdate(editingWorkPackage.id, {
            title: data.title,
            description: data.description,
            status: data.status as any,
            assignee_id: data.owner_id,
            due_date: data.target_date,
          });
        } else {
          // 是舊的 work_packages 表中的項目，使用 storage.updateWorkPackage
          const { error } = await storage.updateWorkPackage(editingWorkPackage.id, {
            ...data,
            updated_at: new Date().toISOString(),
          });
          if (error) throw error;
        }
        toast.success('專案工作已更新');
      } else {
        // 🔥 新增專案工作：改為新增 Item 到 items 表
        const newItem: Partial<Item> = {
          project_id: projectId,
          type: 'general',
          title: data.title || '新專案工作',
          description: data.description || '',
          status: 'not_started',
          assignee_id: data.owner_id,
          due_date: data.target_date,
          meta: {
            isWorkPackage: true, // 標記為專案工作
            order: Date.now(),
          }
        };

        const { error } = await storage.createItem(newItem as Item);
        if (error) throw error;
        toast.success('專案工作已建立');
      }

      onRefresh();
      return true;
    } catch (error) {
      console.error('Error saving work package:', error);
      toast.error('儲存失敗');
      return false;
    }
  };

  const handleDeleteWorkPackage = async (wpId: string) => {
    const storage = getStorageClient();
    try {
      const { error } = await storage.deleteWorkPackage(wpId);
      if (error) throw error;

      await loadWorkPackages();
      onRefresh();
      return true;
    } catch (error) {
      console.error('Error deleting work package:', error);
      return false;
    }
  };

  const handleUpdateWorkPackage = async (wpId: string, updates: Partial<WorkPackage>) => {
    const storage = getStorageClient();
    try {
      const { error } = await storage.updateWorkPackage(wpId, {
        ...updates,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;

      await loadWorkPackages();
      return true;
    } catch (error) {
      console.error('Error updating work package:', error);
      return false;
    }
  };

  // Handle reordering Work Packages using DraggableWBSCard's onMoveItem
  // 注意：這個函數也可能被調用來處理普通 Item 到 WorkPackage 的拖曳
  const handleMoveWorkPackage = React.useCallback(async (draggedId: string, targetId: string, position: 'before' | 'after' | 'inside') => {
    console.log(`[handleMoveWorkPackage] 被調用: ${draggedId} -> ${targetId} (${position})`);

    const draggedIndex = workPackages.findIndex(wp => wp.id === draggedId);
    const targetIndex = workPackages.findIndex(wp => wp.id === targetId);

    // 如果被拖曳項目不是 WorkPackage，檢查是否是普通 Item
    if (draggedIndex === -1) {
      console.log(`[handleMoveWorkPackage] 被拖曳項目不是 WorkPackage，轉交給 handleMoveItem 處理`);
      // 轉交給 handleMoveItem 處理
      // 但我們需要找到目標項目對應的 Item ID
      // WorkPackage 的 ID 可能與 Item ID 不同，需要適當處理
      await handleMoveItem(draggedId, targetId, position);
      return;
    }

    if (targetIndex === -1) {
      console.log(`[handleMoveWorkPackage] 目標項目不是 WorkPackage，無法處理`);
      return;
    }

    // Smart handling for 'inside' drop on large cards (Work Packages)
    // If dropping 'inside', infer intent based on drag direction
    let effectivePosition = position;
    if (position === 'inside') {
      if (draggedIndex > targetIndex) {
        effectivePosition = 'before'; // Dragging UP -> Place before
      } else {
        effectivePosition = 'after';  // Dragging DOWN -> Place after
      }
    }

    // Local state update for smooth UI
    const newPackages = [...workPackages];
    const [item] = newPackages.splice(draggedIndex, 1);

    // Find new index of target
    const newTargetIndex = newPackages.findIndex(wp => wp.id === targetId);
    const finalIndex = effectivePosition === 'after' ? newTargetIndex + 1 : newTargetIndex;

    newPackages.splice(finalIndex, 0, item);
    setWorkPackages(newPackages);

    // Calculate new order value to persist
    const prevItem = newPackages[finalIndex - 1];
    const nextItem = newPackages[finalIndex + 1];

    let newOrder: number;
    if (!prevItem) {
      // Moved to top
      const nextOrder = nextItem?.meta?.order ?? new Date(nextItem?.created_at || Date.now()).getTime();
      newOrder = nextOrder - 1000;
    } else if (!nextItem) {
      // Moved to bottom
      const prevOrder = prevItem.meta?.order ?? new Date(prevItem.created_at).getTime();
      newOrder = prevOrder + 1000;
    } else {
      // Between two items
      const prevOrder = prevItem.meta?.order ?? new Date(prevItem.created_at).getTime();
      const nextOrder = nextItem.meta?.order ?? new Date(nextItem.created_at).getTime();
      newOrder = (prevOrder + nextOrder) / 2;
    }

    console.log(`[handleMoveWorkPackage] 更新排序: order = ${newOrder}`);

    // Persist to backend
    await handleUpdateWorkPackage(draggedId, {
      meta: {
        ...item.meta,
        order: newOrder
      }
    });
  }, [workPackages, handleUpdateWorkPackage, handleMoveItem]);

  // Item CRUD operations
  const handleAddItem = (workPackageId: string) => {
    setEditingItem(undefined);
    setTargetWorkPackageId(workPackageId);
    setShowItemDialog(true);
  };

  const handleEditItem = (item: Item) => {
    setEditingItem(item);
    setTargetWorkPackageId(item.work_package_id || '');
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
        toast.success('任務已更新');
      } else {
        const { error } = await storage.createItem({
          project_id: projectId,
          title: data.title!,
          description: data.description,
          type: 'action',
          status: data.status || 'not_started',
          assignee_id: data.assignee_id,
          due_date: data.due_date,
          work_package_id: targetWorkPackageId,
          parent_id: editingItemParent,
        } as Item);
        if (error) throw error;
        toast.success('任務已建立');
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

  const adaptWorkPackageToItem = (wp: WorkPackage): Item => {
    return {
      id: wp.id,
      project_id: wp.project_id,
      type: 'general',
      status: wp.status,
      title: wp.title,
      description: wp.description || '',
      assignee_id: wp.owner_id,
      due_date: wp.target_date,
      created_at: wp.created_at,
      updated_at: wp.updated_at || wp.created_at,
      meta: {
        isWorkPackage: true
      }
    };
  };

  // Recursive renderer for items within a Work Package (Level 2+)
  // This replaces WorkPackageGroup + WBSTreeGroup to ensure consistent styling
  const renderRecursiveItems = (parentId: string | null, level: number, scopeItems: Item[]) => {
    const children = scopeItems
      .filter(i => {
        if (parentId === null) {
          // Find root items in this scope (parent not in scope or null)
          // For WP scope, roots are those with parent_id = null
          // OR parent_id pointing to something outside (which we treat as root here)
          // But strict WBS usually means parent_id is null.
          return !i.parent_id;
        }
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
        {children.map((child, index) => {
          const childChildren = scopeItems.filter(item => item.parent_id === child.id);
          const hasGrandchildren = childChildren.length > 0;
          const isChildExpanded = expandedGroups.has(child.id);

          return (
            <div key={child.id} id={`task-${child.id}`} className="relative transition-all duration-300">
              {/* Indent Line (Vertical) - only if level > 1 (children of WP) */}
              <div
                className="absolute left-0 top-0 bottom-0 border-l-2 border-muted"
                style={{ marginLeft: `${(level - 1) * 1.5}rem` }}
              />

              {/* Horizontal Line - to self */}
              <div style={{ marginLeft: `${level * 1.5}rem` }} className="relative">
                <div className="absolute left-0 top-1/2 w-4 border-t-2 border-muted" style={{ marginLeft: '-1.5rem' }} />

                <DraggableWBSCard
                  item={child}
                  members={members}
                  isExpanded={isChildExpanded}
                  level={level}
                  hasChildren={hasGrandchildren}
                  onToggleExpand={() => toggleGroup(child.id)}
                  onItemUpdate={onItemUpdate}
                  onEditItem={handleEditItem}
                  onDeleteItem={handleDeleteItem}
                  onMoveItem={handleMoveItem}
                  onAddSubTask={handleAddSubTask}
                  renderChildren={() => renderRecursiveItems(child.id, level + 1, scopeItems)}
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
              onClick={handleCreateWorkPackage}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              新增專案工作
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
        </div>

        {/* Work Package Groups */}
        {workPackages.length === 0 && wbsRootItems.length === 0 ? (
          <Card>
            <CardContent className="py-16">
              <div className="text-center space-y-3">
                <Briefcase className="h-16 w-16 mx-auto text-muted-foreground opacity-30" />
                <div>
                  <p className="text-muted-foreground">
                    <label>目前沒有專案工作</label>
                  </p>
                  <p className="text-muted-foreground text-sm">
                    <label>點擊上方「新增專案工作」按鈕開始建立</label>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {/* 🔥 統一渲染所有第一層項目（WorkPackage + 普通 Item） */}
            {allRootItems.map(rootItem => {
              const isWorkPackage = rootItem.meta?.isWorkPackage === true;
              const wp = isWorkPackage ? workPackages.find(w => w.id === rootItem.id) : null;
              const wpItems = isWorkPackage && wp ? (itemsByWorkPackage.get(wp.id) || []) : [];
              // 🔥 統一檢查 items 表中的子項目（無論是 WorkPackage 還是普通 Item）
              // 同時檢查 parent_id 和 work_package_id（對於舊的 WorkPackage）
              const childrenInItemsTable = items.filter(i =>
                i.parent_id === rootItem.id ||
                (isWorkPackage && wp && i.work_package_id === rootItem.id && !i.parent_id)
              );
              // hasChildren 結合 items 表的子項目和舊的 wpItems（向後相容）
              const hasChildren = childrenInItemsTable.length > 0 || wpItems.length > 0;
              const isExpanded = expandedGroups.has(rootItem.id);

              return (
                <div key={rootItem.id} id={`task-${rootItem.id}`} className="relative transition-all duration-300">
                  <DraggableWBSCard
                    item={rootItem}
                    members={members}
                    isExpanded={isExpanded}
                    level={1}
                    hasChildren={hasChildren}
                    onToggleExpand={() => toggleGroup(rootItem.id)}
                    onItemUpdate={async (id, updates) => {
                      if (isWorkPackage && wp) {
                        const wpUpdates: Partial<WorkPackage> = {};
                        if (updates.status) wpUpdates.status = updates.status as any;
                        if (updates.title) wpUpdates.title = updates.title;
                        return handleUpdateWorkPackage(wp.id, wpUpdates);
                      } else {
                        return onItemUpdate(id, updates);
                      }
                    }}
                    onEditItem={() => {
                      if (isWorkPackage && wp) {
                        handleEditWorkPackage(wp);
                      } else {
                        handleEditItem(rootItem);
                      }
                    }}
                    onDeleteItem={() => {
                      if (isWorkPackage && wp) {
                        return handleDeleteWorkPackage(wp.id);
                      } else {
                        return handleDeleteItem(rootItem.id);
                      }
                    }}
                    onMoveItem={handleMoveItem}
                    onAddSubTask={() => {
                      if (isWorkPackage && wp) {
                        handleAddItem(wp.id);
                      } else {
                        handleAddSubTask(rootItem);
                      }
                    }}
                    renderChildren={hasChildren ? () => {
                      // 🔥 統一渲染子項目：從 items 表中獲取子項目
                      const renderChildItems = (parentId: string, level: number): React.ReactNode[] => {
                        // 從 items 表中獲取子項目
                        // 🔥 修正：對於舊的 WorkPackage，子項目是通過 work_package_id 關聯的
                        let childItems = items
                          .filter(i => {
                            // 先檢查 parent_id（普通 Item 和新的專案工作）
                            if (i.parent_id === parentId) return true;
                            // 再檢查 work_package_id（舊的 WorkPackage 子項目）
                            if (isWorkPackage && wp && parentId === rootItem.id && i.work_package_id === parentId && !i.parent_id) {
                              return true;
                            }
                            return false;
                          })
                          .sort((a, b) => {
                            const orderA = a.meta?.order ?? new Date(a.created_at).getTime();
                            const orderB = b.meta?.order ?? new Date(b.created_at).getTime();
                            return orderA - orderB;
                          });

                        // 如果是舊的 WorkPackage 且有 wpItems，合併它們（向後相容）
                        if (isWorkPackage && wp && parentId === rootItem.id) {
                          const wpItemsFiltered = wpItems.filter(i => !i.parent_id);
                          // 過濾掉已經在 childItems 中的項目
                          const existingIds = new Set(childItems.map(c => c.id));
                          const newWpItems = wpItemsFiltered.filter(i => !existingIds.has(i.id));
                          childItems = [...childItems, ...newWpItems].sort((a, b) => {
                            const orderA = a.meta?.order ?? new Date(a.created_at).getTime();
                            const orderB = b.meta?.order ?? new Date(b.created_at).getTime();
                            return orderA - orderB;
                          });
                        }

                        return childItems.map((child, idx) => {
                          const grandChildren = items.filter(i => i.parent_id === child.id);
                          const hasGrandChildren = grandChildren.length > 0;
                          const isChildExpanded = expandedGroups.has(child.id);

                          return (
                            <div key={child.id} id={`task-${child.id}`} className={`relative transition-all duration-300 ${idx > 0 ? 'mt-3' : ''}`}>
                              <div
                                className="absolute left-0 top-0 bottom-0 border-l-2 border-muted"
                                style={{ marginLeft: `${(level - 1) * 1.5}rem` }}
                              />
                              <div style={{ marginLeft: `${level * 1.5}rem` }} className="relative">
                                <div className="absolute left-0 top-1/2 w-4 border-t-2 border-muted" style={{ marginLeft: '-1.5rem' }} />
                                <DraggableWBSCard
                                  item={child}
                                  members={members}
                                  isExpanded={isChildExpanded}
                                  level={level}
                                  hasChildren={hasGrandChildren}
                                  onToggleExpand={() => toggleGroup(child.id)}
                                  onItemUpdate={onItemUpdate}
                                  onEditItem={() => handleEditItem(child)}
                                  onDeleteItem={() => handleDeleteItem(child.id)}
                                  onMoveItem={handleMoveItem}
                                  onAddSubTask={() => handleAddSubTask(child)}
                                  renderChildren={hasGrandChildren ? () => renderChildItems(child.id, level + 1) : undefined}
                                />
                              </div>
                            </div>
                          );
                        });
                      };
                      return <>{renderChildItems(rootItem.id, 2)}</>;
                    } : undefined}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <WorkPackageEditDialog
        workPackage={editingWorkPackage}
        members={members}
        open={showWorkPackageDialog}
        onOpenChange={setShowWorkPackageDialog}
        onSave={handleSaveWorkPackage}
      />

      <ItemEditDialog
        item={editingItem}
        workPackageId={targetWorkPackageId}
        members={members}
        open={showItemDialog}
        onOpenChange={setShowItemDialog}
        onSave={handleSaveItem}
      />
    </DndProvider>
  );
}