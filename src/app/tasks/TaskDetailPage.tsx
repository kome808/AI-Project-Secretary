import { useEffect, useState } from 'react';
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
    MessageSquare,
    Layers,
    Briefcase
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { getStorageClient } from '../../lib/storage';
import { Item, Member } from '../../lib/storage/types';
import { toast } from 'sonner';
import { STATUS_OPTIONS, getStatusLabel, getStatusColor } from '../../lib/storage/statusHelpers';

export function TaskDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { currentProject } = useProject();

    const [loading, setLoading] = useState(true);
    const [item, setItem] = useState<Item | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState('');
    const [editedDescription, setEditedDescription] = useState('');
    const [editedAssigneeId, setEditedAssigneeId] = useState<string>('');
    const [editedDueDate, setEditedDueDate] = useState<string>('');
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
                setEditedTitle(foundItem.title);
                setEditedDescription(foundItem.description || '');
                setEditedAssigneeId(foundItem.assignee_id || '');
                // Format date for input type="date"
                setEditedDueDate(foundItem.due_date ? foundItem.due_date.split('T')[0] : '');
            }
        }
        if (membersRes.data) {
            setMembers(membersRes.data);
        }

        setLoading(false);
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

    const isOverdue = (item: Item) => {
        if (!item.due_date || item.status === 'completed') return false;
        return new Date(item.due_date) < new Date();
    };

    const handleStartEdit = () => {
        if (item) {
            setEditedTitle(item.title);
            setEditedDescription(item.description || '');
            setEditedAssigneeId(item.assignee_id || '');
            setEditedDueDate(item.due_date ? item.due_date.split('T')[0] : '');
            setIsEditing(true);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
    };

    const handleSave = async () => {
        if (!item || !editedTitle.trim()) return;

        setSaving(true);
        const storage = getStorageClient();

        try {
            const updates: Partial<Item> = {
                title: editedTitle.trim(),
                description: editedDescription.trim(),
                assignee_id: editedAssigneeId || undefined,
                due_date: editedDueDate || undefined,
                updated_at: new Date().toISOString()
            };

            const { error } = await storage.updateItem(item.id, updates);

            if (error) throw error;

            setItem({
                ...item,
                ...updates
            });
            setIsEditing(false);
            toast.success('任務已更新');
        } catch (error) {
            console.error('Error saving task:', error);
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
            toast.success('狀態已更新');
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('更新失敗');
        }
    };

    const handleDelete = async () => {
        if (!item) return;

        if (!confirm('確定要刪除此任務嗎？')) return;

        const storage = getStorageClient();
        try {
            const { error } = await storage.deleteItem(item.id);
            if (error) throw error;

            toast.success('任務已刪除');
            navigate('/app/tasks');
        } catch (error) {
            console.error('Error deleting task:', error);
            toast.error('刪除失敗');
        }
    };

    const handleConvert = async () => {
        if (!item) return;
        const isFeature = item.meta?.isFeatureModule;
        const targetType = isFeature ? '一般任務' : '功能模組';

        if (!confirm(`確定要將此項目轉換為${targetType}嗎？`)) return;

        const storage = getStorageClient();
        try {
            await storage.updateItem(item.id, {
                meta: { ...item.meta, isFeatureModule: !isFeature }
            });
            toast.success(`已轉換為${targetType}`);
            loadData();
        } catch (error) {
            console.error('Error converting item:', error);
            toast.error('轉換失敗');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-pulse text-center space-y-3">
                    <Clock className="h-16 w-16 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground">載入任務詳情...</p>
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
                        <p className="text-lg font-medium">找不到任務</p>
                        <p className="text-muted-foreground">此任務可能已被刪除或不存在</p>
                    </div>
                    <Button onClick={() => navigate('/app/tasks')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        返回任務列表
                    </Button>
                </div>
            </div>
        );
    }

    const statusLabel = getStatusLabel(item.status);
    const statusColorClass = getStatusColor(item.status);
    const overdue = isOverdue(item);

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/app/tasks')}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <p className="text-sm text-muted-foreground">任務詳情</p>
                        <h1 className="text-xl font-semibold">
                            {isEditing ? '編輯任務' : item.title}
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
                            <Button variant="outline" size="sm" onClick={handleConvert}>
                                {item.meta?.isFeatureModule ? (
                                    <>
                                        <Briefcase className="w-4 h-4 mr-1" />
                                        轉為普通任務
                                    </>
                                ) : (
                                    <>
                                        <Layers className="w-4 h-4 mr-1" />
                                        轉為功能模組
                                    </>
                                )}
                            </Button>
                            <Button variant="destructive" size="sm" onClick={handleDelete}>
                                <Trash2 className="w-4 h-4 mr-1" />
                                刪除
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Main Content Card */}
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
                                    placeholder="任務標題"
                                />
                            ) : (
                                <h2 className="text-xl font-semibold">{item.title}</h2>
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
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            說明
                        </label>
                        {isEditing ? (
                            <Textarea
                                value={editedDescription}
                                onChange={(e) => setEditedDescription(e.target.value)}
                                placeholder="輸入任務說明..."
                                rows={4}
                            />
                        ) : (
                            <p className="text-foreground bg-muted/30 rounded-lg p-4 min-h-[100px]">
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
                        <div className={`flex items-center gap-3 p-4 rounded-lg ${isEditing ? 'bg-white border' : overdue ? 'bg-destructive/10' : 'bg-muted/30'}`}>
                            <Calendar className={`w-5 h-5 ${overdue && !isEditing ? 'text-destructive' : 'text-muted-foreground'}`} />
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
                                    <p className={`font-medium ${overdue ? 'text-destructive' : ''}`}>
                                        {formatDate(item.due_date)}
                                        {overdue && <span className="ml-2 text-sm">(已逾期)</span>}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Created At */}
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
                            <Clock className="w-5 h-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">建立時間</p>
                                <p className="font-medium">{formatDate(item.created_at)}</p>
                            </div>
                        </div>

                        {/* Updated At */}
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
                            <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">最後更新</p>
                                <p className="font-medium">{formatDate(item.updated_at)}</p>
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
        </div>
    );
}
