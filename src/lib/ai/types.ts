/**
 * AI Service Types
 * 定義 AI 感圖識別、對話管理相關的型別
 */

// 意圖類型
export type IntentType = 
  | 'chat'              // 一般對話
  | 'create_task'       // 建立任務
  | 'plan_tasks'        // 規劃多個任務
  | 'record_decision'   // 記錄決議
  | 'mark_pending'      // 標記待回覆
  | 'change_request'    // 需求變更
  | 'ambiguous';        // 意圖不明確

// 意圖分類結果
export interface IntentClassificationResult {
  intent: IntentType;
  confidence: number; // 0.0 ~ 1.0
  reasoning: string; // AI 的判斷理由
  extracted_info?: ExtractedInfo;
  suggested_action?: string;
}

// 從使用者輸入中提取的資訊
export interface ExtractedInfo {
  // 任務相關
  title?: string;
  description?: string;
  due_date?: string; // ISO 8601 或相對時間（如 "tomorrow"）
  assignee?: string; // 成員名稱或 email
  priority?: 'low' | 'medium' | 'high';
  
  // 決議相關
  category?: 'technical' | 'business' | 'design' | 'other';
  scope?: 'global' | 'module' | 'page';
  
  // 待回覆相關
  waiting_on_type?: 'client' | 'team_member' | 'external_vendor' | 'other';
  waiting_on_name?: string;
  expected_response?: string;
  
  // 需求變更相關
  change_target?: string; // 要變更的目標（模組、頁面、功能）
  change_type?: 'add' | 'modify' | 'remove';
  change_reason?: string;
  
  // 通用
  tags?: string[];
  artifact_reference?: string; // 引用的 Artifact ID
}

// 對話訊息
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  intent?: IntentType;
  actions?: Action[];
  created_at: string;
}

// AI 執行的動作
export interface Action {
  type: 'create_task' | 'record_decision' | 'mark_pending' | 'change_request';
  entity_id: string; // 建立的 Item ID
  entity_type: 'item' | 'artifact';
  metadata: Record<string, any>;
}

// AI 對話回應
export interface ChatResponse {
  reply: string; // AI 的文字回應
  intent_result?: IntentClassificationResult; // 意圖分析結果
  actions_taken?: Action[]; // 已執行的動作
  clarification_needed?: boolean; // 是否需要使用者確認
  clarification_options?: ClarificationOption[]; // 確認選項
}

// 確認選項
export interface ClarificationOption {
  id: string;
  label: string;
  description: string;
  intent: IntentType;
}

// AI Provider 設定
export interface AIConfig {
  provider: 'openai' | 'anthropic' | 'google';
  model: string;
  apiKey: string;
  apiEndpoint?: string;
  temperature?: number;
  maxTokens?: number;
}

// System Prompt 範本
export interface SystemPromptTemplate {
  role: string;
  capabilities: string[];
  principles: string[];
  examples: IntentExample[];
}

// Few-shot 範例
export interface IntentExample {
  input: string;
  intent: IntentType;
  confidence: number;
  extracted_info?: ExtractedInfo;
}