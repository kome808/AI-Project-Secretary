import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
    Sparkles,
    Layout,
    BrainCircuit,
    MessageSquare,
    Zap,
    BarChart3,
    ShieldCheck
} from 'lucide-react';

export function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#FDFDFD] text-slate-900 font-sans selection:bg-blue-100">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/80 backdrop-blur-md">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-6xl">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-lg tracking-tight text-slate-800">AI 專案秘書</span>
                    </div>
                    <Button
                        variant="ghost"
                        className="rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium"
                        onClick={() => navigate('/app')}
                    >
                        登入系統
                    </Button>
                </div>
            </header>

            <main className="container mx-auto px-4 py-16 max-w-6xl space-y-24">
                {/* Hero Section */}
                <section className="text-center space-y-8 max-w-3xl mx-auto pt-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-medium mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        v0.11 全新發布
                    </div>

                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1] animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
                        專案管理的
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600"> 智慧進化</span>
                    </h1>

                    <p className="text-lg md:text-xl text-slate-500 leading-relaxed max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                        結合 AI 語意分析協助專案進度管理與任務規劃，從晨間簡報到動態 WBS，您的 24/7 全能專案助理。
                    </p>

                    <div className="pt-8 animate-in fade-in zoom-in duration-700 delay-300">
                        {/* Visual Placeholder for Dashboard/Chat Interface */}
                        <div className="relative rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-200/50 overflow-hidden">
                            <div className="aspect-[16/9] bg-slate-50 rounded-xl overflow-hidden relative group">
                                {/* Abstract UI Representation */}
                                <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                                    <div className="grid grid-cols-12 gap-4 w-3/4 opacity-80 group-hover:scale-105 transition-transform duration-700">
                                        <div className="col-span-4 h-32 bg-white rounded-lg shadow-sm border border-slate-100/50"></div>
                                        <div className="col-span-8 h-32 bg-white rounded-lg shadow-sm border border-slate-100/50"></div>
                                        <div className="col-span-12 h-48 bg-white rounded-lg shadow-sm border border-slate-100/50"></div>
                                    </div>
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Button variant="outline" className="bg-white/80 backdrop-blur shadow-sm hover:bg-white" onClick={() => navigate('/app')}>
                                        預覽系統介面
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Pain Points (Bento Grid Start) */}
                <section className="space-y-12">
                    <div className="text-center space-y-4">
                        <h2 className="text-3xl font-bold text-slate-900">為什麼專案總是管不好？</h2>
                        <p className="text-slate-500 text-lg">解決那些讓您頭痛的專案管理難題</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-6 text-red-500">
                                <BrainCircuit className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">資訊破碎</h3>
                            <p className="text-slate-500 leading-relaxed">
                                規格散落在 Email、Line 與會議記錄中，永遠找不到最新版本？
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center mb-6 text-orange-500">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">進度黑箱</h3>
                            <p className="text-slate-500 leading-relaxed">
                                不確定接下來專案要進行什麼？什麼時候要完成哪些工作項目？
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mb-6 text-amber-500">
                                <MessageSquare className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">執行斷層</h3>
                            <p className="text-slate-500 leading-relaxed">
                                會議記錄只是記錄，卻沒有追蹤掌握後續進度？
                            </p>
                        </div>
                    </div>
                </section>

                {/* Core Features (Bento Grid Main) */}
                <section className="space-y-12">
                    <div className="text-center space-y-4">
                        <h2 className="text-3xl font-bold text-slate-900">全方位的智慧解決方案</h2>
                        <p className="text-slate-500 text-lg">不僅是工具，更是您的專案思維夥伴</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[minmax(180px,auto)]">
                        {/* Feature 1: AI Analysis - Large Card */}
                        <div className="md:col-span-8 bg-slate-900 text-white p-8 rounded-3xl relative overflow-hidden group">
                            <div className="relative z-10 max-w-md">
                                <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center mb-6 text-blue-300">
                                    <Sparkles className="w-6 h-6" />
                                </div>
                                <h3 className="text-2xl font-bold mb-3">智慧分析與收件匣</h3>
                                <p className="text-slate-300 leading-relaxed">
                                    自動分析會議記錄、Email 與需求文件，將雜亂資訊轉化為結構化任務。
                                    透過 AI 收件匣，智慧過濾與建議，確保決策權在您手中。
                                </p>
                            </div>
                            <div className="absolute right-0 bottom-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -mr-16 -mb-16"></div>
                        </div>

                        {/* Feature 2: Morning Brief - Tall Card */}
                        <div className="md:col-span-4 row-span-2 bg-blue-50 p-8 rounded-3xl border border-blue-100 flex flex-col justify-between group hover:border-blue-200 transition-colors">
                            <div>
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6 text-blue-600 shadow-sm">
                                    <Zap className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-3">晨間簡報</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    每日自動彙整專案狀態，標示風險、逾期與待辦，讓您精準開啟一天的工作。
                                </p>
                            </div>
                            <div className="mt-8 bg-white p-4 rounded-xl shadow-sm border border-blue-100/50 opacity-80 group-hover:opacity-100 transition-opacity">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="w-2 h-2 rounded-full bg-red-400"></span>
                                    <span className="text-xs font-bold text-slate-700">今日優先處理</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full w-3/4 mb-2"></div>
                                <div className="h-2 bg-slate-100 rounded-full w-1/2"></div>
                            </div>
                        </div>

                        {/* Feature 3: Dynamic WBS */}
                        <div className="md:col-span-4 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mb-6 text-green-600">
                                <Layout className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">動態 WBS: 任務清單</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                AI 將討論轉化為專案工作與功能模組，清楚掌握負責人與期限。
                            </p>
                        </div>

                        {/* Feature 4: Team Sync */}
                        <div className="md:col-span-4 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 text-purple-600">
                                <BarChart3 className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">即時協作</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                團隊成員同步，權限管理與任務指派，讓專案資訊透明化。
                            </p>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="border-t border-slate-100 pt-12 pb-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                        <div className="col-span-2">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center">
                                    <Sparkles className="w-3 h-3 text-white" />
                                </div>
                                <span className="font-bold text-slate-800">AI 專案秘書</span>
                            </div>
                            <p className="text-slate-400 text-sm max-w-xs">
                                賦能團隊，提升 40% 專案管理效率的智慧化解決方案。
                            </p>
                        </div>
                        <div className="space-y-4">
                            <h4 className="font-bold text-slate-900">產品</h4>
                            <ul className="space-y-2 text-sm text-slate-500">
                                <li><a href="#" className="hover:text-blue-600">功能特色</a></li>
                                <li><a href="#" className="hover:text-blue-600">解決方案</a></li>
                                <li><a href="#" className="hover:text-blue-600">價格方案</a></li>
                            </ul>
                        </div>
                        <div className="space-y-4">
                            <h4 className="font-bold text-slate-900">資源</h4>
                            <ul className="space-y-2 text-sm text-slate-500">
                                <li><a href="#" className="hover:text-blue-600">使用教學</a></li>
                                <li><a href="#" className="hover:text-blue-600">知識庫</a></li>
                                <li><a href="#" className="hover:text-blue-600">關於我們</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-slate-50 pt-8 flex items-center justify-between text-xs text-slate-400">
                        <p>&copy; 2026 AI Project Assistant. All rights reserved.</p>
                        <div className="flex gap-4">
                            <a href="#" className="hover:text-slate-600">隱私權政策</a>
                            <a href="#" className="hover:text-slate-600">服務條款</a>
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
}
