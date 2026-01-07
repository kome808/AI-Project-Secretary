import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  MessageSquare,
  AlertTriangle,
  FileText,
  Zap,
  TrendingUp,
  Clock,
  User,
  Files
} from 'lucide-react';
import { toast } from 'sonner';

// New Hooks
import { useDashboardData, NeedsAttentionItem } from '@/features/dashboard/hooks/useDashboardData';
import { useDashboardAI } from '@/features/dashboard/hooks/useDashboardAI';
import { useProject } from '@/features/project/hooks/useProject';

// Components
import { ChatInput } from '@/features/ai/components/ChatInput';
import { TaskPreviewPanel } from '@/features/ai/components/TaskPreviewPanel';
import { TaskSuggestion } from '@/features/ai/components/TaskPreviewCard';

// Legacy Util for task planning confirmation
import { getStorageClient } from '@/lib/storage';
import { HelpTooltip } from '@/components/common/HelpTooltip';
import { tooltips } from '@/lib/help/helpContent';

export function DashboardPage() {
  const navigate = useNavigate();

  // Data Logic
  const {
    items,
    members,
    needsAttention,
    briefSummary,
    isLoading: isDataLoading,
    refetch: refetchDashboard
  } = useDashboardData();

  const { project: currentProject, isLoading: isProjectLoading } = useProject();

  // Local UI State
  const [taskPreview, setTaskPreview] = useState<{
    tasks: TaskSuggestion[];
    aiMessage: string;
  } | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');

  // AI Logic Hook
  const { handleAIInput, isAIProcessing, statusMessage, aiSuggestions, chat } = useDashboardAI({
    currentProject,
    members: members as any[],
    setTaskPreview,
    items: items as any[] // Pass items for context
  });

  const isLoading = isDataLoading || isProjectLoading;

  // Ref for auto-scrolling chat to bottom
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    // Small timeout to ensure DOM has rendered
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, 100);
    return () => clearTimeout(timer);
  }, [chat.messages, statusMessage, taskPreview]);

  // Stats Calculation
  const stats = {
    ongoing: items.filter(i => i.status === 'in_progress').length,
    completed: items.filter(i => i.status === 'completed').length,
    total: items.length
  };

  // Quick Actions
  const aiQuickActions = [
    "整理會議記錄",
    "分析需求文件",
    "建立功能模組",
    "建立變更需求 (CR)",
    "解析 WBS 文件",
    "分析 Email 轉任務",
    "規劃專案任務"
  ];

  const handleQuickAction = (action: string) => {
    setAiPrompt(action);
  };

  const handleSendMessage = async (text: string, file?: File) => {
    await handleAIInput(text, file);
    setAiPrompt(''); // Clear prompt state after sending
  };

  // Handle Task Plan Confirmation
  const handleConfirmTaskPlan = async (selectedTasks: TaskSuggestion[]) => {
    if (!currentProject || selectedTasks.length === 0) return;

    try {
      const storage = getStorageClient();
      const artifactRes = await storage.createArtifact({
        project_id: currentProject.id,
        content_type: 'text/plain',
        original_content: `AI 任務規劃：${selectedTasks.length} 個任務`,
        meta: { channel: 'paste' as any, is_temporary: true, original_channel: 'ai_planning' }
      });

      let successCount = 0;
      for (const task of selectedTasks) {
        await storage.createItem({
          project_id: currentProject.id,
          type: task.type,
          status: 'not_started',
          title: task.title,
          description: task.description,
          source_artifact_id: artifactRes.data?.id,
          due_date: task.due_date,
          assignee_id: task.assignee_id,
          priority: task.priority,
          meta: { ai_generated: true }
        });
        successCount++;
      }

      setTaskPreview(null);
      toast.success(`✅ 已建立 ${successCount} 張任務卡！`);
      refetchDashboard();

    } catch (e) {
      console.error(e);
      toast.error("建立失敗");
    }
  };

  const handleCancelTaskPlan = () => {
    setTaskPreview(null);
    toast.info('取消');
  };

  const handleItemClick = (item: NeedsAttentionItem) => {
    // Navigate to task detail page
    navigate(`/tasks/${item.id}`);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="animate-pulse space-y-4 text-center">
          <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">載入儀表板...</p>
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-4 p-8">
        <Sparkles className="h-20 w-20 text-muted-foreground" />
        <div className="space-y-2">
          <h2 className="text-foreground">歡迎使用 AI 專案秘書</h2>
          <p className="text-muted-foreground max-w-md">
            請點擊左側選單上方的「建立專案」鈕建立您的第一個專案
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12 pt-4">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-foreground/90">
          <Sparkles className="h-7 w-7" />
          儀表板
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {currentProject.name} - 今日焦點與優先事項
        </p>
      </div>

      {/* Brief Card */}
      <Card className="border shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
        <CardHeader className="pb-2 border-b-0">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-primary/80">
              <MessageSquare className="h-5 w-5" />
              晨間簡報
            </h2>
            <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100">
              <Sparkles className="w-3 h-3 mr-1" />
              AI 秘書
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-gray-700 leading-relaxed font-medium">
              {briefSummary}
            </p>
          </div>

          {needsAttention.length > 0 && (
            <div className="space-y-3">
              <label className="text-sm text-gray-500 font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                今日優先處理
              </label>

              <div className="rounded-xl border border-red-100 bg-red-50/30 overflow-hidden">
                {needsAttention.slice(0, 3).map((item, index) => (
                  <div
                    key={item.id}
                    className={`
                      group flex items-start gap-4 p-4 cursor-pointer hover:bg-red-50/50 transition-colors
                      ${index !== 0 ? 'border-t border-red-100/50' : ''}
                    `}
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="mt-1.5 w-2 h-2 rounded-full bg-red-500 shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-gray-900 truncate pr-4">
                          {item.title}
                        </p>
                        <Badge variant="outline" className={`shrink-0 ${item.type === 'overdue' ? 'bg-red-100 text-red-600 border-red-200' : 'bg-gray-100 text-gray-600'}`}>
                          {item.typeBadge}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">{item.daysInfo}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2 text-sm text-gray-400">
            <FileText className="w-4 h-4" />
            <span>點擊任何項目可查看完整詳情與來源依據</span>
          </div>
        </CardContent>
      </Card>

      {/* Needs Attention Detail Card */}
      {needsAttention.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-500" />
            <h3 className="font-semibold text-gray-700">需要你處理</h3>
            <Badge variant="secondary" className="ml-auto bg-red-50 text-red-600 border-red-100">
              {needsAttention.length} 項
            </Badge>
          </div>

          <div className="space-y-3">
            {needsAttention.slice(0, 3).map(item => (
              <Card
                key={item.id}
                className="hover:shadow-md transition-all cursor-pointer border-l-4 border-l-red-500"
                onClick={() => handleItemClick(item)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{item.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="bg-red-50 text-red-600 border-red-100 text-xs px-1.5 py-0 h-5">
                        {item.typeBadge}
                      </Badge>
                      <span className="text-xs text-gray-500">{item.daysInfo}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* AI Secretary Section */}
      <Card className="border border-blue-100 bg-gradient-to-br from-blue-50/20 to-white shadow-sm overflow-hidden flex flex-col h-[600px]">
        <CardHeader className="bg-blue-50/10 border-b border-blue-50 pb-4 shrink-0">
          <div className="space-y-1">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-blue-700">
              <Sparkles className="w-5 h-5" />
              AI 專案秘書
              <HelpTooltip content={tooltips.dashboard.aiInput} side="right" />
            </h3>
            <p className="text-sm text-gray-500">
              貼上對話、會議記錄，或用自然語言提問，我會幫你整理成任務與建議
            </p>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col p-4 space-y-4">

          {/* Chat History Area */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-4 pr-2">
            {chat.messages.length === 0 && !statusMessage && !taskPreview ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-2">
                <MessageSquare className="h-10 w-10" />
                <p>尚無對話記錄，試著輸入一些指令吧！</p>
              </div>
            ) : (
              <>
                {chat.messages.map(msg => (
                  <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm
                          ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-white text-blue-600 border border-blue-100'}`}>
                      {msg.role === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                    </div>
                    <div className={`p-3 rounded-2xl max-w-[85%] text-sm whitespace-pre-wrap shadow-sm
                          ${msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-none'
                        : 'bg-white border border-slate-100/60 rounded-tl-none text-slate-700'}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}

                {/* Status / Pending Bubble */}
                {statusMessage && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-white text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 shadow-sm">
                      <Sparkles className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="p-3 rounded-2xl rounded-tl-none bg-white border border-slate-100/60 text-slate-700 text-sm shadow-sm flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                      </span>
                      {statusMessage}
                    </div>
                  </div>
                )}

                {/* Task Preview Bubble (Interactive) */}
                {taskPreview && (
                  <div className="flex gap-3 w-full">
                    <div className="w-8 h-8 rounded-full bg-white text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 shadow-sm">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="p-3 rounded-2xl rounded-tl-none bg-white border border-slate-100/60 text-slate-700 text-sm shadow-sm">
                        {taskPreview.aiMessage}
                      </div>
                      <TaskPreviewPanel
                        tasks={taskPreview.tasks}
                        aiMessage="" // Title already shown in bubble above
                        onConfirm={() => handleConfirmTaskPlan(taskPreview.tasks)}
                        onCancel={handleCancelTaskPlan}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
            {/* Scroll anchor - inside scrollable container */}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 shrink-0 pt-2">
            {aiQuickActions.map(action => (
              <button
                key={action}
                onClick={() => handleQuickAction(action)}
                className="px-3 py-1.5 rounded-full bg-white border border-blue-100 text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors shadow-sm"
              >
                {action}
              </button>
            ))}
          </div>

          {/* Chat Input */}
          <div className="shrink-0 pt-2 border-t border-slate-100">
            <ChatInput
              onSend={handleSendMessage}
              isLoading={isAIProcessing}
              placeholder={aiPrompt || "輸入指令或需求..."}
              defaultValue={aiPrompt}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}