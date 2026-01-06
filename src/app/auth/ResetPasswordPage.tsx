import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock, Loader2, KeyRound } from 'lucide-react';
import { motion } from 'motion/react';

export default function ResetPasswordPage() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // 嘗試獲取 Session，確認是從郵件連結過來的
    useEffect(() => {
        const supabase = getSupabaseClient();
        supabase.auth.getSession().then(({ data }) => {
            if (!data.session) {
                toast.warning('無效的重設連結或連結已過期，請重新發送');
                // 停留在此或導向首頁
            }
        });
    }, []);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const supabase = getSupabaseClient();
            const { error } = await supabase.auth.updateUser({ password: password });

            if (error) throw error;

            toast.success('密碼已成功更新，請使用新密碼登入');
            navigate('/login');
        } catch (error: any) {
            console.error('Reset error:', error);
            toast.error(error.message || '重設失敗，請確認您已登入或連結有效');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md px-4 relative z-10"
            >
                <Card className="border-border/50 bg-card/50 backdrop-blur-xl shadow-2xl">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                            <KeyRound className="w-6 h-6 text-primary" />
                        </div>
                        <CardTitle className="text-2xl">重設密碼</CardTitle>
                    </CardHeader>
                    <form onSubmit={handleUpdate}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="new-password">新密碼</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="new-password"
                                        type="password"
                                        placeholder="輸入您的新密碼"
                                        className="pl-9"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={loading || !password}
                            >
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                更新密碼
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </motion.div>
        </div>
    );
}
