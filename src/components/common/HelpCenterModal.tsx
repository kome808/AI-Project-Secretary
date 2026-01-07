import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    LayoutDashboard,
    Inbox,
    ListTodo,
    Briefcase,
    FileText,
    Settings,
    Rocket,
    BookOpen,
    Sparkles
} from 'lucide-react';
import {
    systemIntro,
    moduleDescriptions,
    quickStartGuide
} from '@/lib/help/helpContent';

interface HelpCenterModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

// Icon mapping
const iconMap: Record<string, React.ReactNode> = {
    LayoutDashboard: <LayoutDashboard className="h-5 w-5" />,
    Inbox: <Inbox className="h-5 w-5" />,
    ListTodo: <ListTodo className="h-5 w-5" />,
    Briefcase: <Briefcase className="h-5 w-5" />,
    FileText: <FileText className="h-5 w-5" />,
    Settings: <Settings className="h-5 w-5" />
};

/**
 * 幫助中心 Modal
 * 包含系統簡介、功能說明、操作流程指引
 */
export function HelpCenterModal({ open, onOpenChange }: HelpCenterModalProps) {
    const [activeTab, setActiveTab] = useState('intro');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] p-0">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <BookOpen className="h-5 w-5 text-primary" />
                        幫助中心
                    </DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
                    <div className="border-b px-6">
                        <TabsList className="grid w-full grid-cols-3 h-10">
                            <TabsTrigger value="intro" className="gap-2">
                                <Sparkles className="h-4 w-4" />
                                系統簡介
                            </TabsTrigger>
                            <TabsTrigger value="modules" className="gap-2">
                                <LayoutDashboard className="h-4 w-4" />
                                功能說明
                            </TabsTrigger>
                            <TabsTrigger value="guide" className="gap-2">
                                <Rocket className="h-4 w-4" />
                                快速入門
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <ScrollArea className="h-[calc(85vh-140px)]">
                        {/* 系統簡介 */}
                        <TabsContent value="intro" className="p-6 mt-0">
                            <div className="space-y-6">
                                <div className="text-center space-y-3">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 mb-2">
                                        <Sparkles className="h-8 w-8 text-primary" />
                                    </div>
                                    <h2 className="text-2xl font-bold">{systemIntro.title}</h2>
                                    <p className="text-muted-foreground">{systemIntro.subtitle}</p>
                                </div>

                                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                                    {systemIntro.description.split('\n').map((line, i) => {
                                        if (!line.trim()) return null;
                                        if (line.startsWith('•')) {
                                            const [bold, ...rest] = line.slice(2).split(' - ');
                                            return (
                                                <p key={i} className="flex items-start gap-2">
                                                    <span className="text-primary mt-1">•</span>
                                                    <span>
                                                        <strong>{bold}</strong>
                                                        {rest.length > 0 && ` - ${rest.join(' - ')}`}
                                                    </span>
                                                </p>
                                            );
                                        }
                                        return <p key={i}>{line}</p>;
                                    })}
                                </div>

                                <div className="text-center text-sm text-muted-foreground">
                                    探索下方的「功能說明」和「快速入門」了解更多！
                                </div>
                            </div>
                        </TabsContent>

                        {/* 功能模組說明 */}
                        <TabsContent value="modules" className="p-6 mt-0">
                            <div className="grid gap-4">
                                {moduleDescriptions.map((module) => (
                                    <Card key={module.id} className="overflow-hidden">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="flex items-center gap-3 text-base">
                                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                                    {iconMap[module.icon]}
                                                </div>
                                                {module.title}
                                            </CardTitle>
                                            <CardDescription>{module.description}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="pb-4">
                                            <ul className="space-y-1.5 text-sm text-muted-foreground">
                                                {module.details.map((detail, idx) => (
                                                    <li key={idx} className="flex items-start gap-2">
                                                        <span className="text-primary mt-0.5">✓</span>
                                                        {detail}
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </TabsContent>

                        {/* 快速入門指引 */}
                        <TabsContent value="guide" className="p-6 mt-0">
                            <div className="space-y-6">
                                <div className="text-center space-y-2">
                                    <h3 className="text-lg font-semibold">5 分鐘快速上手</h3>
                                    <p className="text-sm text-muted-foreground">
                                        跟著以下步驟，快速開始使用 AI 專案助理
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    {quickStartGuide.map((item) => (
                                        <div
                                            key={item.step}
                                            className="flex gap-4 p-4 bg-muted/30 rounded-lg"
                                        >
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                                                {item.step}
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="font-medium">{item.title}</h4>
                                                <p className="text-sm text-muted-foreground">
                                                    {item.description}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </TabsContent>
                    </ScrollArea>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
