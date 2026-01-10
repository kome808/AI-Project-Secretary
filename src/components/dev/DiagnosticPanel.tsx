import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

interface DiagnosticResult {
  name: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

export function DiagnosticPanel() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [checking, setChecking] = useState(false);

  const runDiagnostics = () => {
    setChecking(true);
    const diagnostics: DiagnosticResult[] = [];

    // 檢查 1: Supabase URL（優先環境變數，其次 localStorage）
    const supabaseUrlEnv = import.meta.env.VITE_SUPABASE_URL;
    const supabaseUrlLocal = localStorage.getItem('supabase_url');
    const supabaseUrl = supabaseUrlEnv || supabaseUrlLocal;

    if (supabaseUrl) {
      diagnostics.push({
        name: 'Supabase URL',
        status: 'success',
        message: supabaseUrlEnv ? '已設定（環境變數）' : '已設定（localStorage）',
        details: supabaseUrl.substring(0, 40) + '...',
      });
    } else {
      diagnostics.push({
        name: 'Supabase URL',
        status: 'error',
        message: '未設定',
        details: '請設定環境變數 VITE_SUPABASE_URL 或 localStorage',
      });
    }

    // 檢查 2: Supabase Anon Key（優先環境變數，其次 localStorage）
    const supabaseKeyEnv = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const supabaseKeyLocal = localStorage.getItem('supabase_anon_key');
    const supabaseKey = supabaseKeyEnv || supabaseKeyLocal;

    if (supabaseKey) {
      diagnostics.push({
        name: 'Supabase Anon Key',
        status: 'success',
        message: supabaseKeyEnv ? '已設定（環境變數）' : '已設定（localStorage）',
        details: supabaseKey.substring(0, 10) + '...' + supabaseKey.substring(supabaseKey.length - 10),
      });
    } else {
      diagnostics.push({
        name: 'Supabase Anon Key',
        status: 'error',
        message: '未設定',
        details: '請設定環境變數 VITE_SUPABASE_ANON_KEY 或 localStorage',
      });
    }


    // 檢查 3: Schema Name
    const schemaName = localStorage.getItem('supabase_schema');
    if (schemaName) {
      diagnostics.push({
        name: 'Schema Name',
        status: 'success',
        message: `使用 schema: ${schemaName}`,
      });
    } else {
      diagnostics.push({
        name: 'Schema Name',
        status: 'warning',
        message: '未設定（將使用預設值 aiproject）',
      });
    }

    // 檢查 4: 其他 localStorage keys
    const allKeys = Object.keys(localStorage);
    diagnostics.push({
      name: 'LocalStorage 總覽',
      status: 'success',
      message: `共 ${allKeys.length} 個 keys`,
      details: allKeys.join(', '),
    });

    // 檢查 5: 是否有專案資料
    const hasProjects = allKeys.some(key => key.includes('project'));
    if (hasProjects) {
      diagnostics.push({
        name: '專案資料',
        status: 'success',
        message: '偵測到專案相關資料',
      });
    } else {
      diagnostics.push({
        name: '專案資料',
        status: 'warning',
        message: '未偵測到專案資料',
      });
    }

    setResults(diagnostics);
    setChecking(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-amber-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      case 'error':
        return 'bg-red-50 border-red-200';
    }
  };

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-transparent">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <h3 className="text-blue-700">系統診斷工具</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={runDiagnostics}
            disabled={checking}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
            重新檢查
          </Button>
        </div>
        <p className="text-muted-foreground mt-1">
          <label>檢查 Supabase 連線與 AI 設定狀態</label>
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {results.map((result, index) => (
          <div
            key={index}
            className={`p-3 rounded-[var(--radius)] border ${getStatusColor(result.status)}`}
          >
            <div className="flex items-start gap-3">
              {getStatusIcon(result.status)}
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{result.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {result.message}
                  </span>
                </div>
                {result.details && (
                  <p className="text-xs text-muted-foreground break-all">
                    {result.details}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}

        <div className="pt-3 border-t border-border">
          <p className="text-sm text-muted-foreground">
            <label>
              💡 <strong>提示</strong>：如果發現資料遺失，請重新填寫 Supabase 連線設定和 AI 設定
            </label>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
