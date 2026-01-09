
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStorageClient } from '@/lib/storage';
import { Artifact, Item, ItemType } from '@/lib/storage/types';
import { useProject } from '../context/ProjectContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    ChevronLeft,
    FileText,
    Link2,
    MessageSquare,
    File,
    Calendar,
    ExternalLink,
    Quote,
    CheckSquare,
    MessageCircle,
    FileCheck,
    GitBranch,
    Briefcase,
    Trash2
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const TYPE_ICONS: Record<string, any> = {
    'text/plain': FileText,
    'text/conversation': MessageSquare,
    'text/uri-list': Link2,
    'application/': File,
};

const ITEM_TYPE_ICONS: Record<ItemType, React.ComponentType<{ className?: string }>> = {
    action: CheckSquare,
    pending: MessageCircle,
    decision: FileCheck,
    cr: GitBranch,
    // work_package: Briefcase, // Removed invalid type
    rule: FileText,
    issue: FileText,
    todo: FileText,
    general: FileText
};

const ITEM_TYPE_LABELS: Record<ItemType, string> = {
    action: '任務',
    pending: '待回覆',
    decision: '決議',
    cr: '變更',
    // work_package: '專案工作', // Removed invalid type
    rule: '規則',
    issue: '問題',
    todo: '待辦', // Added missing type
    general: '一般' // Added missing type
};

export function SourceDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { currentProject } = useProject();

    const [artifact, setArtifact] = useState<Artifact | null>(null);
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            if (!id || !currentProject) return;

            setLoading(true);
            try {
                const storage = getStorageClient();

                // 1. Fetch Artifact
                const { data: artifactData, error: artifactError } = await storage.getArtifactById(id);
                if (artifactError) throw artifactError;
                if (!artifactData) throw new Error('Document not found');

                setArtifact(artifactData);

                // Get fresh signed URL if storage path exists
                if (artifactData.storage_path) {
                    const { data: url } = await storage.getFileUrl(artifactData.storage_path);
                    if (url) setFileUrl(url);
                } else if (artifactData.file_url) {
                    // Fallback to existing URL (though likely expired if it was a signed URL)
                    setFileUrl(artifactData.file_url);
                }

                // 2. Fetch Items for Traceability
                const { data: itemsData, error: itemsError } = await storage.getItems(currentProject.id);
                if (itemsError) console.warn('Failed to fetch items for traceability:', itemsError);
                setItems(itemsData || []);

            } catch (err: any) {
                console.error('Failed to load document:', err);
                setError(err.message || '無法載入文件');
                toast.error('無法載入文件');
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [id, currentProject]);

    const referencedItems = useMemo(() => {
        if (!artifact) return [];
        return items.filter(item =>
            // Only include items that reference this artifact
            (item.source_artifact_id === artifact.id ||
                item.meta?.citation?.artifact_id === artifact.id) &&
            // Exclude suggestion items (AI generated that haven't been confirmed)
            item.status !== 'suggestion'
        );
    }, [artifact, items]);

    const groupedReferences = useMemo(() => {
        const groups: Record<string, Item[]> = {};
        referencedItems.forEach(item => {
            if (!groups[item.type]) groups[item.type] = [];
            groups[item.type].push(item);
        });
        return groups;
    }, [referencedItems]);

    const getTypeInfo = (contentType: string) => {
        for (const [key, Icon] of Object.entries(TYPE_ICONS)) {
            if (contentType.includes(key)) {
                return { icon: Icon };
            }
        }
        return { icon: FileText };
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('zh-TW', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleNavigateToItem = (item: Item) => {
        // Fix: Navigate directly to task detail instead of list view
        navigate(`/app/tasks/${item.id}`);
    };

    const handleDeleteGhostItem = async (e: React.MouseEvent, item: Item) => {
        e.stopPropagation();
        if (!confirm(`確定要永久刪除 "${item.title}" 嗎？\n此操作會直接從資料庫移除該項目，且無法復原。`)) return;

        try {
            const storage = getStorageClient();
            const { error } = await storage.deleteItem(item.id);

            if (error) throw error;

            toast.success('已刪除任務');

            // Refresh items list
            if (currentProject) {
                const { data: itemsData } = await storage.getItems(currentProject.id);
                setItems(itemsData || []);
            }
        } catch (error) {
            console.error('Failed to delete item:', error);
            toast.error('刪除失敗');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !artifact) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[50vh] gap-4">
                <div className="text-muted-foreground text-lg">找不到文件</div>
                <Button variant="outline" onClick={() => navigate('/app/sources')}>
                    返回文件庫
                </Button>
            </div>
        );
    }

    const typeInfo = getTypeInfo(artifact.content_type || '');
    const TypeIcon = typeInfo.icon;

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ChevronLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center justify-center w-10 h-10 rounded-[var(--radius)] bg-primary/10 text-primary shrink-0">
                    <TypeIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-bold truncate">
                        {artifact.meta?.source_info || artifact.meta?.file_name || '來源文件'}
                    </h1>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(artifact.created_at)}</span>
                        {artifact.meta?.channel && (
                            <>
                                <span>•</span>
                                <span className="capitalize">{artifact.meta.channel}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content (Left, 2 cols) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="space-y-3">
                        <h3 className="flex items-center gap-2 font-semibold">
                            <FileText className="w-4 h-4" />
                            原始內容
                        </h3>

                        <div className="p-6 rounded-[var(--radius-lg)] bg-muted/10 border border-border/50 min-h-[400px]">
                            {artifact.content_type === 'text/uri-list' ? (
                                <div className="flex flex-col gap-4 items-center justify-center py-12">
                                    <Link2 className="w-12 h-12 text-muted-foreground opacity-50" />
                                    <a
                                        href={artifact.original_content}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-accent text-lg hover:underline break-all text-center px-4"
                                    >
                                        {artifact.original_content}
                                        <ExternalLink className="w-5 h-5 shrink-0" />
                                    </a>
                                </div>
                            ) : artifact.original_content?.startsWith('data:image/') ? (
                                <div className="space-y-4">
                                    <img
                                        src={artifact.original_content}
                                        alt={artifact.meta?.file_name || '上傳的圖片'}
                                        className="max-w-full h-auto rounded-[var(--radius)] shadow-sm mx-auto"
                                    />
                                    {artifact.meta?.file_name && (
                                        <p className="text-center text-muted-foreground text-sm">
                                            {artifact.meta.file_name}
                                        </p>
                                    )}
                                </div>
                            ) : artifact.meta?.file_name ? (
                                <div className="space-y-6">
                                    {/* File Header & Viewer */}
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-4 p-4 bg-background border rounded-[var(--radius)]">
                                            <div className="text-4xl">
                                                {artifact.content_type?.includes('pdf') ? '📄' :
                                                    artifact.content_type?.includes('word') ? '📝' :
                                                        artifact.content_type?.includes('excel') || artifact.content_type?.includes('spreadsheet') ? '📊' :
                                                            artifact.content_type?.includes('markdown') ? '📃' : '📎'}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-lg">{artifact.meta.file_name}</p>
                                                <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                                                    {artifact.file_size && (
                                                        <span>{(artifact.file_size / 1024).toFixed(2)} KB</span>
                                                    )}
                                                    {artifact.content_type && (
                                                        <span>{artifact.content_type}</span>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Open Action */}
                                            {(fileUrl) && (
                                                <Button variant="outline" size="sm" asChild>
                                                    <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                                                        <ExternalLink className="w-4 h-4 mr-2" />
                                                        開啟原始檔
                                                    </a>
                                                </Button>
                                            )}
                                        </div>

                                        {/* Inline Viewer */}
                                        {fileUrl && artifact.content_type?.toLowerCase().includes('pdf') && (
                                            <div className="w-full h-[800px] border rounded-[var(--radius)] bg-white overflow-hidden">
                                                <iframe
                                                    src={fileUrl}
                                                    title="PDF Viewer"
                                                    className="w-full h-full"
                                                />
                                            </div>
                                        )}

                                        {/* Office Viewer (Word/Excel/PPT) */}
                                        {fileUrl && (
                                            artifact.content_type?.includes('word') ||
                                            artifact.content_type?.includes('spreadsheet') ||
                                            artifact.content_type?.includes('presentation') ||
                                            artifact.content_type?.includes('msword') ||
                                            artifact.content_type?.includes('excel') ||
                                            artifact.content_type?.includes('powerpoint')
                                        ) && (
                                                <div className="w-full h-[800px] border rounded-[var(--radius)] bg-white overflow-hidden relative group">
                                                    <iframe
                                                        src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`}
                                                        title="Office Viewer"
                                                        className="w-full h-full"
                                                    />
                                                    <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                        Microsoft Office Preview
                                                    </div>
                                                </div>
                                            )}
                                    </div>

                                    {/* Extracted Text Content */}
                                    {artifact.content_type?.startsWith('text/') && !artifact.original_content.startsWith('data:') && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-muted-foreground">提取內容預覽</label>
                                            <div className="p-4 bg-background rounded-[var(--radius)] border border-border whitespace-pre-wrap break-words text-sm font-mono leading-relaxed max-h-[600px] overflow-y-auto">
                                                {artifact.original_content}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap break-words">
                                    {artifact.original_content}
                                </div>
                            )}
                        </div>

                        {artifact.original_content !== artifact.masked_content && (
                            <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-[var(--radius)] border border-amber-100 flex items-center gap-2">
                                <span className="text-lg">⚠️</span>
                                此文件包含已遮罩的敏感資訊，上方顯示的是原始內容（僅限授權人員可見）。
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar (Right, 1 col) */}
                <div className="space-y-8">
                    {/* Metadata Card */}
                    <div className="space-y-3">
                        <h3 className="flex items-center gap-2 font-semibold">
                            <FileText className="w-4 h-4" />
                            詳細屬性
                        </h3>
                        <div className="p-4 rounded-[var(--radius-lg)] bg-muted/20 border border-border space-y-4 text-sm">
                            <div>
                                <label className="text-muted-foreground text-xs uppercase tracking-wider">文件 ID</label>
                                <p className="font-mono text-xs mt-1 break-all bg-background p-1.5 rounded border">{artifact.id}</p>
                            </div>
                            <div>
                                <label className="text-muted-foreground text-xs uppercase tracking-wider">MIME Type</label>
                                <p className="mt-1 font-mono text-xs">{artifact.content_type}</p>
                            </div>
                            {artifact.meta?.uploader_id && (
                                <div>
                                    <label className="text-muted-foreground text-xs uppercase tracking-wider">上傳者</label>
                                    <p className="mt-1">{artifact.meta.uploader_id}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Traceability */}
                    <div className="space-y-3">
                        <h3 className="flex items-center gap-2 font-semibold">
                            <Quote className="w-4 h-4" />
                            證據追蹤 ({referencedItems.length})
                        </h3>

                        {referencedItems.length === 0 ? (
                            <div className="p-6 text-center rounded-[var(--radius-lg)] bg-muted/20 border-2 border-dashed border-border/50">
                                <p className="text-muted-foreground text-sm">
                                    此文件尚未被引用
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {Object.entries(groupedReferences).map(([type, items]) => {
                                    const itemType = type as ItemType;
                                    const ItemIcon = ITEM_TYPE_ICONS[itemType] || FileText;
                                    const label = ITEM_TYPE_LABELS[itemType] || type;

                                    return (
                                        <div key={type} className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <ItemIcon className="w-4 h-4 text-muted-foreground" />
                                                <span className="font-medium text-sm">{label}</span>
                                                <Badge variant="secondary" className="text-xs h-5 px-1.5">{items.length}</Badge>
                                            </div>
                                            <div className="space-y-2 pl-4 border-l-2 border-border/50 ml-2">
                                                {items.map(item => (
                                                    <div
                                                        key={item.id}
                                                        onClick={() => handleNavigateToItem(item)}
                                                        className="group relative p-3 bg-card rounded-[var(--radius)] border border-border hover:border-primary/50 cursor-pointer transition-all hover:shadow-sm"
                                                    >
                                                        <p className="font-medium text-sm line-clamp-1 text-primary pr-6">{item.title}</p>
                                                        {item.description && (
                                                            <p className="text-muted-foreground text-xs line-clamp-2 mt-1">{item.description}</p>
                                                        )}
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <Badge variant="outline" className="text-[10px] h-4 px-1">{item.status}</Badge>
                                                            {item.assignee_id && (
                                                                <span className="text-[10px] text-muted-foreground">@{item.assignee_id}</span>
                                                            )}
                                                        </div>

                                                        {/* Force Delete Button for Ghost Items */}
                                                        <button
                                                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-all"
                                                            onClick={(e) => handleDeleteGhostItem(e, item)}
                                                            title="強制刪除此項目"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
