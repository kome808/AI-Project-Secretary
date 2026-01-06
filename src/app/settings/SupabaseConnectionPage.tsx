import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Loader2, Info, Database } from 'lucide-react';
import { hasSupabaseConfig, resetSupabaseClient } from '../../lib/supabase/client';
import { StorageFactory } from '../../lib/storage/StorageFactory';
import { toast } from 'sonner';

export function SupabaseConnectionPage() {
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [schemaName, setSchemaName] = useState('aiproject'); // 預設使用 aiproject
  const [isConnected, setIsConnected] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detectedError, setDetectedError] = useState<string>(''); // 儲存偵測到的錯誤訊息

  useEffect(() => {
    loadConfig();
    // 檢查是否有 schema 錯誤
    checkSchemaError();
  }, []);

  const loadConfig = () => {
    const url = localStorage.getItem('supabase_url') || '';
    const key = localStorage.getItem('supabase_anon_key') || '';
    const schema = localStorage.getItem('supabase_schema') || 'aiproject'; // 預設 aiproject
    
    setSupabaseUrl(url);
    setSupabaseAnonKey(key);
    setSchemaName(schema);
    setIsConnected(hasSupabaseConfig());
  };

  const checkSchemaError = () => {
    // 從 localStorage 讀取當前的 schema 設定
    const storedSchema = localStorage.getItem('supabase_schema');
    const validSchemas = ['aiproject', 'public', 'graphql_public', 'myschema1'];
    
    if (storedSchema && !validSchemas.includes(storedSchema)) {
      console.error(`❌ Schema "${storedSchema}" 不在可用列表中`);
      console.log(`✅ 建議使用的 Schema: ${validSchemas.join(', ')}`);
      
      setDetectedError(`Schema "${storedSchema}" 可能無法使用。建議使用 aiproject 或其他可用的 Schema。`);
    } else if (!storedSchema) {
      // 如果沒有設定 schema，設定預設值
      console.log('⚠️ Schema 未設定，使用預設值 "aiproject"');
      localStorage.setItem('supabase_schema', 'aiproject');
      setSchemaName('aiproject');
    }
  };

  const validateInputs = (): boolean => {
    if (!supabaseUrl || !supabaseAnonKey) {
      toast.error('請填寫完整資訊');
      return false;
    }

    if (!supabaseUrl.startsWith('https://')) {
      toast.error('Supabase URL 必須以 https:// 開頭');
      return false;
    }

    if (!supabaseUrl.includes('supabase.co')) {
      toast.error('請輸入有效的 Supabase URL');
      return false;
    }

    if (supabaseAnonKey.length < 100) {
      toast.error('Anon Key 格式似乎不正確');
      return false;
    }

    return true;
  };

  const handleTestConnection = async () => {
    if (!validateInputs()) return;

    setTesting(true);
    
    // 暫存當前的連線資訊（如果有的話）
    const previousUrl = localStorage.getItem('supabase_url');
    const previousKey = localStorage.getItem('supabase_anon_key');
    const previousSchema = localStorage.getItem('supabase_schema');
    
    try {
      // 暫時儲存到 localStorage
      localStorage.setItem('supabase_url', supabaseUrl);
      localStorage.setItem('supabase_anon_key', supabaseAnonKey);
      localStorage.setItem('supabase_schema', schemaName || 'public');
      
      // 先重置所有實例（確保清理完成）
      resetSupabaseClient();
      StorageFactory.resetInstance();
      
      // 使用 setTimeout 確保重置完成後再創建新實例
      // 這樣可以避免在同一個事件循環中創建多個實例
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 測試連線
      const adapter = StorageFactory.getAdapter();
      const { data, error } = await adapter.testConnection();

      if (error || !data?.connected) {
        // 測試失敗：恢復之前的連線資訊
        if (previousUrl && previousKey) {
          localStorage.setItem('supabase_url', previousUrl);
          localStorage.setItem('supabase_anon_key', previousKey);
          if (previousSchema) {
            localStorage.setItem('supabase_schema', previousSchema);
          }
        } else {
          localStorage.removeItem('supabase_url');
          localStorage.removeItem('supabase_anon_key');
          localStorage.removeItem('supabase_schema');
        }
        
        toast.error(data?.message || '連線測試失敗');
        setIsConnected(!!previousUrl && !!previousKey);
        
        // 提示用戶需要重新整理
        toast.info('請重新整理頁面以恢復先前的設定');
      } else {
        toast.success('✅ 連線測試成功');
        toast.info('請點擊「儲存設定」以套用新的連線，或重新整理頁面');
        setIsConnected(true);
      }
    } catch (err) {
      console.error('測試連線錯誤:', err);
      
      // 恢復之前的連線資訊
      if (previousUrl && previousKey) {
        localStorage.setItem('supabase_url', previousUrl);
        localStorage.setItem('supabase_anon_key', previousKey);
        if (previousSchema) {
          localStorage.setItem('supabase_schema', previousSchema);
        }
      } else {
        localStorage.removeItem('supabase_url');
        localStorage.removeItem('supabase_anon_key');
        localStorage.removeItem('supabase_schema');
      }
      
      toast.error('測試連線時發生錯誤');
      toast.info('請重新整理頁面以恢復先前的設定');
      setIsConnected(!!previousUrl && !!previousKey);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!validateInputs()) return;

    setSaving(true);
    try {
      // 儲存連線資訊
      localStorage.setItem('supabase_url', supabaseUrl);
      localStorage.setItem('supabase_anon_key', supabaseAnonKey);
      localStorage.setItem('supabase_schema', schemaName);
      
      // 重置 Supabase client 和 StorageFactory
      resetSupabaseClient();
      StorageFactory.resetInstance();
      
      setIsConnected(true);
      toast.success('✅ Supabase 連線已儲存');
      toast.info('請重新整理頁面以套用新的連線設定');
    } catch (err) {
      console.error('儲存連線錯誤:', err);
      toast.error('儲存時發生錯誤');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('supabase_url');
    localStorage.removeItem('supabase_anon_key');
    StorageFactory.resetInstance();
    resetSupabaseClient();
    setSupabaseUrl('');
    setSupabaseAnonKey('');
    setIsConnected(false);
    toast.success('已中斷 Supabase 連線');
    toast.info('請重新整理頁面以切回 Local Phase');
  };

  // 遮罩 Anon Key 顯示
  const maskKey = (key: string): string => {
    if (!key || key.length < 20) return '***';
    return `${key.slice(0, 10)}...${key.slice(-10)}`;
  };

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div>
        <h1>Supabase 連線設定</h1>
        <p className="opacity-60 mt-2">
          配置 Supabase 資料庫連線，啟用完整的資料持久化與 AI 功能
        </p>
      </div>

      {/* Schema 錯誤警告 */}
      {detectedError && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <h4 className="text-red-900">偵測到 Schema 設定錯誤（已自動修正）</h4>
                <p className="opacity-80 text-sm">{detectedError}</p>
                <p className="opacity-80 text-sm">
                  系統已自動將 Schema 修正為 <code className="px-1 bg-red-100 rounded text-sm">public</code>。
                  請點擊下方按鈕立即套用修正，或手動選擇其他 Schema：
                </p>
                <div className="flex gap-2 flex-wrap items-center">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      window.location.reload();
                    }}
                  >
                    立即套用修正（重新整理）
                  </Button>
                  <div className="h-4 w-px bg-red-300"></div>
                  <span className="text-sm opacity-60">或選擇其他 Schema：</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      localStorage.setItem('supabase_schema', 'myschema1');
                      setSchemaName('myschema1');
                      setDetectedError('');
                      resetSupabaseClient();
                      StorageFactory.resetInstance();
                      toast.success('已切換至 myschema1');
                      toast.info('請重新整理頁面以套用');
                    }}
                    className="border-red-200"
                  >
                    使用 myschema1
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      localStorage.setItem('supabase_schema', 'graphql_public');
                      setSchemaName('graphql_public');
                      setDetectedError('');
                      resetSupabaseClient();
                      StorageFactory.resetInstance();
                      toast.success('已切換至 graphql_public');
                      toast.info('請重新整理頁面以套用');
                    }}
                    className="border-red-200"
                  >
                    使用 graphql_public
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 當前連線狀態 */}
      <Card>
        <CardHeader>
          <h3>連線狀態</h3>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="opacity-60">狀態</span>
            <Badge variant={isConnected ? 'default' : 'secondary'}>
              {isConnected ? (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  已連線
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  未連線
                </span>
              )}
            </Badge>
          </div>
          {isConnected && (
            <>
              <div className="flex items-center justify-between">
                <span className="opacity-60">Supabase URL</span>
                <code className="px-2 py-1 bg-muted rounded-[var(--radius)]">
                  {supabaseUrl}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="opacity-60">Anon Key</span>
                <code className="px-2 py-1 bg-muted rounded-[var(--radius)]">
                  {maskKey(supabaseAnonKey)}
                </code>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 連線設定表單 */}
      <Card>
        <CardHeader>
          <h3>Supabase 連線資訊</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Supabase URL */}
          <div className="space-y-2">
            <Label htmlFor="supabaseUrl">Supabase Project URL</Label>
            <Input
              id="supabaseUrl"
              type="url"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              placeholder="https://xxxxxxxxxxxxxxxxxxxx.supabase.co"
            />
            <p className="opacity-60 text-sm">
              <Info className="w-4 h-4 inline mr-1" />
              可在 Supabase Dashboard → Settings → API 中找到
            </p>
          </div>

          {/* Anon Key */}
          <div className="space-y-2">
            <Label htmlFor="supabaseAnonKey">Anon / Public Key</Label>
            <Input
              id="supabaseAnonKey"
              type="password"
              value={supabaseAnonKey}
              onChange={(e) => setSupabaseAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            />
            <p className="opacity-60 text-sm">
              <Info className="w-4 h-4 inline mr-1" />
              Supabase Dashboard → Settings → API → anon public
            </p>
          </div>

          {/* Schema Name */}
          <div className="space-y-2">
            <Label htmlFor="schemaName">Schema Name</Label>
            <select
              id="schemaName"
              value={schemaName}
              onChange={(e) => setSchemaName(e.target.value)}
              className="flex h-10 w-full rounded-[var(--radius)] border border-input bg-background px-3 py-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="aiproject">aiproject（推薦）</option>
              <option value="public">public</option>
              <option value="myschema1">myschema1</option>
              <option value="graphql_public">graphql_public</option>
            </select>
            <p className="opacity-60 text-sm">
              <Info className="w-4 h-4 inline mr-1" />
              已成功建立 aiproject schema，建議使用此選項。其他可用 Schema：public, graphql_public, myschema1
            </p>
          </div>

          {/* 操作按鈕 */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={testing || !supabaseUrl || !supabaseAnonKey}
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  測試中...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  測試連線
                </>
              )}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !supabaseUrl || !supabaseAnonKey}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  儲存中...
                </>
              ) : (
                '儲存設定'
              )}
            </Button>
            {isConnected && (
              <Button
                variant="destructive"
                onClick={handleDisconnect}
              >
                中斷連線
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 設定說明 */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="text-blue-900">設定步驟</h4>
              <ol className="space-y-1 opacity-80 list-decimal list-inside text-sm">
                <li>前往 <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline">Supabase Dashboard</a></li>
                <li>選擇你的專案</li>
                <li>前往 Settings → API</li>
                <li>複製 Project URL 和 anon public Key</li>
                <li>確認你的 Schema 名稱（在 SQL Editor 中查看）</li>
                <li>貼到上方輸入框</li>
                <li>點擊「測試連線」確認設定正確</li>
                <li>點擊「儲存設定」並重新整理頁面</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schema 提示 */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="text-amber-900">重要提醒</h4>
              <p className="opacity-80 text-sm">
                請確保已在 Supabase 中建立專屬的 Schema 並執行建表 SQL。
                相關 SQL 檔案位於：<code className="px-1 bg-amber-100 rounded text-sm">/docs/sql/ai_settings_schema.sql</code>
              </p>
              <p className="opacity-80 text-sm">
                若您想為此專案建立獨立的 Schema，請在 Supabase SQL Editor 中執行：
                <code className="px-1 bg-amber-100 rounded text-sm block mt-1">CREATE SCHEMA aiproject;</code>
                然後在上方欄位輸入 <code className="px-1 bg-amber-100 rounded text-sm">aiproject</code>。
              </p>
              <p className="opacity-80 text-sm">
                如果要使用現有的 Schema，請確認該 Schema 中已建立所需的資料表。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}