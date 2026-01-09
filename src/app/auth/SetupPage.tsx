import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Database, AlertCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

export default function SetupPage() {
    const [url, setUrl] = useState('');
    const [key, setKey] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Basic validation
            if (!url.startsWith('http')) {
                throw new Error('Supabase URL 必須以 http 或 https 開頭');
            }
            if (key.length < 20) {
                throw new Error('Supabase Key 似乎太短，請檢查是否正確');
            }

            // Test connection
            try {
                const tempClient = createClient(url, key);
                // Attempt a lightweight call (e.g., fetch session or health check)
                // Since we don't know the schema, we'll assume auth.getSession is safe enough to test connectivity
                // even if it returns no session.
                const { error } = await tempClient.auth.getSession();
                if (error) throw error;
            } catch (connErr) {
                console.error('Connection test failed:', connErr);
                throw new Error('無法連線到 Supabase，請檢查 URL 和 Key 是否正確');
            }

            // Save to localStorage
            localStorage.setItem('supabase_url', url);
            localStorage.setItem('supabase_anon_key', key);

            toast.success('設定已儲存！正在重新啟動應用程式...');

            // Force reload to pick up new config
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
            <Card className="max-w-md w-full shadow-xl border-primary/20">
                <CardHeader>
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary mx-auto">
                        <Database className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-center text-xl">系統初始化設定</CardTitle>
                    <CardDescription className="text-center">
                        初次啟動需要配置 Supabase 連線資訊
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSave}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="url">Supabase Project URL</Label>
                            <Input
                                id="url"
                                placeholder="https://your-project.supabase.co"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="key">Supabase Anon Key</Label>
                            <Input
                                id="key"
                                type="password"
                                placeholder="eyJh..."
                                value={key}
                                onChange={(e) => setKey(e.target.value)}
                                required
                            />
                        </div>

                        <div className="bg-muted/50 p-3 rounded-md text-sm text-muted-foreground flex gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <p>這些資訊將儲存在您的瀏覽器 LocalStorage 中。您可以在 Supabase Dashboard 的 Project Settings &gt; API 中找到。</p>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? '驗證連線中...' : '儲存並啟動'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
