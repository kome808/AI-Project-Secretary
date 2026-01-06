/**
 * System Prompts Editor
 * 讓系統管理員動態維護 AI 的 System Prompts
 * 這是全系統唯一的提示詞設定，所有 AI 功能都會使用這裡的設定
 */

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { getCurrentUser } from '@/lib/permissions/statusPermissions';
import type { SystemPromptConfig } from '../../../lib/storage/types';
import { WBS_PARSER_PROMPT, generateSystemPrompt, generateFewShotPrompt } from '../../../lib/ai/prompts';

interface SystemPromptsEditorProps {
  storage: any; // StorageAdapter
}

export function SystemPromptsEditor({ storage }: SystemPromptsEditorProps) {
  const [prompts, setPrompts] = useState<SystemPromptConfig>({
    wbs_parser: '',
    intent_classification: '',
    few_shot_examples: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'wbs_parser' | 'intent_classification' | 'few_shot_examples'>('wbs_parser');

  // 🔥 固定使用系統層級 ID
  // 使用固定 UUID 代表系統層級設定（因為資料庫 project_id 欄位是 uuid 類型）
  const SYSTEM_PROMPTS_ID = '00000000-0000-0000-0000-000000000000';

  // 載入 System Prompts
  useEffect(() => {
    loadPrompts();
  }, []);

  async function loadPrompts() {
    try {
      setLoading(true);
      console.log('🔍 [SystemPromptsEditor] 開始載入系統層級提示詞');
      
      const { data, error } = await storage.getSystemPrompts(SYSTEM_PROMPTS_ID);
      
      if (error) {
        console.error('❌ [SystemPromptsEditor] 載入失敗:', error);
        toast.error('載入 System Prompts 失敗');
        return;
      }

      if (data) {
        console.log('✅ [SystemPromptsEditor] 載入成功，資料長度:', {
          wbs_parser: data.wbs_parser?.length || 0,
          intent_classification: data.intent_classification?.length || 0,
          few_shot_examples: data.few_shot_examples?.length || 0
        });
        setPrompts(data);
      } else {
        console.warn('⚠️ [SystemPromptsEditor] 資料為空，使用空白預設值');
      }
    } catch (error) {
      console.error('❌ [SystemPromptsEditor] 載入異常:', error);
      toast.error('載入失敗');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      
      const { data, error } = await storage.updateSystemPrompts(
        SYSTEM_PROMPTS_ID,
        prompts,
        getCurrentUser()?.email || 'admin'
      );

      if (error) {
        console.error('儲存 System Prompts 失敗:', error);
        toast.error('儲存失敗');
        return;
      }

      toast.success('✅ System Prompts 已儲存');
      setPrompts(data);
    } catch (error) {
      console.error('儲存 System Prompts 異常:', error);
      toast.error('儲存失敗');
    } finally {
      setSaving(false);
    }
  }

  async function handleReset(promptKey: keyof SystemPromptConfig) {
    if (!confirm('確定要重置此 Prompt 為預設值嗎？')) {
      return;
    }

    try {
      setSaving(true);
      
      // 🔥 取得預設值（從 /src/lib/ai/prompts.ts）
      let defaultValue = '';
      if (promptKey === 'wbs_parser') {
        defaultValue = WBS_PARSER_PROMPT;
      } else if (promptKey === 'intent_classification') {
        // 使用完整的意圖分類 Prompt（包含所有規則）
        defaultValue = generateSystemPrompt();
      } else if (promptKey === 'few_shot_examples') {
        // 使用 Few-Shot 範例 Prompt
        defaultValue = generateFewShotPrompt();
      }
      
      console.log(`🔄 重置 ${promptKey} 為預設值，長度: ${defaultValue.length}`);

      const { data, error } = await storage.resetSystemPrompt(
        SYSTEM_PROMPTS_ID,
        promptKey,
        defaultValue,
        getCurrentUser()?.email || 'admin'
      );

      if (error) {
        console.error('重置 Prompt 失敗:', error);
        toast.error('重置失敗');
        return;
      }

      toast.success('✅ Prompt 已重置為預設值');
      setPrompts(data);
    } catch (error) {
      console.error('重置 Prompt 異常:', error);
      toast.error('重置失敗');
    } finally {
      setSaving(false);
    }
  }

  function handlePromptChange(key: keyof SystemPromptConfig, value: string) {
    setPrompts(prev => ({
      ...prev,
      [key]: value
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <label className="text-muted-foreground">載入中...</label>
      </div>
    );
  }

  const promptMeta = {
    wbs_parser: {
      title: 'WBS 解析 Prompt',
      description: '用於解析 WBS 圖檔、Excel、Word、PDF 等文件的 AI Prompt',
      placeholder: '請輸入 WBS 解析的 System Prompt...'
    },
    intent_classification: {
      title: '意圖分類 Prompt',
      description: '用於分類使用者輸入意圖的 AI Prompt',
      placeholder: '請輸入意圖分類的 System Prompt...'
    },
    few_shot_examples: {
      title: 'Few-Shot 範例 Prompt',
      description: '用於提供 AI 範例學習的 Prompt',
      placeholder: '請輸入 Few-Shot 範例 Prompt...'
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h2 className="font-semibold text-lg">System Prompts 管理</h2>
        <label className="text-sm text-muted-foreground mt-1">
          動態維護 AI 的 System Prompts，調整後立即生效
        </label>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {(Object.keys(promptMeta) as Array<keyof typeof promptMeta>).map((key) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 -mb-px border-b-2 transition-colors ${
              activeTab === key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <label className="cursor-pointer">{promptMeta[key].title}</label>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium">{promptMeta[activeTab].title}</h3>
            <label className="text-sm text-muted-foreground">{promptMeta[activeTab].description}</label>
          </div>
          <button
            onClick={() => handleReset(activeTab)}
            disabled={saving}
            className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-accent transition-colors disabled:opacity-50"
          >
            <label className="cursor-pointer">重置為預設值</label>
          </button>
        </div>

        <textarea
          value={prompts[activeTab] || ''}
          onChange={(e) => handlePromptChange(activeTab, e.target.value)}
          placeholder={promptMeta[activeTab].placeholder}
          rows={16}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none font-mono text-sm"
        />

        {/* Metadata */}
        {prompts.last_updated_at && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <label>
              最後更新：{new Date(prompts.last_updated_at).toLocaleString('zh-TW')}
            </label>
            {prompts.updated_by && (
              <label>更新者：{prompts.updated_by}</label>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <label className="text-sm text-muted-foreground">
          ⚠️ 修改 Prompt 可能影響 AI 的行為，請謹慎操作
        </label>
        <div className="flex gap-2">
          <button
            onClick={loadPrompts}
            disabled={saving}
            className="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent transition-colors disabled:opacity-50"
          >
            <label className="cursor-pointer">取消</label>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <label className="cursor-pointer">{saving ? '儲存中...' : '儲存變更'}</label>
          </button>
        </div>
      </div>
    </div>
  );
}