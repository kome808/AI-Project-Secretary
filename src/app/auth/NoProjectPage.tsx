import { useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { FolderX, LogOut, RefreshCw, Mail, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';

export default function NoProjectPage() {
    const navigate = useNavigate();
    const [checking, setChecking] = useState(false);

    const handleLogout = async () => {
        try {
            const supabase = getSupabaseClient();
            await supabase.auth.signOut();
            localStorage.removeItem('current_user');
            toast.success('已登出');
            navigate('/login');
        } catch (error) {
            console.error('Logout error:', error);
            toast.error('登出失敗');
        }
    };

    const handleRefresh = async () => {
        setChecking(true);
        try {
            const supabase = getSupabaseClient();
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.user?.email) {
                toast.error('無法取得使用者資訊');
                navigate('/login');
                return;
            }

            // 重新檢查是否有專案
            const { data: memberRecords, error } = await supabase
                .schema('aiproject')
                .from('members')
                .select('id, project_id')
                .eq('email', session.user.email);

            if (error) {
                console.error('Check projects error:', error);
                toast.error('檢查失敗，請稍後再試');
                return;
            }

            if (memberRecords && memberRecords.length > 0) {
                toast.success('找到專案！正在跳轉...');
                navigate('/');
            } else {
                toast.info('目前仍無專案，請與 PM 聯絡');
            }
        } catch (error) {
            console.error('Refresh error:', error);
            toast.error('發生錯誤');
        } finally {
            setChecking(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
            <div className="absolute left-0 top-0 w-full h-full bg-gradient-to-b from-background via-background to-amber-500/5 pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md px-4 relative z-10"
            >
                <Card className="border-border/50 bg-card/50 backdrop-blur-xl shadow-2xl">
                    <CardContent className="pt-8 pb-6 space-y-6">
                        {/* Icon */}
                        <div className="flex justify-center">
                            <div className="p-5 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                                <FolderX className="h-12 w-12 text-amber-500" />
                            </div>
                        </div>

                        {/* Message */}
                        <div className="text-center space-y-2">
                            <h1 className="text-2xl font-bold">尚未加入任何專案</h1>
                            <p className="text-muted-foreground">
                                您的帳號目前沒有被分配到任何專案。<br />
                                請聯繫專案經理 (PM) 將您加入專案。
                            </p>
                        </div>

                        {/* Contact Info */}
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                            <Mail className="h-4 w-4" />
                            <span>請聯絡您的專案經理取得專案存取權限</span>
                        </div>

                        {/* Actions */}
                        <div className="space-y-3">
                            <Button
                                onClick={handleRefresh}
                                disabled={checking}
                                className="w-full h-11"
                                variant="default"
                            >
                                {checking ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        檢查中...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        重新檢查專案
                                    </>
                                )}
                            </Button>

                            <Button
                                onClick={handleLogout}
                                variant="outline"
                                className="w-full h-11"
                            >
                                <LogOut className="h-4 w-4 mr-2" />
                                登出
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
