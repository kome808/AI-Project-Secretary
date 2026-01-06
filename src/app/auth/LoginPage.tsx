import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock, Mail, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export default function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            if (data.session) {
                // --- 權限判斷邏輯 ---
                const user = data.session.user;
                const userEmail = user.email || '';

                // 白名單：指定 Email 為管理員
                const isAdmin = userEmail === 'kome808@gmail.com';
                const role = isAdmin ? 'admin' : 'member';

                // 建構 Member 物件
                const member = {
                    id: user.id,
                    name: userEmail.split('@')[0] || 'User',
                    email: userEmail,
                    role: role,
                    avatar: user.user_metadata?.avatar_url || 'https://github.com/shadcn.png',
                    status: 'active',
                    joined_at: new Date().toISOString()
                };

                // 1. 持久化儲存 (讓 App 重整後能讀取)
                localStorage.setItem('current_user', JSON.stringify(member));

                toast.success(`登入成功！歡迎回來 ${isAdmin ? '(管理員)' : ''}`);
                navigate('/');
            }
        } catch (error: any) {
            console.error('Login error:', error);
            toast.error(error.message || '登入失敗，請檢查帳號密碼');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
            <div className="absolute left-0 top-0 w-full h-full bg-gradient-to-b from-background via-background to-primary/5 pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md px-4 relative z-10"
            >
                <div className="text-center mb-8">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 border border-primary/20 shadow-[0_0_30px_-10px_rgba(var(--primary),0.3)]">
                        <ShieldCheck className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">歡迎回來</h1>
                    <p className="text-muted-foreground">請登入您的 AI 專案助理帳號</p>
                </div>

                <Card className="border-border/50 bg-card/50 backdrop-blur-xl shadow-2xl">
                    <form onSubmit={handleLogin}>
                        <CardContent className="pt-6 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@example.com"
                                        className="pl-9"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">密碼</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        className="pl-9"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                                        忘記密碼？
                                    </Link>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-4">
                            <Button
                                type="submit"
                                className="w-full h-11 text-base shadow-[0_0_20px_-5px_rgba(var(--primary),0.4)] transition-all hover:shadow-[0_0_30px_-5px_rgba(var(--primary),0.6)]"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        登入中...
                                    </>
                                ) : (
                                    <>
                                        登入系統
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>

                            <div className="text-center text-xs text-muted-foreground">
                                <p>還沒有帳號？請聯繫系統管理員（即專案擁有者）</p>
                                <p className="mt-1 opacity-50">預設管理員請至 Supabase Dashboard 建立</p>
                            </div>
                        </CardFooter>
                    </form>
                </Card>
            </motion.div>
        </div>
    );
}
