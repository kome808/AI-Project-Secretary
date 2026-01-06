import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Mail, Loader2, ArrowLeft, Send } from 'lucide-react';
import { motion } from 'motion/react';

export default function ForgotPasswordPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 建構 Redirect URL：指向首頁 (App.tsx 會自動攔截並導向重設頁)
            const redirectUrl = window.location.origin;

            const supabase = getSupabaseClient();
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: redirectUrl,
            });

            if (error) throw error;

            setSent(true);
            toast.success('重設信件已發送，請檢查您的信箱');
        } catch (error: any) {
            console.error('Reset request error:', error);
            toast.error(error.message || '發送失敗，請稍後再試');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md px-4 relative z-10"
            >
                <Card className="border-border/50 bg-card/50 backdrop-blur-xl shadow-2xl">
                    <CardHeader className="text-center pb-2">
                        <CardTitle className="text-2xl">忘記密碼</CardTitle>
                        <p className="text-sm text-muted-foreground mt-2">
                            輸入您的註冊 Email，我們將寄送重設連結給您
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        {!sent ? (
                            <form onSubmit={handleReset} className="space-y-4">
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
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            發送中...
                                        </>
                                    ) : (
                                        <>
                                            發送重設信件
                                            <Send className="ml-2 h-4 w-4" />
                                        </>
                                    )}
                                </Button>
                            </form>
                        ) : (
                            <div className="text-center space-y-4 py-4">
                                <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                    <Send className="w-6 h-6 text-green-600 dark:text-green-400" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="font-medium">信件已發送</h3>
                                    <p className="text-sm text-muted-foreground">
                                        請檢查 {email} 的收件匣（包含垃圾郵件），點擊連結以設定新密碼。
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    className="w-full mt-4"
                                    onClick={() => setSent(false)}
                                >
                                    重發信件
                                </Button>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="justify-center border-t border-border/50 pt-4">
                        <Link
                            to="/login"
                            className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            返回登入
                        </Link>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
}
