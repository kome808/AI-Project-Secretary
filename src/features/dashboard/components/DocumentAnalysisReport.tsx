import React, { useState } from 'react';
import {
    CheckCircle2,
    AlertTriangle,
    Layout,
    PlusCircle,
    ArrowRight,
    FileText,
    Zap,
    Info,
    ShieldAlert,
    Save,
    Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { DocumentAnalysisResult, AnalysisChunk, MappingAction } from '@/lib/storage/DocumentAnalysisTypes';
import { useProject } from '@/app/context/ProjectContext';
import { toast } from 'sonner';

interface DocumentAnalysisReportProps {
    result: DocumentAnalysisResult;
    onConfirm: (selectedChunks: AnalysisChunk[]) => Promise<void>;
    onClose: () => void;
}

export function DocumentAnalysisReport({ result, onConfirm, onClose }: DocumentAnalysisReportProps) {
    const { currentProject } = useProject();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(
        new Set(result.chunks.filter(c => c.mappingResult.action !== 'ignore').map(c => c.id))
    );
    const [isProcessing, setIsProcessing] = useState(false);

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const toggleAll = () => {
        if (selectedIds.size === result.chunks.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(result.chunks.map(c => c.id)));
        }
    };

    const handleConfirm = async () => {
        if (selectedIds.size === 0) {
            toast.error('請至少選擇一個項目');
            return;
        }

        setIsProcessing(true);
        try {
            const selectedChunks = result.chunks.filter(c => selectedIds.has(c.id));
            await onConfirm(selectedChunks);
            toast.success(`成功處理 ${selectedChunks.length} 個項目`);
            onClose();
        } catch (err) {
            console.error('確認失敗:', err);
            toast.error('處理失敗，請稍後再試');
        } finally {
            setIsProcessing(false);
        }
    };

    const getActionIcon = (action: MappingAction) => {
        switch (action) {
            case 'create_new': return <PlusCircle className="w-4 h-4 text-blue-500" />;
            case 'map_existing': return <ArrowRight className="w-4 h-4 text-green-500" />;
            case 'append_spec': return <FileText className="w-4 h-4 text-amber-500" />;
            default: return <Info className="w-4 h-4 text-gray-400" />;
        }
    };

    const getActionLabel = (action: MappingAction) => {
        switch (action) {
            case 'create_new': return '建議新建';
            case 'map_existing': return '對應現有';
            case 'append_spec': return '附加規格';
            case 'ignore': return '忽略';
            default: return action;
        }
    };

    return (
        <div className="flex flex-col h-full max-h-[80vh]">
            {/* Header & Stats */}
            <div className="p-6 border-b border-border space-y-4 bg-muted/30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Zap className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight">AI 智慧分析報告</h2>
                            <p className="text-sm text-muted-foreground">已完成文件語義切片與任務映射建議</p>
                        </div>
                    </div>
                    <Badge variant="outline" className="px-3 py-1">
                        {result.documentType === 'meeting_notes' ? '📅 會議紀錄' :
                            result.documentType === 'requirements' ? '📋 需求規格' : '📄 一般文件'}
                    </Badge>
                </div>

                <div className="grid grid-cols-4 gap-4">
                    <StatCard icon={<Layout className="text-blue-500" />} label="建議新建" value={result.summary.newItems} />
                    <StatCard icon={<CheckCircle2 className="text-green-500" />} label="自動映射" value={result.summary.mappedItems} />
                    <StatCard icon={<FileText className="text-amber-500" />} label="附加規格" value={result.summary.appendedSpecs} />
                    <StatCard icon={<ShieldAlert className="text-red-500" />} label="關鍵風險" value={result.summary.criticalRisks} />
                </div>
            </div>

            {/* Main Content */}
            <ScrollArea className="flex-1 p-6">
                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            分析詳情 ({result.chunks.length} 片段)
                        </h3>
                        <Button variant="ghost" size="sm" onClick={toggleAll} className="text-xs h-8 px-2">
                            {selectedIds.size === result.chunks.length ? '取消全選' : '全選所有建議'}
                        </Button>
                    </div>

                    <Accordion type="multiple" className="space-y-3">
                        {result.chunks.map((chunk) => (
                            <AccordionItem
                                key={chunk.id}
                                value={chunk.id}
                                className={`border rounded-xl px-4 transition-all duration-200 ${selectedIds.has(chunk.id) ? 'border-primary/50 bg-primary/5 shadow-sm' : 'border-border bg-card'
                                    }`}
                            >
                                <div className="flex items-center gap-4 py-2">
                                    <Checkbox
                                        checked={selectedIds.has(chunk.id)}
                                        onCheckedChange={() => toggleSelect(chunk.id)}
                                        className="data-[state=checked]:bg-primary"
                                    />
                                    <AccordionTrigger className="flex-1 hover:no-underline py-2">
                                        <div className="flex flex-col items-start gap-1 text-left">
                                            <div className="flex items-center gap-2">
                                                {getActionIcon(chunk.mappingResult.action)}
                                                <span className="font-semibold text-sm">{chunk.mappingResult.extractedTitle}</span>
                                                <Badge variant="secondary" className="text-[10px] h-4">
                                                    {getActionLabel(chunk.mappingResult.action)}
                                                </Badge>
                                                {chunk.mappingResult.confidence > 0.8 && (
                                                    <Badge className="bg-green-500/10 text-green-600 border-none text-[10px] h-4">高信心</Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-1 opacity-70">
                                                {chunk.mappingResult.reasoning}
                                            </p>
                                        </div>
                                    </AccordionTrigger>
                                </div>

                                <AccordionContent className="pt-2 pb-4 space-y-4 border-t border-border/50">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] text-muted-foreground uppercase font-bold">原始片段自: {chunk.sourceLocation}</Label>
                                            <div className="bg-muted p-3 rounded-lg text-xs leading-relaxed italic border border-border/50">
                                                "{chunk.originalText}"
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] text-muted-foreground uppercase font-bold">AI 建議動作</Label>
                                            <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge className="bg-primary/20 text-primary border-none text-[10px]">
                                                        {chunk.mappingResult.category.toUpperCase()}
                                                    </Badge>
                                                    {chunk.mappingResult.riskLevel === 'high' && (
                                                        <Badge className="bg-red-500 text-white border-none text-[10px] flex items-center gap-1">
                                                            <AlertTriangle className="w-3 h-3" /> 高風險
                                                        </Badge>
                                                    )}
                                                </div>
                                                <h4 className="font-bold text-sm mb-1">{chunk.mappingResult.extractedTitle}</h4>
                                                <p className="text-[11px] leading-relaxed mb-3">
                                                    {chunk.mappingResult.extractedDescription}
                                                </p>

                                                {chunk.mappingResult.action === 'map_existing' && chunk.mappingResult.targetTaskId && (
                                                    <div className="flex items-center gap-2 p-2 bg-green-500/5 rounded border border-green-500/10">
                                                        <ArrowRight className="w-3 h-3 text-green-600" />
                                                        <span className="text-[10px] text-green-700 font-medium">
                                                            映射至任務: {chunk.candidateTasks.find(t => t.id === chunk.mappingResult.targetTaskId)?.title || '載入中...'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
            </ScrollArea>

            {/* Footer */}
            <div className="p-6 border-t border-border bg-card flex items-center justify-between">
                <div className="text-sm">
                    已選擇 <span className="font-bold text-primary">{selectedIds.size}</span> 個建議執行
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                        取消分析
                    </Button>
                    <Button onClick={handleConfirm} disabled={isProcessing} className="min-w-[140px] shadow-lg shadow-primary/20">
                        {isProcessing ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                執行中...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                執行所選建議
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: number }) {
    return (
        <div className="bg-white/50 border border-border/50 rounded-xl p-3 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-2 mb-1">
                {icon}
                <span className="text-[10px] text-muted-foreground font-bold uppercase">{label}</span>
            </div>
            <div className="text-xl font-bold">{value}</div>
        </div>
    );
}

function Label({ children, className = "" }: { children: React.ReactNode, className?: string }) {
    return <span className={`block font-medium ${className}`}>{children}</span>;
}
