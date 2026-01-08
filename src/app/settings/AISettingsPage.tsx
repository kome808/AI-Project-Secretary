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
import { AlertCircle, CheckCircle2, Loader2, Info, Database } from 'lucide-react';
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

      {/* 知識庫維護工具 (Knowledge Base Maintenance) */}
      <MaintenancePanel />
    </div>
  );
}

// 知識庫維護元件
function MaintenancePanel() {
  const [scanPattern, setScanPattern] = useState('');
  const [scanResults, setScanResults] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const adapter = getStorageClient();

  // 掃描文件
  const handleScan = async () => {
    if (!scanPattern.trim()) {
      toast.error('請輸入檔案名稱關鍵字');
      return;
    }

    setIsScanning(true);
    setScanResults([]);

    try {
      // Direct raw query to find "Ghost" files, ignoring standard filters
      const { data, error } = await (adapter as any).supabase
        .from('artifacts')
        .select('id, created_at, project_id, archived, meta, content_type')
        // Try matching filename in meta (common pattern) or original_content fallback
        // Note: ILIKE might be slow for full scans but ok for admin tool
        .or(`meta->>file_name.ilike.%${scanPattern}%, original_content.ilike.%${scanPattern}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        toast.error('掃描失敗: ' + error.message);
      } else {
        setScanResults(data || []);
        if (data?.length === 0) {
          toast.info('未找到符合關鍵字的文件');
        } else {
          toast.success(`找到 ${data?.length} 個相關文件`);
        }
      }
    } catch (err) {
      console.error('Scan failed:', err);
      toast.error('掃描發生異常');
    } finally {
      setIsScanning(false);
    }
  };

  // 強制刪除
  const handleDeleteAll = async () => {
    if (scanResults.length === 0) return;

    if (!confirm(`警告：即將強制刪除 ${scanResults.length} 個文件資料列。\n這將會清除資料庫記錄（Vectors 也會因此被過濾）。確定要執行嗎？`)) {
      return;
    }

    setIsDeleting(true);
    try {
      let deletedCount = 0;
      for (const artifact of scanResults) {
        const { error } = await adapter.deleteArtifact(artifact.id);
        if (!error) deletedCount++;
      }

      toast.success(`清理完成！已刪除 ${deletedCount} 筆記錄`);
      setScanResults([]); // Verify by scan later
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error('刪除過程發生異常');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="border-red-100">
      <CardHeader>
        <h3 className="text-red-900 flex items-center gap-2">
          <Database className="w-5 h-5" />
          知識庫維護 (Ghost File Cleaner)
        </h3>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          此工具用於強制搜尋並刪除資料庫中的殘留文件記錄（例如已刪除但在 RAG 中仍出現的幽靈文件）。
        </p>

        <div className="flex gap-2">
          <Input
            placeholder="輸入檔案名稱關鍵字 (例如: 1204)"
            value={scanPattern}
            onChange={e => setScanPattern(e.target.value)}
          />
          <Button onClick={handleScan} disabled={isScanning} variant="secondary">
            {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : '掃描'}
          </Button>
        </div>

        {scanResults.length > 0 && (
          <div className="border rounded-md p-4 bg-muted/30">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium">掃描結果 ({scanResults.length})</h4>
              <Button onClick={handleDeleteAll} disabled={isDeleting} variant="destructive" size="sm">
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : '全部強制刪除'}
              </Button>
            </div>
            <div className="max-h-[200px] overflow-y-auto space-y-2">
              {scanResults.map(item => (
                <div key={item.id} className="text-xs p-2 bg-background border rounded flex justify-between items-center">
                  <div>
                    <div className="font-medium text-red-700">{item.meta?.file_name || '未命名'}</div>
                    <div className="opacity-60">ID: {item.id}</div>
                    <div className="opacity-60">Archived: {item.archived ? 'Yes' : 'No'} | Project: {item.project_id}</div>
                  </div>
                  <Badge variant="outline">{item.content_type || 'unknown'}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}