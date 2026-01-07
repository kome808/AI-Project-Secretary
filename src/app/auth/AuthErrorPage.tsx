
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function AuthErrorPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [errorDetails, setErrorDetails] = useState<{
        code: string | null;
        description: string | null;
        message: string | null;
    } | null>(null);

    useEffect(() => {
        // In HashRouter, location.pathname is the part after #.
        // e.g. "/error=access_denied&error_code=otp_expired&..."
        // or just "error=..." if there was no leading slash (which Supabase might do).

        // Check if the pathname itself looks like a query string
        const path = location.pathname;
        let queryString = '';

        if (path.startsWith('/')) {
            // Remove leading slash to check for query params format
            const potentialQuery = path.substring(1);
            if (potentialQuery.includes('error=')) {
                queryString = potentialQuery;
            }
        } else if (path.includes('error=')) {
            queryString = path;
        }

        // Also check location.hash or location.search just in case React Router parsed it differently
        // But in HashRouter, the actual browser hash is the route.

        if (!queryString && location.search) {
            queryString = location.search.substring(1); // remove ?
        }

        if (queryString) {
            const params = new URLSearchParams(queryString);
            const error = params.get('error');
            const errorCode = params.get('error_code');
            const errorDescription = params.get('error_description');

            if (error || errorCode) {
                setErrorDetails({
                    code: errorCode || error,
                    description: errorDescription ? errorDescription.replace(/\+/g, ' ') : null,
                    message: '驗證連結無效或已過期',
                });
            }
        }
    }, [location]);

    // If no error detected, maybe it's just a 404
    if (!errorDetails) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-4 text-zinc-100">
                <h1 className="text-2xl font-bold mb-4">頁面未找到 (404)</h1>
                <p className="mb-8 text-zinc-400">您訪問的路徑不存在：{location.pathname}</p>
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 hover:bg-zinc-700"
                >
                    <ArrowLeft size={16} />
                    回首頁
                </button>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-4 text-zinc-100">
            <div className="max-w-md w-full bg-zinc-900 border border-red-900/50 rounded-xl p-8 shadow-xl">
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mb-6">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>

                    <h1 className="text-2xl font-bold mb-2">驗證失敗</h1>
                    <p className="text-lg text-zinc-300 mb-6">{errorDetails.message}</p>

                    <div className="w-full bg-red-950/30 border border-red-900/30 rounded-lg p-4 mb-8 text-left">
                        <p className="text-xs text-red-400 font-mono mb-1">Error Code: {errorDetails.code}</p>
                        <p className="text-sm text-red-300">{errorDetails.description}</p>
                    </div>

                    <div className="flex flex-col gap-3 w-full">
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full bg-zinc-100 text-zinc-950 hover:bg-zinc-300 font-medium py-2.5 rounded-lg transition-colors"
                        >
                            返回登入頁
                        </button>
                        {errorDetails.code === 'otp_expired' && (
                            <button
                                onClick={() => navigate('/forgot-password')} // Or a way to re-send invite?
                                className="w-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700 font-medium py-2.5 rounded-lg transition-colors"
                            >
                                重新申請密碼重設
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
