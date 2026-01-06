import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Loader2, Info } from 'lucide-react';
import { SystemAIConfig, AIProvider } from '../../lib/storage/types';
import { toast } from 'sonner';
import { getStorageClient } from '../../lib/storage';

// AI 供應商與模型配置
const AI_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    models: [
      { value: 'gpt-4o', label: 'GPT-4o（推薦）' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { value: 'gpt-5-nano', label: 'GPT-5 Nano（最快）' },
      { value: 'chatgpt-5-nano', label: 'ChatGPT-5 Nano (相容)' },
    ],
    keyPrefix: 'sk-',
  },
  anthropic: {
    name: 'Anthropic',
    models: [
      { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet（推薦）' },
      { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku（快速）' },
      { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus（最強）' },
    ],
    keyPrefix: 'sk-ant-',
  },
  google: {
    name: 'Google Gemini',
    models: [
      { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash（推薦）' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    ],
    keyPrefix: '',
  },
} as const;

export function AISettingsPage() {
  const [config, setConfig] = useState<SystemAIConfig | null>(null);
  const [provider, setProvider] = useState<AIProvider>('openai');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const adapter = getStorageClient();

  // 載入現有設定
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await adapter.getSystemAIConfig();

      if (error) {
        console.error('載入 AI 設定失敗:', error);
        // 不顯示 toast error，因為 Local Phase 返回 null 是正常的
      } else if (data) {
        setConfig(data);
        setProvider(data.provider);
        setModel(data.model);
        setApiKey(data.api_key);
        setApiEndpoint(data.api_endpoint || '');
      }
    } catch (err) {
      console.error('載入 AI 設定錯誤:', err);
    } finally {
      setLoading(false);
    }
  };

  // 當切換供應商時，重置模型選擇
  const handleProviderChange = (newProvider: AIProvider) => {
    setProvider(newProvider);
    setModel(''); // 重置模型
  };

  // 驗證 API Key 格式
  const validateApiKey = (key: string, providerType: AIProvider): boolean => {
    if (!key || key.length < 10) return false;

    const prefix = AI_PROVIDERS[providerType].keyPrefix;
    if (prefix && !key.startsWith(prefix)) {
      return false;
    }

    return true;
  };

  // 測試連線
  const handleTestConnection = async () => {
    if (!apiKey || !model) {
      toast.error('請先填寫 API Key 和選擇模型');
      return;
    }

    if (!validateApiKey(apiKey, provider)) {
      toast.error(`API Key 格式錯誤，${provider === 'openai' ? '應以 sk- 開頭' : provider === 'anthropic' ? '應以 sk-ant- 開頭' : ''}`);
      return;
    }

    setTesting(true);
    try {
      const { data, error } = await adapter.testAIConnection(
        provider,
        model,
        apiKey,
        apiEndpoint || undefined
      );

      if (error || !data?.success) {
        toast.error(data?.message || '連線測試失敗');
      } else {
        toast.success(data.message);
        // 測試成功後，詢問是否要立即儲存設定
        if (config) {
          // 已有設定，只更新測試狀態
          const { error: updateError } = await adapter.updateSystemAIConfig({
            provider: config.provider,
            model: config.model,
            api_key: config.api_key,
            api_endpoint: config.api_endpoint,
            is_active: config.is_active,
            test_status: 'success',
            last_tested_at: new Date().toISOString(),
          });

          if (!updateError) {
            await loadConfig(); // 重新載入以顯示更新後的測試狀態
          }
        }
      }
    } catch (err) {
      console.error('測試連線錯誤:', err);
      toast.error('測試連線時發生錯誤');
    } finally {
      setTesting(false);
    }
  };

  // 儲存設定
  const handleSave = async () => {
    if (!apiKey || !model) {
      toast.error('請填寫完整資訊');
      return;
    }

    if (!validateApiKey(apiKey, provider)) {
      toast.error(`API Key 格式錯誤，${provider === 'openai' ? '應以 sk- 開頭' : provider === 'anthropic' ? '應以 sk-ant- 開頭' : ''}`);
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await adapter.updateSystemAIConfig({
        provider,
        model,
        api_key: apiKey,
        api_endpoint: apiEndpoint || undefined,
        is_active: true,
        test_status: 'pending',
      });

      if (error) {
        toast.error('儲存失敗');
      } else {
        setConfig(data);
        toast.success('設定已儲存');
      }
    } catch (err) {
      console.error('儲存設定錯誤:', err);
      toast.error('儲存時發生錯誤');
    } finally {
      setSaving(false);
    }
  };

  // 遮罩 API Key 顯示
  const maskApiKey = (key: string): string => {
    if (!key || key.length < 6) return '***';
    return `${key.slice(0, 3)}***${key.slice(-3)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-[var(--spacing-6)]">
      {/* 頁面標題 */}
      <div>
        <h1>AI 供應商與模型設定</h1>
        <p className="opacity-60 mt-[var(--spacing-2)]">
          設定系統使用的 AI 服務供應商與模型
        </p>
      </div>

      {/* Local Phase 警告 */}
      {!config && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-[var(--spacing-4)]">
            <div className="flex gap-[var(--spacing-3)]">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-[var(--spacing-0-5)]" />
              <div className="space-y-[var(--spacing-2)]">
                <h4 className="text-amber-900">Local Phase 限制</h4>
                <p className="opacity-80">
                  目前處於 Local Phase 預覽環境，基於安全性考量，無法儲存 API Key。
                  若要使用 AI 功能，請先連線 Supabase 資料庫。
                </p>
                <div className="flex gap-[var(--spacing-2)] pt-[var(--spacing-2)]">
                  <Button variant="outline" size="sm" disabled>
                    連線 Supabase（開發中）
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 當前設定狀態 */}
      {config && (
        <Card>
          <CardHeader>
            <h3>當前設定狀態</h3>
          </CardHeader>
          <CardContent className="space-y-[var(--spacing-3)]">
            <div className="flex items-center justify-between">
              <span className="opacity-60">供應商</span>
              <span>{AI_PROVIDERS[config.provider].name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="opacity-60">模型</span>
              <span>{config.model}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="opacity-60">API Key</span>
              <code className="px-[var(--spacing-2)] py-[var(--spacing-1)] bg-muted rounded-[var(--radius)]">
                {maskApiKey(config.api_key)}
              </code>
            </div>
            {config.last_tested_at && (
              <div className="flex items-center justify-between">
                <span className="opacity-60">最後測試</span>
                <div className="flex items-center gap-[var(--spacing-2)]">
                  {config.test_status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : config.test_status === 'failed' ? (
                    <AlertCircle className="w-4 h-4 text-destructive" />
                  ) : null}
                  <span>{new Date(config.last_tested_at).toLocaleString('zh-TW')}</span>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="opacity-60">狀態</span>
              <Badge variant={config.is_active ? 'default' : 'secondary'}>
                {config.is_active ? '✅ 啟用中' : '未啟用'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 設定表單 */}
      <Card>
        <CardHeader>
          <h3>設定 AI 服務</h3>
        </CardHeader>
        <CardContent className="space-y-[var(--spacing-4)]">
          {/* 供應商選擇 */}
          <div className="space-y-[var(--spacing-2)]">
            <Label htmlFor="provider">供應商</Label>
            <Select value={provider} onValueChange={(value) => handleProviderChange(value as AIProvider)}>
              <SelectTrigger id="provider">
                <SelectValue placeholder="選擇 AI 供應商" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>選擇供應商</SelectLabel>
                  {Object.entries(AI_PROVIDERS).map(([key, { name }]) => (
                    <SelectItem key={key} value={key}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* 模型選擇 */}
          <div className="space-y-[var(--spacing-2)]">
            <Label htmlFor="model">模型</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger id="model">
                <SelectValue placeholder="選擇模型" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>{AI_PROVIDERS[provider].name} 模型</SelectLabel>
                  {AI_PROVIDERS[provider].models.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* API Key */}
          <div className="space-y-[var(--spacing-2)]">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`請輸入 ${AI_PROVIDERS[provider].name} API Key`}
            />
            {AI_PROVIDERS[provider].keyPrefix && (
              <p className="opacity-60">
                <Info className="w-4 h-4 inline mr-[var(--spacing-1)]" />
                應以 <code className="px-[var(--spacing-1)] bg-muted rounded">{AI_PROVIDERS[provider].keyPrefix}</code> 開頭
              </p>
            )}
          </div>

          {/* API Endpoint（可選） */}
          <div className="space-y-[var(--spacing-2)]">
            <Label htmlFor="apiEndpoint">API Endpoint（可選）</Label>
            <Input
              id="apiEndpoint"
              type="url"
              value={apiEndpoint}
              onChange={(e) => setApiEndpoint(e.target.value)}
              placeholder="例如：https://api.openai.com/v1"
            />
            <p className="opacity-60">
              <Info className="w-4 h-4 inline mr-[var(--spacing-1)]" />
              僅在使用自訂 API Endpoint 時填寫
            </p>
          </div>

          {/* 操作按鈕 */}
          <div className="flex gap-[var(--spacing-3)] pt-[var(--spacing-2)]">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={testing || !apiKey || !model}
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-[var(--spacing-2)] animate-spin" />
                  測試中...
                </>
              ) : (
                '測試連線'
              )}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !apiKey || !model}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-[var(--spacing-2)] animate-spin" />
                  儲存中...
                </>
              ) : (
                '儲存設定'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 安全提示 */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="pt-[var(--spacing-4)]">
          <div className="flex gap-[var(--spacing-3)]">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-[var(--spacing-0-5)]" />
            <div className="space-y-[var(--spacing-2)]">
              <h4 className="text-amber-900">安全提示</h4>
              <ul className="space-y-[var(--spacing-1)] opacity-80">
                <li>• ⚠️ 目前 API Key 以明文儲存於 Supabase 資料庫中</li>
                <li>• 僅有已認證使用者可透過 RLS 政策存取</li>
                <li>• 建議升級使用 Supabase Vault 加密（參考 /docs/AI_Settings_Security.md）</li>
                <li>• 請確保 API Key 安全，勿與他人分享</li>
                <li>• 定期輪替 API Key（建議每 30 天）</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}