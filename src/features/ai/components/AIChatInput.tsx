/**
 * AI Chat Input Component
 * AI 對話輸入框組件（帶意圖識別）
 */

import React, { useState } from 'react';
import { useAIChat } from '../../hooks/useAIChat';
import type { ChatResponse, ClarificationOption } from '../../lib/ai/types';

interface AIChatInputProps {
  projectId: string;
  projectName: string;
  currentPhase?: string;
  teamMembers?: string[];
  onTaskCreate?: (info: any) => void;
  onDecisionRecord?: (info: any) => void;
  onPendingMark?: (info: any) => void;
  onChangeRequest?: (info: any) => void;
}

export function AIChatInput({
  projectId,
  projectName,
  currentPhase,
  teamMembers,
  onTaskCreate,
  onDecisionRecord,
  onPendingMark,
  onChangeRequest
}: AIChatInputProps) {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState<ChatResponse | null>(null);
  const [showClarification, setShowClarification] = useState(false);

  const { chat, isLoading, error, clearError } = useAIChat({
    projectId,
    projectName,
    currentPhase,
    teamMembers
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const result = await chat(input.trim());
    if (result) {
      setResponse(result);
      
      // 如果需要澄清意圖，顯示選項
      if (result.clarification_needed) {
        setShowClarification(true);
      } else {
        // 自動執行對應動作
        handleAutoExecute(result);
        setInput(''); // 清空輸入框
      }
    }
  };

  const handleClarificationSelect = (option: ClarificationOption) => {
    if (!response) return;

    // 使用者選擇了意圖，執行對應動作
    const updatedResponse: ChatResponse = {
      ...response,
      intent_result: {
        ...response.intent_result!,
        intent: option.intent,
        confidence: 1.0 // 使用者確認後信心度為 100%
      }
    };

    handleAutoExecute(updatedResponse);
    setShowClarification(false);
    setResponse(null);
    setInput('');
  };

  const handleAutoExecute = (result: ChatResponse) => {
    if (!result.intent_result) return;

    const { intent, extracted_info } = result.intent_result;

    switch (intent) {
      case 'create_task':
        onTaskCreate?.(extracted_info);
        break;
      case 'record_decision':
        onDecisionRecord?.(extracted_info);
        break;
      case 'mark_pending':
        onPendingMark?.(extracted_info);
        break;
      case 'change_request':
        onChangeRequest?.(extracted_info);
        break;
      case 'chat':
        // 一般對話，不執行動作
        break;
    }
  };

  return (
    <div className="w-full">
      {/* 錯誤提示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2">
              <span className="text-red-600">⚠️</span>
              <p className="text-red-800" style={{ fontSize: 'var(--font-size-sm)' }}>
                {error}
              </p>
            </div>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800"
              style={{ fontSize: 'var(--font-size-sm)' }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 主輸入框 */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center gap-2 p-4 border rounded-lg bg-white shadow-sm">
          <div className="flex-shrink-0 text-2xl">💬</div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="跟 AI 秘書對話..."
            disabled={isLoading}
            className="flex-1 outline-none bg-transparent"
            style={{ fontSize: 'var(--font-size-base)' }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ fontSize: 'var(--font-size-sm)' }}
          >
            {isLoading ? '處理中...' : '傳送'}
          </button>
        </div>

        {/* 提示文字 */}
        <div className="mt-2 px-4" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
          提示：你可以...
          <ul className="mt-1 space-y-0.5">
            <li>• 詢問專案進度：「目前有哪些待辦事項？」</li>
            <li>• 建立任務：「明天前完成首頁設計」</li>
            <li>• 記錄決議：「我們決定使用 Next.js」</li>
          </ul>
        </div>
      </form>

      {/* AI 回應 */}
      {response && !showClarification && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 text-2xl">🤖</div>
            <div className="flex-1">
              <p style={{ fontSize: 'var(--font-size-base)', whiteSpace: 'pre-wrap' }}>
                {response.reply}
              </p>
              {response.intent_result && (
                <div className="mt-2 pt-2 border-t border-blue-200" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                  意圖：{response.intent_result.intent} | 
                  信心度：{(response.intent_result.confidence * 100).toFixed(0)}%
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 意圖澄清對話框 */}
      {showClarification && response?.clarification_options && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 text-2xl">🤔</div>
            <div className="flex-1">
              <p className="mb-3" style={{ fontSize: 'var(--font-size-base)' }}>
                {response.reply}
              </p>
              <div className="space-y-2">
                {response.clarification_options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleClarificationSelect(option)}
                    className="w-full text-left p-3 bg-white border border-yellow-300 rounded-lg hover:bg-yellow-50 transition-colors"
                  >
                    <div style={{ fontSize: 'var(--font-size-base)' }} className="font-medium">
                      {option.label}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                      {option.description}
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setShowClarification(false);
                  setResponse(null);
                }}
                className="mt-3 text-yellow-700 hover:text-yellow-900"
                style={{ fontSize: 'var(--font-size-sm)' }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
