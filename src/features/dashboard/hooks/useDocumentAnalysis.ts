import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { StorageFactory } from '@/lib/storage/StorageFactory';
import {
    DocumentType,
    DocumentAnalysisResult,
    AnalysisStep
} from '@/lib/storage/DocumentAnalysisTypes';

export { type AnalysisChunk } from '@/lib/storage/DocumentAnalysisTypes';

export function useDocumentAnalysis() {
    const [analyzing, setAnalyzing] = useState(false);
    const [currentStep, setCurrentStep] = useState<AnalysisStep | null>(null);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<DocumentAnalysisResult | null>(null);

    const analyzeDocument = useCallback(async (
        content: string,
        projectId: string,
        existingArtifactId?: string,
        overrideDocType?: DocumentType
    ) => {
        if (!content) {
            toast.error('文件內容為空，無法分析');
            return null;
        }

        setAnalyzing(true);
        setProgress(0);
        const storage = StorageFactory.getAdapter();

        try {
            // Step 1: 初期準備
            setCurrentStep('detecting_type');
            setProgress(10);

            const supabaseUrl = localStorage.getItem('supabase_url');
            const publicAnonKey = localStorage.getItem('supabase_anon_key');

            if (!supabaseUrl || !publicAnonKey) {
                throw new Error('缺少 Supabase 連線資訊');
            }

            const functionName = 'rag-platform';
            const baseUrl = supabaseUrl.replace(/\/$/, '');
            const functionUrl = `${baseUrl}/functions/v1/${functionName}`;

            console.log('🧪 [useDocumentAnalysis] Starting analysis for project:', projectId);

            // Step 2: 呼叫 Edge Function 執行智慧分析 (包含切片、向量搜尋與 LLM 映射)
            // 注意：我們將原本在前端做的 chunking/loop 全部移到後端，因為後端執行更穩定且快
            setCurrentStep('mapping');
            setProgress(30);

            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${publicAnonKey}`
                },
                body: JSON.stringify({
                    action: 'analyze-document',
                    content,
                    project_id: projectId,
                    artifact_id: existingArtifactId,
                    document_type: overrideDocType
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `分析失敗 (HTTP ${response.status})`);
            }

            const analysisData = await response.json();
            setProgress(90);

            // Step 3: 格式化結果
            setCurrentStep('summarizing');

            const analysisResult: DocumentAnalysisResult = {
                documentType: analysisData.document_type || 'general',
                summary: analysisData.summary || {
                    totalItems: analysisData.chunks?.length || 0,
                    newItems: analysisData.chunks?.filter((c: any) => c.mappingResult?.action === 'create_new').length || 0,
                    mappedItems: analysisData.chunks?.filter((c: any) => c.mappingResult?.action === 'map_existing').length || 0,
                    appendedSpecs: analysisData.chunks?.filter((c: any) => c.mappingResult?.action === 'append_spec').length || 0,
                    criticalRisks: analysisData.chunks?.filter((c: any) => c.mappingResult?.riskLevel === 'high').length || 0
                },
                chunks: analysisData.chunks || [],
                processedAt: new Date().toISOString()
            };

            setResult(analysisResult);
            setProgress(100);
            setCurrentStep('completed');

            toast.success('文件分析完成');
            return analysisResult;

        } catch (err) {
            console.error('❌ [useDocumentAnalysis] Analysis failed:', err);
            toast.error(`分析失敗: ${err instanceof Error ? err.message : '未知錯誤'}`);
            return null;
        } finally {
            setAnalyzing(false);
            setCurrentStep(null);
        }
    }, []);

    const reset = useCallback(() => {
        setResult(null);
        setProgress(0);
        setCurrentStep(null);
    }, []);

    return {
        analyzing,
        currentStep,
        progress,
        result,
        analyzeDocument,
        reset
    };
}

