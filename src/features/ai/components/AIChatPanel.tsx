import React, { useRef, useEffect } from 'react';
import { Sparkles, User, CheckCircle2, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'text' | 'wbs_analysis' | 'file_upload';
  // WBS 解析結果
  wbsResult?: {
    project_summary?: string;
    items: Array<{
      title: string;
      description: string;
      type: string;
      priority: string;
      due_date?: string;
      meta?: any;
    }>;
    reasoning?: string;
  };
  // 上傳檔案資訊
  fileInfo?: {
    name: string;
    type: string;
    size: number;
  };
  // 關聯的 Artifact ID
  artifactId?: string;
  citations?: any[];
}

interface AIChatPanelProps {
  messages: ChatMessage[];
  onConfirmTask: (message: ChatMessage) => void;
  onRejectTask: (messageId: string) => void;
}

export function AIChatPanel({ messages, onConfirmTask, onRejectTask }: AIChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto p-4 bg-muted/20 rounded-[var(--radius-lg)] border">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          {/* Assistant Avatar */}
          {message.role === 'assistant' && (
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
          )}

          {/* Message Content */}
          <div className={`flex flex-col gap-2 max-w-[80%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
            {/* User/Assistant Label */}
            <div className="flex items-center gap-2">
              <label className="opacity-60">
                {message.role === 'assistant' ? 'AI 秘書' : '你'}
              </label>
              <label className="opacity-40">
                {message.timestamp.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
              </label>
            </div>

            {/* Message Bubble */}
            <div
              className={`p-3 rounded-[var(--radius-lg)] ${message.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background border'
                }`}
            >
              {/* 文字內容 */}
              {message.content && (
                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
              )}

              {/* RAG Citations */}
              {message.citations && message.citations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    參考資料來源
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {message.citations.map((doc: any, idx: number) => (
                      <div
                        key={idx}
                        className="text-xs bg-muted/40 hover:bg-muted px-2.5 py-1.5 rounded-md border flex items-center gap-1.5 transition-colors cursor-help max-w-full"
                        title={doc.content?.substring(0, 200) + '...'}
                      >
                        <FileText className="w-3 h-3 shrink-0 opacity-70" />
                        <span className="truncate max-w-[150px]">
                          {doc.metadata?.fileName || `文件 ${idx + 1}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 檔案上傳訊息 */}
              {message.type === 'file_upload' && message.fileInfo && (
                <div className="flex items-center gap-2 mt-2 p-2 rounded-[var(--radius)] bg-muted/50">
                  <FileText className="w-4 h-4" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{message.fileInfo.name}</p>
                    <label className="opacity-60">
                      {(message.fileInfo.size / 1024).toFixed(2)} KB
                    </label>
                  </div>
                </div>
              )}

              {/* WBS 解析結果 */}
              {message.type === 'wbs_analysis' && message.wbsResult && (
                <div className="space-y-3 mt-3">
                  {/* Project Summary */}
                  {message.wbsResult.project_summary && (
                    <div className="p-3 rounded-[var(--radius)] bg-blue-50 border border-blue-200">
                      <label className="opacity-70 flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4" />
                        專案摘要
                      </label>
                      <p className="leading-relaxed">{message.wbsResult.project_summary}</p>
                    </div>
                  )}

                  {/* Reasoning */}
                  {message.wbsResult.reasoning && (
                    <div className="p-3 rounded-[var(--radius)] bg-amber-50 border border-amber-200">
                      <label className="opacity-70 flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4" />
                        AI 分析
                      </label>
                      <p className="leading-relaxed">{message.wbsResult.reasoning}</p>
                    </div>
                  )}

                  {/* Items List */}
                  {message.wbsResult.items.length > 0 && (
                    <div className="space-y-2">
                      <label className="opacity-70 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        識別出 {message.wbsResult.items.length} 個任務項目
                      </label>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {message.wbsResult.items.map((item, index) => (
                          <div
                            key={index}
                            className="p-3 rounded-[var(--radius)] bg-background border hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <p className="font-medium">{item.title}</p>
                              <Badge variant="outline" className={`shrink-0 ${item.priority === 'high' ? 'bg-destructive/10 text-destructive border-destructive/30' :
                                item.priority === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                  'bg-blue-50 text-blue-700 border-blue-200'
                                }`}>
                                {item.priority === 'high' ? '高' : item.priority === 'medium' ? '中' : '低'}
                              </Badge>
                            </div>
                            {item.description && (
                              <p className="opacity-70 mb-2">{item.description}</p>
                            )}
                            <div className="flex items-center gap-3 flex-wrap">
                              {item.meta?.wbs_code && (
                                <label className="opacity-60">
                                  WBS: {item.meta.wbs_code}
                                </label>
                              )}
                              {item.meta?.estimated_days && (
                                <label className="opacity-60">
                                  預估: {item.meta.estimated_days} 天
                                </label>
                              )}
                              {item.meta?.ai_confidence && (
                                <label className="opacity-60">
                                  信心度: {(item.meta.ai_confidence * 100).toFixed(0)}%
                                </label>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => onConfirmTask(message)}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          確認並建立 {message.wbsResult.items.length} 個任務
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onRejectTask(message.id)}
                        >
                          取消
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* User Avatar */}
          {message.role === 'user' && (
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-foreground shrink-0">
              <User className="w-4 h-4" />
            </div>
          )}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
