import { Item, ItemType, CRRiskLevel } from './types';

/**
 * 支援的文件類型
 */
export type DocumentType =
    | 'meeting_notes'      // 會議紀錄
    | 'requirements'       // 需求規格
    | 'contract'           // 合約文件
    | 'technical'          // 技術文件
    | 'communication'      // Email/訊息
    | 'design'             // 設計文件
    | 'general';           // 一般文件

/**
 * 分析階段
 */
export type AnalysisStep =
    | 'detecting_type'     // 偵測類型
    | 'chunking'           // 語義切片
    | 'matching_tasks'      // 向量搜尋
    | 'mapping'            // LLM 精確映射
    | 'summarizing'        // 總結報告
    | 'completed';         // 已完成

/**
 * 映射動作
 */
export type MappingAction = 'map_existing' | 'create_new' | 'append_spec' | 'ignore';

/**
 * 單個分析切片
 */
export interface AnalysisChunk {
    id: string;
    originalText: string;
    sourceLocation: string;  // 例如："第 3 頁" 或 "段落 2.2"

    // 向量搜尋到的候選任務
    candidateTasks: Array<Item & { similarity: number }>;

    // LLM 判斷的映射結果
    mappingResult: {
        action: MappingAction;
        targetTaskId: string | null;
        extractedTitle: string;
        extractedDescription: string;
        category: ItemType;
        confidence: number;
        reasoning: string;
        riskLevel?: CRRiskLevel;
    };
}

/**
 * 文件分析最終結果
 */
export interface DocumentAnalysisResult {
    documentType: DocumentType;
    summary: {
        totalItems: number;
        newItems: number;
        mappedItems: number;
        appendedSpecs: number;
        criticalRisks: number;
    };
    chunks: AnalysisChunk[];
    processedAt: string;
}
