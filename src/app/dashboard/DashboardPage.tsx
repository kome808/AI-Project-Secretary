import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  MessageSquare,
  AlertTriangle,
  TrendingUp,
  User
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
import { MarkdownText } from '@/components/common/MarkdownText';

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
    sourceArtifactId?: string;
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
    ongoing: items.filter((i: any) => i.status === 'in_progress').length,
    completed: items.filter((i: any) => i.status === 'completed').length,
    total: items.length
  };

  // Quick Actions
  const aiQuickActions = [
    "搜尋專案文件",
    "整理會議記錄",
    "分析需求文件",
    "建立功能模組",
    "建立變更需求 (CR)",
    "解析 WBS 文件",
    "分析 Email 轉任務",
    "規劃專案任務"
  ];

  const handleQuickAction = (action: string) => {
    if (action === "搜尋專案文件") {
      setAiPrompt("搜尋：");
    } else {
      setAiPrompt(action);
    }
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
      let sourceId = taskPreview?.sourceArtifactId;

      // If no source artifact linked (e.g. from chat text), create a summary artifact
      if (!sourceId) {
        const artifactRes = await storage.createArtifact({
          project_id: currentProject.id,
          content_type: 'text/plain',
          original_content: `AI 任務規劃：${selectedTasks.length} 個任務`,
          meta: { channel: 'paste' as any, is_temporary: true, original_channel: 'ai_planning' }
        });
        sourceId = artifactRes.data?.id;
      }

      let successCount = 0;
      for (const task of selectedTasks) {
        // 🔥 NEW: Determine parent and meta based on target_node_id
        const targetNodeId = task.target_node_id;
        let isFeatureModule = false;
        let isWorkPackage = false;

        if (targetNodeId) {
          // Fetch target node to determine its type
          const { data: targetNode } = await storage.getItemById(targetNodeId);
          if (targetNode) {
            isFeatureModule = !!targetNode.meta?.isFeatureModule;
            isWorkPackage = !!targetNode.meta?.isWorkPackage;

            // 🔥 Append requirement snippet to target node
            if (task.requirement_snippet) {
              const existingSnippets = targetNode.meta?.requirement_snippets || [];
              const newSnippet = {
                id: `snip-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                content: task.requirement_snippet,
                source_artifact_id: sourceId,
                source_label: new Date().toLocaleDateString('zh-TW'),
                created_at: new Date().toISOString(),
                status: 'active'
              };
              await storage.updateItem(targetNodeId, {
                meta: {
                  ...targetNode.meta,
                  requirement_snippets: [...existingSnippets, newSnippet]
                }
              });
            }
          }
        }

        await storage.createItem({
          project_id: currentProject.id,
          type: task.type,
          status: 'not_started',
          title: task.title,
          description: task.description,
          source_artifact_id: sourceId,
          due_date: task.due_date,
          assignee_id: task.assignee_id,
          priority: task.priority,
          parent_id: targetNodeId || undefined, // 🔥 Link to target node
          meta: {
            ai_generated: true,
            source: sourceId ? '會議記錄' : 'AI 規劃',
            isFeatureModule: isFeatureModule || undefined,
            isWorkPackage: isWorkPackage || undefined,
            target_node_id: targetNodeId || undefined,
            target_node_path: task.target_node_path || undefined
          }
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
    <div className="space-y-6 max-w-6xl mx-auto pb-12 pt-4">
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

      {/* 精簡型晨間簡報 & 優先處理整合卡片 */}
      <Card className="border shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
        <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-700">
              <Sparkles className="h-4 w-4 text-blue-500" />
              晨間簡報
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  進行中 {stats.ongoing}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                  已完成 {stats.completed}
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] h-5 bg-blue-50/50 text-blue-600 border-blue-100">
                AI 助理
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {/* 簡報文字區 */}
            <div className="md:col-span-3 p-4 bg-white/30 text-sm leading-relaxed text-slate-600">
              <div className="flex items-start gap-3">
                <MessageSquare className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                <p className="font-medium text-slate-700">
                  {briefSummary || "今天目前還沒有特別的專案更新摘要。"}
                </p>
              </div>
            </div>

            {/* 優先處理清單區 */}
            <div className="md:col-span-2 p-4 bg-slate-50/30">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                  今日處理重點
                </label>
                {needsAttention.length > 0 && (
                  <Badge className="bg-red-100 text-red-600 border-red-200 text-[10px] h-4 px-1.5 hover:bg-red-100">
                    {needsAttention.length} 項
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                {needsAttention.length > 0 ? (
                  needsAttention.slice(0, 3).map((item) => {
                    const isOverdue = item.type === 'overdue';
                    const isBlocked = item.type === 'blocked';
                    const _isSuggestion = item.type === 'pending'; // AI suggestion

                    return (
                      <div
                        key={item.id}
                        className={`
                          group flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden
                          ${isOverdue
                            ? 'bg-red-50/80 border-red-100 hover:border-red-200 hover:shadow-sm hover:bg-red-50'
                            : isBlocked
                              ? 'bg-amber-50/80 border-amber-100 hover:border-amber-200 hover:shadow-sm hover:bg-amber-50'
                              : 'bg-blue-50/80 border-blue-100 hover:border-blue-200 hover:shadow-sm hover:bg-blue-50'
                          }
                        `}
                        onClick={() => handleItemClick(item)}
                      >
                        {/* 側邊彩色條 */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 
                          ${isOverdue ? 'bg-red-400' : isBlocked ? 'bg-amber-400' : 'bg-blue-400'}
                        `} />

                        <div className="flex-1 min-w-0 ml-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="text-[13px] font-bold text-slate-800 truncate pr-2">
                              {item.title}
                            </p>
                            <Badge variant="outline" className={`
                              text-[10px] h-4 px-1 shrink-0 border
                              ${isOverdue
                                ? 'bg-white text-red-600 border-red-200'
                                : isBlocked
                                  ? 'bg-white text-amber-600 border-amber-200'
                                  : 'bg-white text-blue-600 border-blue-200'
                              }
                            `}>
                              {item.typeBadge}
                            </Badge>
                          </div>
                          <p className={`text-[11px] truncate font-medium
                            ${isOverdue ? 'text-red-500' : isBlocked ? 'text-amber-500' : 'text-blue-500'}
                          `}>
                            {item.daysInfo}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs text-slate-400 italic">目前無緊急優先事項</p>
                  </div>
                )}
                {needsAttention.length > 2 && (
                  <button
                    onClick={() => navigate('/inbox')}
                    className="w-full text-center text-[10px] text-blue-500 hover:text-blue-600 font-medium py-1"
                  >
                    查看更多事項...
                  </button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* AI Secretary Section */}
      <Card className="border border-blue-100 bg-gradient-to-br from-blue-50/5 to-white shadow-md overflow-hidden flex flex-col h-[800px] transition-all border-l-4 border-l-blue-400">
        <CardHeader className="bg-blue-50/10 border-b border-blue-50 py-3 shrink-0">
          <div className="space-y-1">
            <h3 className="flex items-center gap-2 text-base font-semibold text-blue-700">
              <Sparkles className="w-4 h-4" />
              AI 專案秘書
              <HelpTooltip content={tooltips.dashboard.aiInput} side="right" />
            </h3>
            <p className="text-xs text-slate-500">
              貼上會議記錄獲取摘要，或用自然語言規劃任務
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
                      <MarkdownText content={msg.content} />
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

          {/* Quick Actions / Suggestions */}
          <div className="flex flex-wrap gap-2 shrink-0 pt-2">
            {(aiSuggestions.length > 0 ? aiSuggestions : aiQuickActions).map((action, idx) => (
              <button
                key={`${action}-${idx}`}
                onClick={() => {
                  if (aiSuggestions.length > 0) {
                    // Dynamic suggestion: Auto-send
                    handleSendMessage(action);
                  } else {
                    // Static action: Pre-fill input
                    handleQuickAction(action);
                  }
                }}
                className={`px-3 py-1.5 rounded-full text-xs transition-colors shadow-sm border
                  ${aiSuggestions.length > 0
                    ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                    : 'bg-white border-blue-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
                  }`}
              >
                {aiSuggestions.length > 0 && <Sparkles className="w-3 h-3 inline-block mr-1" />}
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