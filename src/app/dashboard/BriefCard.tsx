import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { MorningBrief } from '../../lib/ai/GeneratorService';
import { 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  TrendingUp,
  Clock,
  Ban,
  MessageSquare,
  RefreshCw
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArtifactView } from '@/features/inbox/components/ArtifactView';

interface BriefCardProps {
  brief: MorningBrief;
  loading?: boolean;
  onRegenerate?: () => void;
}

export function BriefCard({ brief, loading, onRegenerate }: BriefCardProps) {
  const [selectedArtifactId, setSelectedArtifactId] = React.useState<string | null>(null);
  const [showMoreRisks, setShowMoreRisks] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(true);

  if (loading) {
    return (
      <Card className="border-accent/30 bg-accent/5 animate-pulse">
        <CardContent className="p-8">
          <div className="h-4 bg-accent/10 rounded-[var(--radius)] w-1/4 mb-4" />
          <div className="h-8 bg-accent/10 rounded-[var(--radius)] w-3/4 mb-6" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-20 bg-accent/10 rounded-[var(--radius)]" />
            <div className="h-20 bg-accent/10 rounded-[var(--radius)]" />
            <div className="h-20 bg-accent/10 rounded-[var(--radius)]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayedRisks = showMoreRisks ? brief.risks : brief.risks.slice(0, 3);
  const topActions = brief.actions.slice(0, 3);

  return (
    <div className="grid gap-6">
      {/* Hero Brief Section */}
      <Card className="border-accent/30 bg-gradient-to-br from-accent/10 via-background to-background overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Sparkles className="w-32 h-32 text-accent" />
        </div>
        <CardContent className="p-6 md:p-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-accent">
              <Sparkles className="w-5 h-5" />
              <label className="uppercase tracking-wider">晨間簡報 Morning Briefing</label>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 hover:text-accent"
                onClick={() => onRegenerate?.()}
              >
                <RefreshCw className="w-3 h-3" />
                <label>重新生成</label>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <label>{isExpanded ? '收合' : '展開'}</label>
              </Button>
            </div>
          </div>
          
          <div className="mb-6">
            <h2 className="max-w-3xl">
              {brief.summary}
            </h2>
          </div>

          {isExpanded && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-[var(--radius-lg)] bg-background border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <TrendingUp className="w-4 h-4" /> 
                  <label>專案完成率</label>
                </div>
                <div className="flex items-end gap-2 mb-2">
                  <h3 className="text-primary">{brief.stats.completion_rate}%</h3>
                </div>
                <Progress value={brief.stats.completion_rate} className="h-2" />
              </div>

              <div className="p-4 rounded-[var(--radius-lg)] bg-background border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Ban className="w-4 h-4 text-destructive" /> 
                  <label>卡關任務</label>
                </div>
                <h3 className="text-destructive">{brief.stats.blocked_count}</h3>
                <p className="opacity-70 mt-1">
                  <label>需要立即介入</label>
                </p>
              </div>

              <div className="p-4 rounded-[var(--radius-lg)] bg-background border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Clock className="w-4 h-4 text-amber-500" /> 
                  <label>逾期項目</label>
                </div>
                <h3 className="text-amber-500">{brief.stats.overdue_count}</h3>
                <p className="opacity-70 mt-1">
                  <label>已超過預計期限</label>
                </p>
              </div>

              <div className="p-4 rounded-[var(--radius-lg)] bg-background border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <MessageSquare className="w-4 h-4 text-accent" /> 
                  <label>待客戶回覆</label>
                </div>
                <h3 className="text-accent">{brief.stats.pending_client_count}</h3>
                <p className="opacity-70 mt-1">
                  <label>等待外部資源</label>
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actionable Insights - 今日重點 3 件事 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Action Recommendations - 優先顯示 */}
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardHeader className="pb-3">
            <h4 className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" /> 
              今日優先行動（最多 3 件）
            </h4>
            <p className="opacity-70 mt-1">
              <label>虛擬專案秘書建議您優先處理以下事項</label>
            </p>
          </CardHeader>
          <CardContent className="grid gap-3">
            {topActions.length > 0 ? (
              topActions.map((action, idx) => (
                <div 
                  key={idx} 
                  className="flex items-start justify-between p-4 rounded-[var(--radius-lg)] bg-white border border-emerald-100 group cursor-pointer hover:shadow-[var(--elevation-sm)] transition-all"
                  onClick={() => action.citation_id && setSelectedArtifactId(action.citation_id)}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <label className="text-white">{idx + 1}</label>
                    </div>
                    <div className="flex-1 space-y-1">
                      <p>{action.title}</p>
                      {action.citation_label && (
                        <p className="opacity-60">
                          <label>來源：{action.citation_label}</label>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      {action.importance}
                    </Badge>
                    <ArrowRight className="w-4 h-4 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 px-4 rounded-[var(--radius-lg)] bg-white border border-emerald-100">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-emerald-700">暫無優先行動建議</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Risks - 次要顯示 */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <h4 className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4" /> 
              風險與警告
            </h4>
            <p className="opacity-70 mt-1">
              <label>需要您關注的潛在風險</label>
            </p>
          </CardHeader>
          <CardContent className="grid gap-3">
            {displayedRisks.length > 0 ? (
              <>
                {displayedRisks.map((risk, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-start justify-between p-3 rounded-[var(--radius-lg)] bg-destructive/5 border border-destructive/10 group cursor-pointer hover:bg-destructive/10 transition-colors"
                    onClick={() => risk.citation && setSelectedArtifactId(risk.citation)}
                  >
                    <p className="flex-1">{risk.title}</p>
                    <Badge 
                      variant="outline" 
                      className={`ml-2 shrink-0 ${
                        risk.severity === 'high' 
                          ? 'bg-destructive text-destructive-foreground border-destructive' 
                          : 'bg-amber-100 text-amber-800 border-amber-200'
                      }`}
                    >
                      {risk.severity === 'high' ? '高' : risk.severity === 'medium' ? '中' : '低'}
                    </Badge>
                  </div>
                ))}
                {brief.risks.length > 3 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowMoreRisks(!showMoreRisks)}
                    className="w-full"
                  >
                    {showMoreRisks ? '收合風險' : `顯示更多風險 (${brief.risks.length - 3})`}
                  </Button>
                )}
              </>
            ) : (
              <div className="text-center py-8 px-4 rounded-[var(--radius-lg)] bg-emerald-50 border border-emerald-100">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-emerald-700">目前無顯著風險</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Artifact Modal for Citations */}
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
