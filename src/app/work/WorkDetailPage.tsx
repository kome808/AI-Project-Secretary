import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Package,
  Users,
  Calendar,
  AlertTriangle,
  Ban,
  Clock,
  CheckCircle2,
  ArrowLeft,
  FileText,
  MessageSquare,
  List,
  Send,
  Sparkles
} from 'lucide-react';
import { getStorageClient } from '../../lib/storage';
import { WorkPackage, Member, Item, Milestone, WorkActivity } from '../../lib/storage/types';
import { toast } from 'sonner';
import { ArtifactView } from '@/features/inbox/components/ArtifactView';
import { ChatInput } from '@/features/ai/components/ChatInput';

export function WorkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { currentProject } = useProject();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [workPackage, setWorkPackage] = useState<WorkPackage | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [relatedItems, setRelatedItems] = useState<Item[]>([]);
  const [activities, setActivities] = useState<WorkActivity[]>([]);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);

  useEffect(() => {
    if (currentProject && id) {
      loadData();
    }
  }, [currentProject, id]);

  const loadData = async () => {
    if (!currentProject || !id) return;
    setLoading(true);
    const storage = getStorageClient();

    const [wpRes, membersRes, milestonesRes, itemsRes, activitiesRes] = await Promise.all([
      storage.getWorkPackages(currentProject.id),
      storage.getMembers(currentProject.id),
      storage.getMilestones(currentProject.id),
      storage.getItems(currentProject.id),
      storage.getWorkActivities(currentProject.id, id)
    ]);

    if (wpRes.data) {
      const wp = wpRes.data.find(w => w.id === id);
      setWorkPackage(wp || null);
    }
    if (membersRes.data) setMembers(membersRes.data);
    if (milestonesRes.data) setMilestones(milestonesRes.data);
    if (itemsRes.data) {
      // Filter items related to this work package
      const related = itemsRes.data.filter(item => item.meta?.work_package_id === id);
      setRelatedItems(related);
    }
    if (activitiesRes.data) setActivities(activitiesRes.data);

    setLoading(false);
  };

  const handleUpdate = async (content: string) => {
    if (!currentProject || !id || !content.trim()) return;

    setIsSubmittingUpdate(true);
    const storage = getStorageClient();

    try {
      // Create activity
      const { error } = await storage.createWorkActivity({
        work_package_id: id,
        project_id: currentProject.id,
        content: content.trim()
      });

      if (error) throw error;

      toast.success('進度回報已提交', {
        description: 'AI 正在分析是否需要產生建議卡...'
      });

      // Reload activities
      await loadData();
    } catch (error) {
      console.error('Error submitting update:', error);
      toast.error('提交失敗，請重試');
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  const getOwnerName = (ownerId?: string) => {
    if (!ownerId) return '未指派';
    const member = members.find(m => m.id === ownerId);
    return member?.name || '未知';
  };

  const getMilestoneName = (milestoneId?: string) => {
    if (!milestoneId) return null;
    const milestone = milestones.find(m => m.id === milestoneId);
    return milestone?.name;
  };

  const getCompletionRate = () => {
    if (!workPackage) return 0;
    if (workPackage.completion_rate !== undefined) return workPackage.completion_rate;

    const actions = relatedItems.filter(item => item.type === 'action');
    if (actions.length === 0) return 0;

    const doneCount = actions.filter(i => i.status === 'done').length;
    return Math.round((doneCount / actions.length) * 100);
  };

  const getRiskItems = () => {
    const blocked = relatedItems.filter(i => i.status === 'blocked');
    const overdue = relatedItems.filter(i => {
      if (!i.due_date) return false;
      return new Date(i.due_date) < new Date();
    });
    const highRiskCRs = relatedItems.filter(i => i.type === 'cr' && i.meta?.risk_level === 'high');

    return { blocked, overdue, highRiskCRs };
  };

  if (loading || !workPackage) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="animate-pulse space-y-4 text-center">
          <Package className="h-16 w-16 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">載入工作包詳情...</p>
        </div>
      </div>
    );
  }

  const completionRate = getCompletionRate();
  const milestoneName = getMilestoneName(workPackage.milestone_id);
  const { blocked, overdue, highRiskCRs } = getRiskItems();
  const hasRisk = blocked.length > 0 || overdue.length > 0 || highRiskCRs.length > 0;

  const actions = relatedItems.filter(i => i.type === 'action');
  const pending = relatedItems.filter(i => i.type === 'pending');
  const crs = relatedItems.filter(i => i.type === 'cr');
  const decisions = relatedItems.filter(i => i.type === 'decision');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/app/work')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1>{workPackage.title}</h1>
            <p className="text-muted-foreground mt-1">
              <label>工作包詳情與執行狀態</label>
            </p>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <Card className={hasRisk ? 'border-destructive/30' : ''}>
        <CardHeader>
          <h3 className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            工作包摘要
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Description */}
          {workPackage.description && (
            <p className="opacity-80">{workPackage.description}</p>
          )}

          {/* Meta Info Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Owner */}
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <div>
                <label className="opacity-70">負責人</label>
                <p>{getOwnerName(workPackage.owner_id)}</p>
              </div>
            </div>

            {/* Wave / Milestone */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <label className="opacity-70">波段 / 里程碑</label>
                <p>{workPackage.wave || milestoneName || '未設定'}</p>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
              <div>
                <label className="opacity-70">狀態</label>
                <Badge variant="outline" className={
                  workPackage.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    workPackage.status === 'in_progress' ? 'bg-primary/10 text-primary border-primary/30' :
                      'bg-muted text-muted-foreground'
                }>
                  {workPackage.status === 'completed' ? '已完成' :
                    workPackage.status === 'in_progress' ? '進行中' :
                      workPackage.status === 'on_hold' ? '暫停' : '未開始'}
                </Badge>
              </div>
            </div>

            {/* Completion Rate */}
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1">
                <label className="opacity-70">完成率</label>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={completionRate} className="h-2 flex-1" />
                  <span className="text-primary">{completionRate}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Risk Alerts */}
          {hasRisk && (
            <div className="flex items-start gap-2 p-3 rounded-[var(--radius-lg)] bg-destructive/5 border border-destructive/20">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <div className="space-y-1 flex-1">
                <label className="text-destructive">風險警告</label>
                <div className="space-y-1 opacity-80">
                  {blocked.length > 0 && <p>• {blocked.length} 項任務卡關</p>}
                  {overdue.length > 0 && <p>• {overdue.length} 項任務逾期</p>}
                  {highRiskCRs.length > 0 && <p>• {highRiskCRs.length} 項高風險變更</p>}
                </div>
              </div>
            </div>
          )}

          {/* Citation */}
          {workPackage.source_artifact_id && (
            <div className="flex items-center justify-between p-3 rounded-[var(--radius-lg)] bg-muted/30 border">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <div>
                  <label className="opacity-70">來源文件</label>
                  <p>WBS / 規格書（可回溯）</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedArtifactId(workPackage.source_artifact_id!)}
              >
                查看來源
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update Input */}
      <Card className="border-accent/30 bg-accent/5">
        <CardHeader className="pb-3">
          <h3 className="flex items-center gap-2 text-accent">
            <MessageSquare className="w-5 h-5" />
            回報進度 / 更新狀態
          </h3>
          <p className="opacity-70 mt-1">
            <label>用一句話回報，AI 會協助產生必要的追蹤項目</label>
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Quick Action Chips */}
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="cursor-pointer hover:bg-accent/10">
                更新進度
              </Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-accent/10">
                標記卡關
              </Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-accent/10">
                等客戶回覆
              </Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-accent/10">
                提出變更
              </Badge>
            </div>

            <ChatInput
              onSend={(text) => handleUpdate(text)}
              isLoading={isSubmittingUpdate}
              placeholder="例如：登入頁已完成，等客戶確認 SSO 流程..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Related Items */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Actions */}
        <Card>
          <CardHeader>
            <h4 className="flex items-center gap-2">
              <List className="w-4 h-4" />
              相關任務 ({actions.length})
            </h4>
          </CardHeader>
          <CardContent>
            {actions.length > 0 ? (
              <div className="space-y-2">
                {actions.slice(0, 5).map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-[var(--radius)] hover:bg-muted/30 cursor-pointer"
                    onClick={() => navigate('/app/tasks?view=actions')}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${item.status === 'done' ? 'bg-emerald-500' :
                        item.status === 'blocked' ? 'bg-destructive' :
                          'bg-primary'
                        }`} />
                      <p className="truncate">{item.title}</p>
                    </div>
                    <Badge variant="outline" className="ml-2 shrink-0">
                      {item.status}
                    </Badge>
                  </div>
                ))}
                {actions.length > 5 && (
                  <Button variant="ghost" size="sm" className="w-full" onClick={() => navigate('/app/tasks?view=actions')}>
                    查看全部 {actions.length} 項任務
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground opacity-70">
                暫無相關任務
              </p>
            )}
          </CardContent>
        </Card>

        {/* Pending */}
        <Card>
          <CardHeader>
            <h4 className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              等待項目 ({pending.length})
            </h4>
          </CardHeader>
          <CardContent>
            {pending.length > 0 ? (
              <div className="space-y-2">
                {pending.slice(0, 5).map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-[var(--radius)] hover:bg-muted/30 cursor-pointer"
                    onClick={() => navigate('/app/tasks?view=todos')}
                  >
                    <p className="flex-1 truncate">{item.title}</p>
                    <Badge variant="outline" className="ml-2 text-accent border-accent/30 shrink-0">
                      等待中
                    </Badge>
                  </div>
                ))}
                {pending.length > 5 && (
                  <Button variant="ghost" size="sm" className="w-full" onClick={() => navigate('/app/tasks?view=todos')}>
                    查看全部 {pending.length} 項
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground opacity-70">
                暫無等待項目
              </p>
            )}
          </CardContent>
        </Card>

        {/* Change Requests */}
        {crs.length > 0 && (
          <Card>
            <CardHeader>
              <h4 className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                變更需求 ({crs.length})
              </h4>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {crs.slice(0, 5).map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-[var(--radius)] hover:bg-muted/30 cursor-pointer"
                    onClick={() => navigate('/app/tasks?view=work')}
                  >
                    <p className="flex-1 truncate">{item.title}</p>
                    <Badge
                      variant="outline"
                      className={`ml-2 shrink-0 ${item.meta?.risk_level === 'high'
                        ? 'bg-destructive text-destructive-foreground border-destructive'
                        : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}
                    >
                      {item.meta?.risk_level === 'high' ? '高風險' : '中風險'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Decisions */}
        {decisions.length > 0 && (
          <Card>
            <CardHeader>
              <h4 className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                相關決策 ({decisions.length})
              </h4>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {decisions.slice(0, 5).map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-[var(--radius)] hover:bg-muted/30 cursor-pointer"
                    onClick={() => navigate('/app/tasks?view=actions')}
                  >
                    <p className="flex-1 truncate">{item.title}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Activities Timeline */}
      {activities.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              回報記錄 ({activities.length})
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activities.map(activity => (
                <div key={activity.id} className="flex gap-3 pb-3 border-b last:border-0">
                  <div className="w-2 h-2 rounded-full bg-accent mt-2 shrink-0" />
                  <div className="flex-1 space-y-1">
                    <p>{activity.content}</p>
                    <label className="opacity-50">
                      {new Date(activity.created_at).toLocaleString()}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Artifact Modal */}
      {selectedArtifactId && (
        <ArtifactView
          artifactId={selectedArtifactId}
          open={!!selectedArtifactId}
          onOpenChange={(open) => !open && setSelectedArtifactId(null)}
        />
      )}
    </div>
  );
}
