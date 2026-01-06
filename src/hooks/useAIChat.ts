/**
 * useAIChat Hook
 * 簡化 AI 對話功能的 React Hook
 */

import { useState, useCallback } from 'react';
import { createAIService } from '../lib/ai/AIService';
import type { ChatResponse, AIConfig } from '../lib/ai/types';
import { getStorageClient } from '../lib/storage';

interface UseAIChatOptions {
  projectId: string;
  projectName: string;
  currentPhase?: string;
  teamMembers?: string[];
}

interface UseAIChatReturn {
  chat: (message: string) => Promise<ChatResponse | null>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useAIChat(options: UseAIChatOptions): UseAIChatReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chat = useCallback(async (message: string): Promise<ChatResponse | null> => {
    try {
      setIsLoading(true);
      setError(null);

      // Step 1: 取得 AI 設定
      const storage = getStorageClient();
      const { data: aiConfig, error: configError } = await storage.getSystemAIConfig();

      console.log('[useAIChat] AI Config:', { aiConfig, configError });

      if (configError || !aiConfig) {
        const errorMsg = 'AI 功能尚未設定。請前往「設定 → 系統管理 → AI 設定」頁面配置 OpenAI API 金鑰後再使用此功能。';
        setError(errorMsg);
        console.warn('[useAIChat] AI config not available:', errorMsg);
        return null;
      }

      if (!aiConfig.is_active) {
        const errorMsg = 'AI 功能未啟用，請在「設定」頁面啟用';
        setError(errorMsg);
        console.warn('[useAIChat] AI not active:', errorMsg);
        return null;
      }

      // Step 2: 建立 AI Service
      const aiService = createAIService({
        provider: aiConfig.provider,
        model: aiConfig.model,
        apiKey: aiConfig.api_key,
        apiEndpoint: aiConfig.api_endpoint,
        temperature: 0.3,
        maxTokens: 8000 // 🔥 增加 Token 限制，避免 AI 生成中斷
      });

      // Step 3: 呼叫 AI 對話
      const response = await aiService.chat(message, {
        projectId: options.projectId,
        projectName: options.projectName,
        currentPhase: options.currentPhase,
        teamMembers: options.teamMembers
      });

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '發生未知錯誤';
      setError(errorMessage);
      console.error('useAIChat error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    chat,
    isLoading,
    error,
    clearError
  };
}