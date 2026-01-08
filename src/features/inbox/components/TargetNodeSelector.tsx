import { useState, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronDown, Layers, Briefcase, FolderTree, Search, X, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/components/ui/utils';
import { Item } from '@/lib/storage/types';

export interface TreeNode {
    id: string;
    title: string;
    type: 'feature' | 'work_package';
    children: TreeNode[];
    path: string; // Full path like "功能模組/後台系統/儀表板"
}

interface TargetNodeSelectorProps {
    items: Item[]; // All project items
    selectedNodeId?: string | null;
    suggestedNodeId?: string | null; // AI-suggested node
    suggestedNodePath?: string | null;
    onSelect: (nodeId: string | null, nodePath: string | null, category?: 'feature' | 'work_package' | 'todo' | null) => void;
    disabled?: boolean;
    isTodoSelected?: boolean; // For special todo category
}

// Build tree structure from flat items
function buildTree(items: Item[]): { features: TreeNode[]; workPackages: TreeNode[] } {
    const featureItems = items.filter(i => i.meta?.isFeatureModule && i.status !== 'suggestion');
    const workItems = items.filter(i => i.meta?.isWorkPackage && i.status !== 'suggestion');

    const buildNodes = (sourceItems: Item[], type: 'feature' | 'work_package'): TreeNode[] => {
        const itemMap = new Map<string, Item>();
        sourceItems.forEach(item => itemMap.set(item.id, item));

        const nodeMap = new Map<string, TreeNode>();

        // Create nodes
        sourceItems.forEach(item => {
            nodeMap.set(item.id, {
                id: item.id,
                title: item.title,
                type,
                children: [],
                path: item.title
            });
        });

        // Build hierarchy
        const roots: TreeNode[] = [];
        sourceItems.forEach(item => {
            const node = nodeMap.get(item.id)!;
            const parentId = item.parent_id;

            if (parentId && nodeMap.has(parentId)) {
                const parent = nodeMap.get(parentId)!;
                parent.children.push(node);
                node.path = `${parent.path} / ${node.title}`;
            } else {
                roots.push(node);
            }
        });

        // Sort by order or title
        const sortNodes = (nodes: TreeNode[]) => {
            nodes.sort((a, b) => {
                const itemA = itemMap.get(a.id);
                const itemB = itemMap.get(b.id);
                const orderA = itemA?.meta?.order ?? Infinity;
                const orderB = itemB?.meta?.order ?? Infinity;
                if (orderA !== orderB) return orderA - orderB;
                return a.title.localeCompare(b.title);
            });
            nodes.forEach(n => sortNodes(n.children));
        };
        sortNodes(roots);

        return roots;
    };

    return {
        features: buildNodes(featureItems, 'feature'),
        workPackages: buildNodes(workItems, 'work_package')
    };
}

// Find node by ID
function findNodeById(nodes: TreeNode[], id: string): TreeNode | null {
    for (const node of nodes) {
        if (node.id === id) return node;
        const found = findNodeById(node.children, id);
        if (found) return found;
    }
    return null;
}

// Flatten tree for search
function flattenTree(nodes: TreeNode[]): TreeNode[] {
    const result: TreeNode[] = [];
    const traverse = (node: TreeNode) => {
        result.push(node);
        node.children.forEach(traverse);
    };
    nodes.forEach(traverse);
    return result;
}

// TreeNodeItem component
function TreeNodeItem({
    node,
    level,
    selectedId,
    suggestedId,
    expandedIds,
    onToggleExpand,
    onSelect
}: {
    node: TreeNode;
    level: number;
    selectedId?: string | null;
    suggestedId?: string | null;
    expandedIds: Set<string>;
    onToggleExpand: (id: string) => void;
    onSelect: (node: TreeNode) => void;
}) {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);
    const isSelected = selectedId === node.id;
    const isSuggested = suggestedId === node.id && !isSelected;

    return (
        <div>
            <div
                className={cn(
                    'flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer transition-colors text-gray-700',
                    'hover:bg-gray-100',
                    isSelected && 'bg-blue-50 text-blue-700 font-medium',
                    isSuggested && 'bg-amber-50 border border-amber-200'
                )}
                style={{ paddingLeft: `${level * 16 + 8}px` }}
                onClick={() => onSelect(node)}
            >
                {/* Expand/Collapse */}
                <button
                    className="p-0.5 hover:bg-gray-200 rounded text-gray-500"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (hasChildren) onToggleExpand(node.id);
                    }}
                >
                    {hasChildren ? (
                        isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                    ) : (
                        <span className="w-4" />
                    )}
                </button>

                {/* Icon */}
                {node.type === 'feature' ? (
                    <Layers className="h-4 w-4 text-violet-500 shrink-0" />
                ) : (
                    <Briefcase className="h-4 w-4 text-indigo-500 shrink-0" />
                )}

                {/* Title */}
                <span className="truncate text-sm">{node.title}</span>

                {/* AI Suggested Badge */}
                {isSuggested && (
                    <Badge variant="outline" className="ml-auto text-xs bg-amber-100 text-amber-700 border-amber-300">
                        AI 建議
                    </Badge>
                )}
            </div>

            {/* Children */}
            {hasChildren && isExpanded && (
                <div>
                    {node.children.map(child => (
                        <TreeNodeItem
                            key={child.id}
                            node={child}
                            level={level + 1}
                            selectedId={selectedId}
                            suggestedId={suggestedId}
                            expandedIds={expandedIds}
                            onToggleExpand={onToggleExpand}
                            onSelect={onSelect}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export function TargetNodeSelector({
    items,
    selectedNodeId,
    suggestedNodeId,
    suggestedNodePath,
    onSelect,
    disabled,
    isTodoSelected = false
}: TargetNodeSelectorProps) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    // Build tree
    const { features, workPackages } = useMemo(() => buildTree(items), [items]);
    const allNodes = useMemo(() => [...flattenTree(features), ...flattenTree(workPackages)], [features, workPackages]);

    // Find selected node
    const selectedNode = useMemo(() => {
        if (!selectedNodeId) return null;
        return findNodeById(features, selectedNodeId) || findNodeById(workPackages, selectedNodeId);
    }, [selectedNodeId, features, workPackages]);

    // Auto-expand to show suggested node
    useEffect(() => {
        if (suggestedNodeId) {
            // Find path to suggested node and expand all parents
            const findPath = (nodes: TreeNode[], targetId: string, path: string[] = []): string[] | null => {
                for (const node of nodes) {
                    if (node.id === targetId) return [...path, node.id];
                    const found = findPath(node.children, targetId, [...path, node.id]);
                    if (found) return found;
                }
                return null;
            };

            const pathInFeatures = findPath(features, suggestedNodeId);
            const pathInWork = findPath(workPackages, suggestedNodeId);
            const fullPath = pathInFeatures || pathInWork;

            if (fullPath) {
                setExpandedIds(prev => new Set([...prev, ...fullPath.slice(0, -1)]));
            }
        }
    }, [suggestedNodeId, features, workPackages]);

    // Filter nodes by search
    const filteredNodes = useMemo(() => {
        if (!searchQuery.trim()) return null;
        const q = searchQuery.toLowerCase();
        return allNodes.filter(n => n.title.toLowerCase().includes(q) || n.path.toLowerCase().includes(q));
    }, [searchQuery, allNodes]);

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelect = (node: TreeNode | null) => {
        if (node) {
            const fullPath = node.type === 'feature' ? `功能模組 / ${node.path}` : `專案工作 / ${node.path}`;
            onSelect(node.id, fullPath, node.type);
        } else {
            onSelect(null, null, null);
        }
        setOpen(false);
        setSearchQuery('');
    };

    const handleSelectTodo = () => {
        onSelect(null, '待辦事項', 'todo');
        setOpen(false);
        setSearchQuery('');
    };

    // Display text
    const displayText = isTodoSelected
        ? '待辦事項'
        : selectedNode
            ? selectedNode.title
            : selectedNodeId === null
                ? '待分類'
                : suggestedNodePath || '選擇歸類目標...';

    const displayIcon = isTodoSelected ? (
        <CheckSquare className="h-4 w-4 text-sky-500" />
    ) : selectedNode?.type === 'feature' ? (
        <Layers className="h-4 w-4 text-violet-500" />
    ) : selectedNode?.type === 'work_package' ? (
        <Briefcase className="h-4 w-4 text-indigo-500" />
    ) : (
        <FolderTree className="h-4 w-4 text-muted-foreground" />
    );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn(
                        'w-auto h-7 justify-between gap-2 font-medium',
                        selectedNode?.type === 'feature' && 'bg-violet-50 border-violet-200 text-violet-700',
                        selectedNode?.type === 'work_package' && 'bg-indigo-50 border-indigo-200 text-indigo-700',
                        !selectedNode && suggestedNodeId && 'bg-amber-50 border-amber-200 text-amber-700',
                        !selectedNode && !suggestedNodeId && 'text-muted-foreground'
                    )}
                >
                    {displayIcon}
                    <span className="truncate max-w-[200px]">{displayText}</span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 bg-white border shadow-lg" align="start">
                {/* Search */}
                <div className="p-2 border-b bg-gray-50">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="搜尋功能模組或專案工作..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 h-8 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                        />
                        {searchQuery && (
                            <button
                                className="absolute right-2 top-1/2 -translate-y-1/2"
                                onClick={() => setSearchQuery('')}
                            >
                                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Tree or Search Results */}
                <div className="max-h-[300px] overflow-y-auto p-2 bg-white">
                    {/* Quick Category Options */}
                    <div className="space-y-1 mb-2 pb-2 border-b border-gray-200">
                        {/* Uncategorized Option */}
                        <div
                            className={cn(
                                'flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors',
                                'hover:bg-gray-100 text-gray-700',
                                selectedNodeId === null && !isTodoSelected && 'bg-blue-50 text-blue-700 font-medium'
                            )}
                            onClick={() => handleSelect(null)}
                        >
                            <FolderTree className="h-4 w-4 text-gray-500" />
                            <span className="text-sm">待分類</span>
                        </div>

                        {/* Todo List Option (Special Category) */}
                        <div
                            className={cn(
                                'flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors',
                                'hover:bg-gray-100 text-gray-700',
                                isTodoSelected && 'bg-sky-50 text-sky-700 font-medium'
                            )}
                            onClick={() => handleSelectTodo()}
                        >
                            <CheckSquare className="h-4 w-4 text-sky-500" />
                            <span className="text-sm">待辦事項</span>
                        </div>
                    </div>

                    {/* Search Results */}
                    {filteredNodes ? (
                        filteredNodes.length > 0 ? (
                            <div className="mt-2 space-y-1">
                                {filteredNodes.map(node => (
                                    <div
                                        key={node.id}
                                        className={cn(
                                            'flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors',
                                            'hover:bg-gray-100 text-gray-700',
                                            selectedNodeId === node.id && 'bg-blue-50 text-blue-700 font-medium'
                                        )}
                                        onClick={() => handleSelect(node)}
                                    >
                                        {node.type === 'feature' ? (
                                            <Layers className="h-4 w-4 text-violet-500 shrink-0" />
                                        ) : (
                                            <Briefcase className="h-4 w-4 text-indigo-500 shrink-0" />
                                        )}
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm truncate">{node.title}</span>
                                            <span className="text-xs text-gray-500 truncate">{node.path}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4 text-sm text-gray-500">
                                找不到符合的項目
                            </div>
                        )
                    ) : (
                        <>
                            {/* Feature Modules */}
                            {features.length > 0 && (
                                <div className="mt-2">
                                    <div className="text-xs font-medium text-gray-500 px-2 py-1">功能模組</div>
                                    {features.map(node => (
                                        <TreeNodeItem
                                            key={node.id}
                                            node={node}
                                            level={0}
                                            selectedId={selectedNodeId}
                                            suggestedId={suggestedNodeId}
                                            expandedIds={expandedIds}
                                            onToggleExpand={toggleExpand}
                                            onSelect={handleSelect}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Work Packages */}
                            {workPackages.length > 0 && (
                                <div className="mt-2">
                                    <div className="text-xs font-medium text-gray-500 px-2 py-1">專案工作</div>
                                    {workPackages.map(node => (
                                        <TreeNodeItem
                                            key={node.id}
                                            node={node}
                                            level={0}
                                            selectedId={selectedNodeId}
                                            suggestedId={suggestedNodeId}
                                            expandedIds={expandedIds}
                                            onToggleExpand={toggleExpand}
                                            onSelect={handleSelect}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Empty State */}
                            {features.length === 0 && workPackages.length === 0 && (
                                <div className="text-center py-4 text-sm text-gray-500">
                                    尚無功能模組或專案工作
                                </div>
                            )}
                        </>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
