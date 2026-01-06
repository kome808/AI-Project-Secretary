import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    ArrowLeft,
    Calendar,
    User,
    Clock,
    AlertTriangle,
    CheckCircle2,
    Edit2,
    Trash2,
    Save,
    X,
    Layers,
    FileText,
    Link as LinkIcon,
    Image as ImageIcon,
    Upload,
    Plus
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { getStorageClient } from '../../lib/storage';
import { Item, Member } from '../../lib/storage/types';
import { toast } from 'sonner';
import { STATUS_OPTIONS, getStatusLabel, getStatusColor } from '../../lib/storage/statusHelpers';

// Design prototype entry type
interface DesignPrototype {
    id: string;
    url?: string;
    imageUrl?: string;
    description: string;
}

export function FeatureDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { currentProject } = useProject();

    const [loading, setLoading] = useState(true);
    const [item, setItem] = useState<Item | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [isEditing, setIsEditing] = useState(false);

    // Basic fields
    const [editedTitle, setEditedTitle] = useState('');
    const [editedDescription, setEditedDescription] = useState('');
    const [editedAssigneeId, setEditedAssigneeId] = useState<string>('');
    const [editedDueDate, setEditedDueDate] = useState<string>('');
    const [editedStatus, setEditedStatus] = useState<string>('not_started');

    // Feature-specific fields (stored in meta)
    const [requirementsSpec, setRequirementsSpec] = useState('');
    const [functionalSpec, setFunctionalSpec] = useState('');
    const [functionalSpecLink, setFunctionalSpecLink] = useState('');
    const [designPrototypes, setDesignPrototypes] = useState<DesignPrototype[]>([]);

    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (currentProject && id) {
            loadData();
        }
    }, [currentProject, id]);

    const loadData = async () => {
        if (!currentProject || !id) return;
        setLoading(true);

        const storage = getStorageClient();
        const [itemsRes, membersRes] = await Promise.all([
            storage.getItems(currentProject.id),
            storage.getMembers(currentProject.id)
        ]);

        if (itemsRes.data) {
            const foundItem = itemsRes.data.find(i => i.id === id);
            if (foundItem) {
                setItem(foundItem);
                initializeEditFields(foundItem);
            }
        }
        if (membersRes.data) {
            setMembers(membersRes.data);
        }

        setLoading(false);
    };

    const initializeEditFields = (item: Item) => {
        setEditedTitle(item.title);
        setEditedDescription(item.description || '');
        setEditedAssigneeId(item.assignee_id || '');
        setEditedDueDate(item.due_date ? item.due_date.split('T')[0] : '');
        setEditedStatus(item.status || 'not_started');

        // Load feature-specific fields from meta
        const meta = item.meta || {};
        setRequirementsSpec(meta.requirementsSpec || '');
        setFunctionalSpec(meta.functionalSpec || '');
        setFunctionalSpecLink(meta.functionalSpecLink || '');
        setDesignPrototypes(meta.designPrototypes || []);
    };

    const getMemberName = (memberId?: string) => {
        if (!memberId) return '未指派';
        const member = members.find(m => m.id === memberId);
        return member?.name || '未知';
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '未設定';
        return new Date(dateString).toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const handleStartEdit = () => {
        if (item) {
            initializeEditFields(item);
            setIsEditing(true);
        }
    };

    const handleCancelEdit = () => {
        if (item) {
            initializeEditFields(item);
        }
        setIsEditing(false);
    };

    const handleSave = async () => {
        if (!item || !editedTitle.trim()) return;

        setSaving(true);
        const storage = getStorageClient();

        try {
            const updatedMeta = {
                ...item.meta,
                requirementsSpec,
                functionalSpec,
                functionalSpecLink,
                designPrototypes,
            };

            const updates: Partial<Item> = {
                title: editedTitle.trim(),
                description: editedDescription.trim(),
                assignee_id: editedAssigneeId || undefined,
                due_date: editedDueDate || undefined,
                status: editedStatus as any,
                meta: updatedMeta,
                updated_at: new Date().toISOString()
            };

            const { error } = await storage.updateItem(item.id, updates);

            if (error) throw error;

            setItem({
                ...item,
                ...updates
            });
            setIsEditing(false);
            toast.success('功能模組已更新');
        } catch (error) {
            console.error('Error saving feature:', error);
            toast.error('儲存失敗');
        } finally {
            setSaving(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!item) return;

        const storage = getStorageClient();
        try {
            const { error } = await storage.updateItem(item.id, {
                status: newStatus as any,
                updated_at: new Date().toISOString()
            });

            if (error) throw error;

            setItem({ ...item, status: newStatus as any });
            setEditedStatus(newStatus);
            toast.success('狀態已更新');
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('更新失敗');
        }
    };

    const handleDelete = async () => {
        if (!item) return;

        if (!confirm('確定要刪除此功能模組嗎？')) return;

        const storage = getStorageClient();
        try {
            const { error } = await storage.deleteItem(item.id);
            if (error) throw error;

            toast.success('功能模組已刪除');
            navigate('/tasks?view=features');
        } catch (error) {
            console.error('Error deleting feature:', error);
            toast.error('刪除失敗');
        }
    };

    const addDesignPrototype = () => {
        setDesignPrototypes([
            ...designPrototypes,
            { id: Date.now().toString(), url: '', imageUrl: '', description: '' }
        ]);
    };

    const updateDesignPrototype = (id: string, field: keyof DesignPrototype, value: string) => {
        setDesignPrototypes(
            designPrototypes.map(p => p.id === id ? { ...p, [field]: value } : p)
        );
    };

    const removeDesignPrototype = (id: string) => {
        setDesignPrototypes(designPrototypes.filter(p => p.id !== id));
    };

    // Handle image file drop/upload for design prototypes
    const handleImageDrop = useCallback((protoId: string, e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const base64 = event.target?.result as string;
                    updateDesignPrototype(protoId, 'imageUrl', base64);
                };
                reader.readAsDataURL(file);
            } else {
                toast.error('請上傳圖片檔案');
            }
        }
    }, []);

    const handleImageUpload = (protoId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const base64 = event.target?.result as string;
                    updateDesignPrototype(protoId, 'imageUrl', base64);
                };
                reader.readAsDataURL(file);
            } else {
                toast.error('請上傳圖片檔案');
            }
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-pulse text-center space-y-3">
                    <Clock className="h-16 w-16 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground">載入功能模組詳情...</p>
                </div>
            </div>
        );
    }

    if (!item) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                    <AlertTriangle className="h-16 w-16 text-muted-foreground mx-auto" />
                    <div>
                        <p className="text-lg font-medium">找不到功能模組</p>
                        <p className="text-muted-foreground">此功能模組可能已被刪除或不存在</p>
                    </div>
                    <Button onClick={() => navigate('/tasks?view=features')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        返回功能模組列表
                    </Button>
                </div>
            </div>
        );
    }

    const statusLabel = getStatusLabel(item.status);
    const statusColorClass = getStatusColor(item.status);

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/tasks?view=features')}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            功能模組詳情
                        </p>
                        <h1 className="text-xl font-semibold">
                            {isEditing ? '編輯功能模組' : item.title}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isEditing ? (
                        <>
                            <Button variant="ghost" size="sm" onClick={handleCancelEdit} disabled={saving}>
                                <X className="w-4 h-4 mr-1" />
                                取消
                            </Button>
                            <Button size="sm" onClick={handleSave} disabled={saving}>
                                <Save className="w-4 h-4 mr-1" />
                                {saving ? '儲存中...' : '儲存'}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" size="sm" onClick={handleStartEdit}>
                                <Edit2 className="w-4 h-4 mr-1" />
                                編輯
                            </Button>
                            <Button variant="destructive" size="sm" onClick={handleDelete}>
                                <Trash2 className="w-4 h-4 mr-1" />
                                刪除
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Basic Info Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            {isEditing ? (
                                <Input
                                    type="text"
                                    value={editedTitle}
                                    onChange={(e) => setEditedTitle(e.target.value)}
                                    className="text-xl font-semibold"
                                    placeholder="功能模組名稱"
                                />
                            ) : (
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    <Layers className="w-5 h-5" />
                                    {item.title}
                                </h2>
                            )}
                        </div>
                        <Badge className={statusColorClass}>
                            {statusLabel}
                        </Badge>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">說明</label>
                        {isEditing ? (
                            <Textarea
                                value={editedDescription}
                                onChange={(e) => setEditedDescription(e.target.value)}
                                placeholder="功能簡述..."
                                rows={3}
                            />
                        ) : (
                            <p className="text-foreground bg-muted/30 rounded-lg p-4 min-h-[60px]">
                                {item.description || '無說明'}
                            </p>
                        )}
                    </div>

                    {/* Meta Info Grid */}
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Assignee */}
                        <div className={`flex items-center gap-3 p-4 rounded-lg ${isEditing ? 'bg-white border' : 'bg-muted/30'}`}>
                            <User className="w-5 h-5 text-muted-foreground" />
                            <div className="flex-1">
                                <p className="text-sm text-muted-foreground">負責人</p>
                                {isEditing ? (
                                    <Select
                                        value={editedAssigneeId}
                                        onValueChange={(value) => setEditedAssigneeId(value === 'none' ? '' : value)}
                                    >
                                        <SelectTrigger className="w-full mt-1">
                                            <SelectValue placeholder="選擇負責人" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">未指派</SelectItem>
                                            {members.map((member) => (
                                                <SelectItem key={member.id} value={member.id}>
                                                    {member.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <p className="font-medium">{getMemberName(item.assignee_id)}</p>
                                )}
                            </div>
                        </div>

                        {/* Due Date */}
                        <div className={`flex items-center gap-3 p-4 rounded-lg ${isEditing ? 'bg-white border' : 'bg-muted/30'}`}>
                            <Calendar className="w-5 h-5 text-muted-foreground" />
                            <div className="flex-1">
                                <p className="text-sm text-muted-foreground">到期日</p>
                                {isEditing ? (
                                    <Input
                                        type="date"
                                        value={editedDueDate}
                                        onChange={(e) => setEditedDueDate(e.target.value)}
                                        className="w-full mt-1"
                                    />
                                ) : (
                                    <p className="font-medium">{formatDate(item.due_date)}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Status Actions */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-muted-foreground">快速更新狀態</label>
                        <div className="flex flex-wrap gap-2">
                            {STATUS_OPTIONS.filter(opt =>
                                ['not_started', 'in_progress', 'blocked', 'awaiting_response', 'completed'].includes(opt.value)
                            ).map((opt) => (
                                <Button
                                    key={opt.value}
                                    variant={item.status === opt.value ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleStatusChange(opt.value)}
                                    className={item.status === opt.value ? '' : 'hover:bg-muted'}
                                >
                                    {opt.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Requirements Spec Card */}
            <Card>
                <CardHeader>
                    <h3 className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        需求規格
                    </h3>
                    <p className="text-sm text-muted-foreground">記錄此功能的規格需求</p>
                </CardHeader>
                <CardContent>
                    {isEditing ? (
                        <Textarea
                            value={requirementsSpec}
                            onChange={(e) => setRequirementsSpec(e.target.value)}
                            placeholder="輸入需求規格內容...

範例：
1. 使用者可以...
2. 系統應該...
3. 當...時，應該..."
                            rows={15}
                            className="font-mono text-sm min-h-[300px]"
                        />
                    ) : (
                        <div className="bg-muted/30 rounded-lg p-4 min-h-[200px] whitespace-pre-wrap font-mono text-sm">
                            {requirementsSpec || '尚未填寫需求規格'}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Functional Spec Card */}
            <Card>
                <CardHeader>
                    <h3 className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        功能規格 (FRD)
                    </h3>
                    <p className="text-sm text-muted-foreground">記錄系統功能規格文件，可附上雲端文件連結</p>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isEditing ? (
                        <>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">雲端文件連結</label>
                                <div className="flex items-center gap-2">
                                    <LinkIcon className="w-4 h-4 text-muted-foreground" />
                                    <Input
                                        value={functionalSpecLink}
                                        onChange={(e) => setFunctionalSpecLink(e.target.value)}
                                        placeholder="https://docs.google.com/... 或其他文件連結"
                                    />
                                </div>
                            </div>
                            <Textarea
                                value={functionalSpec}
                                onChange={(e) => setFunctionalSpec(e.target.value)}
                                placeholder="輸入功能規格內容...

範例：
## 功能概述
...

## 輸入/輸出
...

## 業務邏輯
..."
                                rows={15}
                                className="font-mono text-sm min-h-[300px]"
                            />
                        </>
                    ) : (
                        <>
                            {functionalSpecLink && (
                                <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                                    <LinkIcon className="w-4 h-4 text-primary" />
                                    <a
                                        href={functionalSpecLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline flex-1 truncate"
                                    >
                                        {functionalSpecLink}
                                    </a>
                                </div>
                            )}
                            <div className="bg-muted/30 rounded-lg p-4 min-h-[200px] whitespace-pre-wrap font-mono text-sm">
                                {functionalSpec || '尚未填寫功能規格'}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Design Prototypes Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="flex items-center gap-2">
                                <ImageIcon className="w-5 h-5" />
                                設計雛形
                            </h3>
                            <p className="text-sm text-muted-foreground">貼上雛形網址、畫面圖片及說明</p>
                        </div>
                        {isEditing && (
                            <Button variant="outline" size="sm" onClick={addDesignPrototype}>
                                <Plus className="w-4 h-4 mr-1" />
                                新增雛形
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {designPrototypes.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            {isEditing ? (
                                <div className="space-y-2">
                                    <ImageIcon className="w-12 h-12 mx-auto opacity-30" />
                                    <p>點擊「新增雛形」按鈕開始添加設計雛形</p>
                                </div>
                            ) : (
                                <p>尚未添加設計雛形</p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {designPrototypes.map((proto, index) => (
                                <div key={proto.id} className="border rounded-lg p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="font-medium">雛形 #{index + 1}</label>
                                        {isEditing && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeDesignPrototype(proto.id)}
                                                className="text-destructive hover:text-destructive"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>

                                    {isEditing ? (
                                        <>
                                            <div className="space-y-2">
                                                <label className="text-sm text-muted-foreground">雛形網址 (Figma, InVision, etc.)</label>
                                                <Input
                                                    value={proto.url || ''}
                                                    onChange={(e) => updateDesignPrototype(proto.id, 'url', e.target.value)}
                                                    placeholder="https://figma.com/..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm text-muted-foreground">圖片</label>
                                                {/* Drag & Drop Zone */}
                                                <div
                                                    onDrop={(e) => handleImageDrop(proto.id, e)}
                                                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                                    onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                                    className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                                                >
                                                    {proto.imageUrl ? (
                                                        <div className="space-y-3">
                                                            <img
                                                                src={proto.imageUrl}
                                                                alt="Preview"
                                                                className="max-h-48 mx-auto rounded-lg"
                                                            />
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => updateDesignPrototype(proto.id, 'imageUrl', '')}
                                                            >
                                                                <Trash2 className="w-4 h-4 mr-1" />
                                                                移除圖片
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                                                            <p className="text-sm text-muted-foreground">
                                                                拖曳圖片到此處，或點擊上傳
                                                            </p>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={(e) => handleImageUpload(proto.id, e)}
                                                                className="hidden"
                                                                id={`upload-${proto.id}`}
                                                            />
                                                            <label htmlFor={`upload-${proto.id}`}>
                                                                <Button variant="outline" size="sm" asChild>
                                                                    <span>
                                                                        <Upload className="w-4 h-4 mr-1" />
                                                                        選擇檔案
                                                                    </span>
                                                                </Button>
                                                            </label>
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Or paste URL */}
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-xs text-muted-foreground">或貼上圖片網址：</span>
                                                    <Input
                                                        value={proto.imageUrl?.startsWith('data:') ? '' : (proto.imageUrl || '')}
                                                        onChange={(e) => updateDesignPrototype(proto.id, 'imageUrl', e.target.value)}
                                                        placeholder="https://..."
                                                        className="flex-1"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm text-muted-foreground">說明</label>
                                                <Textarea
                                                    value={proto.description}
                                                    onChange={(e) => updateDesignPrototype(proto.id, 'description', e.target.value)}
                                                    placeholder="描述這個畫面..."
                                                    rows={3}
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {proto.url && (
                                                <div className="flex items-center gap-2">
                                                    <LinkIcon className="w-4 h-4 text-muted-foreground" />
                                                    <a
                                                        href={proto.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary hover:underline"
                                                    >
                                                        {proto.url}
                                                    </a>
                                                </div>
                                            )}
                                            {proto.imageUrl && (
                                                <div className="rounded-lg overflow-hidden border">
                                                    <img
                                                        src={proto.imageUrl}
                                                        alt={proto.description || `設計雛形 ${index + 1}`}
                                                        className="max-w-full h-auto"
                                                    />
                                                </div>
                                            )}
                                            {proto.description && (
                                                <p className="text-muted-foreground">{proto.description}</p>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
