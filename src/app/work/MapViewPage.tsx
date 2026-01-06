import React, { useEffect, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  MapPin,
  ArrowLeft,
  Calendar,
  Package,
  AlertTriangle,
  Ban,
  Clock,
  CheckCircle2,
  Folder,
  List
} from 'lucide-react';
import { getStorageClient } from '../../lib/storage';
import { WorkPackage, Milestone, Item } from '../../lib/storage/types';

export function MapViewPage() {
  const { currentProject, isLoading } = useProject();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedWave, setSelectedWave] = useState<string>('all');

  useEffect(() => {
    if (currentProject) {
      loadData();
    }
  }, [currentProject]);

  const loadData = async () => {
    if (!currentProject) return;
    setLoading(true);
    const storage = getStorageClient();

    const [wpRes, milestonesRes, itemsRes] = await Promise.all([
      storage.getWorkPackages(currentProject.id),
      storage.getMilestones(currentProject.id),
      storage.getItems(currentProject.id)
    ]);

    if (wpRes.data) setWorkPackages(wpRes.data);
    if (milestonesRes.data) setMilestones(milestonesRes.data);
    if (itemsRes.data) setItems(itemsRes.data);

    setLoading(false);
  };

  const getWaves = () => {
    const waves = new Set<string>();
    workPackages.forEach(wp => {
      if (wp.wave) waves.add(wp.wave);
      if (wp.milestone_id) {
        const milestone = milestones.find(m => m.id === wp.milestone_id);
        if (milestone) waves.add(milestone.name);
      }
    });
    return Array.from(waves);
  };

  const getFilteredWorkPackages = () => {
    if (selectedWave === 'all') return workPackages;
    return workPackages.filter(wp => {
      if (wp.wave === selectedWave) return true;
      if (wp.milestone_id) {
        const milestone = milestones.find(m => m.id === wp.milestone_id);
        return milestone?.name === selectedWave;
      }
      return false;
    });
  };

  const getCompletionRate = (wp: WorkPackage) => {
    if (wp.completion_rate !== undefined) return wp.completion_rate;
    
    const relatedActions = items.filter(item => 
      item.type === 'action' && item.meta?.work_package_id === wp.id
    );

    if (relatedActions.length === 0) return 0;
    
    const doneCount = relatedActions.filter(i => i.status === 'done').length;
    return Math.round((doneCount / relatedActions.length) * 100);
  };

  const getRiskInfo = (wp: WorkPackage) => {
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

    if (hasBlocked) return { icon: Ban, text: '卡關', color: 'destructive' };
    if (hasOverdue) return { icon: Clock, text: '逾期', color: 'amber-500' };
    if (hasHighRiskCR) return { icon: AlertTriangle, text: '高風險', color: 'amber-500' };
    return null;
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
          <MapPin className="h-16 w-16 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">載入執行地圖...</p>
        </div>
      </div>
    );
  }

  const waves = getWaves();
  const filteredWorkPackages = getFilteredWorkPackages();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/work')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="flex items-center gap-2">
              <MapPin className="h-6 w-6" />
              執行地圖視圖
            </h1>
            <p className="text-muted-foreground mt-1">
              <label>工作包 × 波段 / 里程碑 對齊視圖</label>
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate('/work')}>
          <List className="w-4 h-4 mr-2" />
          <label>清單視圖</label>
        </Button>
      </div>

      {/* Wave / Milestone Filter */}
      <Card>
        <CardHeader>
          <h3 className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            波段 / 里程碑篩選
          </h3>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Badge
              variant={selectedWave === 'all' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedWave('all')}
            >
              全部 ({workPackages.length})
            </Badge>
            {waves.map(wave => {
              const count = workPackages.filter(wp => {
                if (wp.wave === wave) return true;
                if (wp.milestone_id) {
                  const milestone = milestones.find(m => m.id === wp.milestone_id);
                  return milestone?.name === wave;
                }
                return false;
              }).length;

              return (
                <Badge
                  key={wave}
                  variant={selectedWave === wave ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setSelectedWave(wave)}
                >
                  {wave} ({count})
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Work Package Grid by Wave */}
      <div className="space-y-6">
        {filteredWorkPackages.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredWorkPackages.map(wp => {
              const completionRate = getCompletionRate(wp);
              const riskInfo = getRiskInfo(wp);

              return (
                <Card
                  key={wp.id}
                  className={`cursor-pointer hover:shadow-[var(--elevation-sm)] transition-all ${
                    riskInfo ? 'border-destructive/30' : ''
                  }`}
                  onClick={() => navigate(`/work/${wp.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="flex-1">{wp.title}</h4>
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
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Wave/Milestone Badge */}
                    {(wp.wave || wp.milestone_id) && (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                        <Calendar className="w-3 h-3 mr-1" />
                        {wp.wave || milestones.find(m => m.id === wp.milestone_id)?.name}
                      </Badge>
                    )}

                    {/* Progress */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="opacity-70">完成進度</label>
                        <span className={`${
                          completionRate === 100 ? 'text-emerald-600' :
                          completionRate >= 50 ? 'text-primary' :
                          'text-amber-600'
                        }`}>
                          {completionRate}%
                        </span>
                      </div>
                      <Progress value={completionRate} className="h-2" />
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center justify-between">
                      <label className="opacity-70">狀態</label>
                      <Badge 
                        variant="outline"
                        className={
                          wp.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          wp.status === 'in_progress' ? 'bg-primary/10 text-primary border-primary/30' :
                          wp.status === 'on_hold' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-muted text-muted-foreground'
                        }
                      >
                        {wp.status === 'completed' ? '已完成' :
                         wp.status === 'in_progress' ? '進行中' :
                         wp.status === 'on_hold' ? '暫停' : '未開始'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>目前沒有符合條件的工作包</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <h3>整體統計</h3>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center p-4 rounded-[var(--radius-lg)] bg-muted/30">
              <h2>{filteredWorkPackages.length}</h2>
              <label className="opacity-70">工作包總數</label>
            </div>
            <div className="text-center p-4 rounded-[var(--radius-lg)] bg-emerald-50 border border-emerald-200">
              <h2 className="text-emerald-700">
                {filteredWorkPackages.filter(wp => wp.status === 'completed').length}
              </h2>
              <label className="opacity-70 text-emerald-700">已完成</label>
            </div>
            <div className="text-center p-4 rounded-[var(--radius-lg)] bg-primary/10 border border-primary/30">
              <h2 className="text-primary">
                {filteredWorkPackages.filter(wp => wp.status === 'in_progress').length}
              </h2>
              <label className="opacity-70 text-primary">進行中</label>
            </div>
            <div className="text-center p-4 rounded-[var(--radius-lg)] bg-destructive/10 border border-destructive/30">
              <h2 className="text-destructive">
                {filteredWorkPackages.filter(wp => getRiskInfo(wp) !== null).length}
              </h2>
              <label className="opacity-70 text-destructive">有風險</label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
