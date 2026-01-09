import { useEffect, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Package,
  Users,
  Calendar,
  AlertTriangle,
  Ban,
  Clock,
  CheckCircle2,
  Folder,
  ChevronRight,
  FileText,
  MapPin
} from 'lucide-react';
import { getStorageClient } from '../../lib/storage';
import { WorkPackage, Member, Item, Milestone } from '../../lib/storage/types';

export function WorkListPage() {
  const { currentProject, isLoading } = useProject();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (currentProject) {
      loadData();
    }
  }, [currentProject]);

  const loadData = async () => {
    if (!currentProject) return;
    setLoading(true);
    const storage = getStorageClient();

    const [wpRes, membersRes, milestonesRes, itemsRes] = await Promise.all([
      storage.getWorkPackages(currentProject.id),
      storage.getMembers(currentProject.id),
      storage.getMilestones(currentProject.id),
      storage.getItems(currentProject.id)
    ]);

    if (wpRes.data) setWorkPackages(wpRes.data);
    if (membersRes.data) setMembers(membersRes.data);
    if (milestonesRes.data) setMilestones(milestonesRes.data);
    if (itemsRes.data) {
      // 排除 AI 建議項目 (它們屬於收件匣)
      setItems(itemsRes.data.filter(item => item.status !== 'suggestion'));
    }

    setLoading(false);
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

  const getRiskInfo = (wp: WorkPackage) => {
    // Get related items for this work package
    const relatedItems = items.filter(item =>
      item.meta?.work_package_id === wp.id
    );

    const hasBlocked = relatedItems.some(i => i.status === 'blocked');
    const hasOverdue = relatedItems.some(i => {
      if (!i.due_date) return false;
      return new Date(i.due_date) < new Date();
    });
    const hasHighRiskCR = relatedItems.some(i =>
      i.type === 'cr' && i.meta?.risk_level === 'high'
    );

    if (hasBlocked) return { level: 'blocked', icon: Ban, text: '卡關', color: 'destructive' };
    if (hasOverdue) return { level: 'overdue', icon: Clock, text: '逾期', color: 'amber-500' };
    if (hasHighRiskCR) return { level: 'high-risk', icon: AlertTriangle, text: '高風險 CR', color: 'amber-500' };
    return null;
  };

  const getCompletionRate = (wp: WorkPackage) => {
    if (wp.completion_rate !== undefined) return wp.completion_rate;

    // Calculate from related actions
    const relatedActions = items.filter(item =>
      item.type === 'action' && item.meta?.work_package_id === wp.id
    );

    if (relatedActions.length === 0) return 0;

    const doneCount = relatedActions.filter(i => i.status === 'completed').length;
    return Math.round((doneCount / relatedActions.length) * 100);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="animate-pulse space-y-4 text-center">
          <Folder className="h-16 w-16 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">載入中...</p>
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-4 p-8">
        <Folder className="h-20 w-20 text-muted-foreground" />
        <div className="space-y-2">
          <h2 className="text-foreground">歡迎使用 AI 專案秘書</h2>
          <p className="text-muted-foreground max-w-md">
            請點擊左側選單上方的「建立專案」按鈕建立您的第一個專案
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="animate-pulse space-y-4 text-center">
          <Package className="h-16 w-16 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">載入工作包資料...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2">
            <Package className="h-6 w-6" />
            工作包清單
          </h1>
          <p className="text-muted-foreground mt-1">
            <label>WBS 執行地圖與交付主幹</label>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/app/work/map')}
          >
            <MapPin className="w-4 h-4 mr-2" />
            <label>地圖視圖</label>
          </Button>
          <Button onClick={() => navigate('/app/inbox')}>
            <label>從 WBS 建立工作包</label>
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <label className="text-muted-foreground">總工作包</label>
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
            <h3 className="mt-2">{workPackages.length}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <label className="text-muted-foreground">進行中</label>
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <h3 className="mt-2 text-primary">
              {workPackages.filter(wp => wp.status === 'in_progress').length}
            </h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <label className="text-muted-foreground">已完成</label>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <h3 className="mt-2 text-emerald-600">
              {workPackages.filter(wp => wp.status === 'completed').length}
            </h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <label className="text-muted-foreground">有風險</label>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <h3 className="mt-2 text-destructive">
              {workPackages.filter(wp => getRiskInfo(wp) !== null).length}
            </h3>
          </CardContent>
        </Card>
      </div>

      {/* Work Package List */}
      <Card>
        <CardHeader>
          <h3>所有工作包</h3>
        </CardHeader>
        <CardContent>
          {workPackages.length > 0 ? (
            <div className="space-y-3">
              {workPackages.map(wp => {
                const riskInfo = getRiskInfo(wp);
                const completionRate = getCompletionRate(wp);
                const milestoneName = getMilestoneName(wp.milestone_id);

                return (
                  <div
                    key={wp.id}
                    className="flex items-center justify-between p-4 border rounded-[var(--radius-lg)] hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/app/work/${wp.id}`)}
                  >
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      {/* Status Indicator */}
                      <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${wp.status === 'completed' ? 'bg-emerald-500' :
                        wp.status === 'in_progress' ? 'bg-primary' :
                          wp.status === 'on_hold' ? 'bg-amber-500' :
                            'bg-muted-foreground'
                        }`} />

                      {/* Content */}
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex items-start gap-2">
                          <p className="flex-1 truncate">{wp.title}</p>
                          {riskInfo && (
                            <Badge
                              variant="outline"
                              className={`shrink-0 text-${riskInfo.color} border-${riskInfo.color}/30 bg-${riskInfo.color}/5`}
                            >
                              <riskInfo.icon className="w-3 h-3 mr-1" />
                              {riskInfo.text}
                            </Badge>
                          )}
                        </div>

                        {/* Meta Info */}
                        <div className="flex items-center gap-4 flex-wrap">
                          {/* Owner */}
                          <div className="flex items-center gap-1.5 opacity-70">
                            <Users className="w-3 h-3" />
                            <label>{getOwnerName(wp.owner_id)}</label>
                          </div>

                          {/* Wave / Milestone */}
                          {(wp.wave || milestoneName) && (
                            <div className="flex items-center gap-1.5 opacity-70">
                              <Calendar className="w-3 h-3" />
                              <label>{wp.wave || milestoneName}</label>
                            </div>
                          )}

                          {/* Completion Rate */}
                          <div className="flex items-center gap-2 opacity-70">
                            <CheckCircle2 className="w-3 h-3" />
                            <label>完成率 {completionRate}%</label>
                          </div>

                          {/* Citation */}
                          {wp.source_artifact_id && (
                            <div className="flex items-center gap-1.5 opacity-70">
                              <FileText className="w-3 h-3" />
                              <label>來源可追溯</label>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Chevron */}
                      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-[var(--radius-xl)]">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="mb-4">目前沒有工作包</p>
              <Button onClick={() => navigate('/app/inbox')}>
                <label>從 WBS / 規格書建立工作包</label>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
