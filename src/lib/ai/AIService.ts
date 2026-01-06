/**
 * AI Service
 * 負責 AI 意圖識別、對話管理、動作分派
 */

import type {
  IntentType,
  IntentClassificationResult,
  ChatResponse,
  AIConfig,
  ClarificationOption,
  ExtractedInfo
} from './types';
import {
  generateSystemPrompt,
  generateFewShotPrompt,
  CONFIDENCE_THRESHOLDS,
  INTENT_DISPLAY_NAMES,
  WBS_PARSER_PROMPT,
  TASK_PLANNING_PROMPT
} from './prompts';

export class AIService {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  /**
   * 分類使用者輸入的意圖
   */
  async classifyIntent(
    userInput: string,
    projectContext?: {
      projectName: string;
      currentPhase?: string;
      teamMembers?: string[];
    }
  ): Promise<IntentClassificationResult> {
    try {
      const systemPrompt = generateSystemPrompt(projectContext);
      const fewShotPrompt = generateFewShotPrompt();

      const userPrompt = `
${fewShotPrompt}

**使用者輸入：**
「${userInput}」

請分析以上輸入的意圖，並以 JSON 格式回應。
`.trim();

      // 根據 provider 呼叫對應的 API
      let result: IntentClassificationResult;

      if (this.config.provider === 'openai') {
        result = await this.callOpenAI(systemPrompt, userPrompt);
      } else if (this.config.provider === 'anthropic') {
        result = await this.callAnthropic(systemPrompt, userPrompt);
      } else {
        throw new Error(`不支援的 AI Provider: ${this.config.provider}`);
      }

      console.log('🤖 Intent Classification Result:', result);
      return result;
    } catch (error) {
      console.error('AI Service classifyIntent error:', error);
      throw error;
    }
  }

  /**
   * 直接執行 AI 查詢 (繞過意圖分類)
   */
  async performAIQuery(
    userPrompt: string,
    systemPrompt: string = '你是專業的專案經理 AI 助手。'
  ): Promise<string> {
    if (this.config.provider === 'openai') {
      // callOpenAI returns IntentClassificationResult (JSON), but we want raw text?
      // Wait, callOpenAI implements logic to parse JSON.
      // We need a raw call method.
      // Let's check callOpenAI implementation.
      // It enforces JSON.
      // We need a method that allows free text.
      return this.callOpenAI_Text(systemPrompt, userPrompt);
    } else if (this.config.provider === 'anthropic') {
      // defined similarly
      return this.callAnthropic_Text(systemPrompt, userPrompt);
    }
    throw new Error(`不支援的 Provider: ${this.config.provider}`);
  }

  // Use OpenAI Responses API for faster reasoning model responses
  private async callOpenAI_Text(systemPrompt: string, userPrompt: string): Promise<string> {
    // Check if using a reasoning model (gpt-5, o1, o3, o4 series)
    const isReasoningModel = /^(gpt-5|o1|o3|o4)/i.test(this.config.model || '');

    if (isReasoningModel) {
      // Use Responses API for reasoning models
      return this.callOpenAI_ResponsesAPI(systemPrompt, userPrompt);
    } else {
      // Use Chat Completions API for non-reasoning models
      return this.callOpenAI_ChatCompletions(systemPrompt, userPrompt);
    }
  }

  // OpenAI Responses API (for reasoning models - faster)
  private async callOpenAI_ResponsesAPI(systemPrompt: string, userPrompt: string): Promise<string> {

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        input: userPrompt,
        instructions: systemPrompt,
        reasoning: {
          effort: 'low' // Use low effort for faster responses
        },
        max_output_tokens: this.config.maxTokens || 4000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Responses API Error:', response.status, errorText);
      throw new Error(`Responses API Error: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    // Extract output text from Responses API format
    // The format may vary, try multiple extraction paths
    let outputText = '';

    // Try direct output_text field first
    if (data.output_text) {
      outputText = data.output_text;
    }
    // Try output array with message type
    else if (data.output && Array.isArray(data.output)) {
      const messageOutput = data.output.find((o: any) => o.type === 'message');
      if (messageOutput?.content) {
        if (Array.isArray(messageOutput.content)) {
          const textContent = messageOutput.content.find((c: any) => c.type === 'output_text' || c.type === 'text');
          outputText = textContent?.text || '';
        } else if (typeof messageOutput.content === 'string') {
          outputText = messageOutput.content;
        }
      }
    }
    // Fallback: try to find any text in the output
    else if (data.output?.[0]?.content?.[0]?.text) {
      outputText = data.output[0].content[0].text;
    }

    return outputText;
  }

  // Chat Completions API (for non-reasoning models)
  private async callOpenAI_ChatCompletions(systemPrompt: string, userPrompt: string): Promise<string> {

    const { projectId, publicAnonKey } = await import('../../../utils/supabase/info');
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4df51a95/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
      body: JSON.stringify({
        provider: this.config.provider,
        model: this.config.model,
        apiKey: this.config.apiKey,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        maxTokens: this.config.maxTokens || 4000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Chat Completions API Error:', response.status, errorText);
      throw new Error(`AI API Error: ${response.status} ${errorText}`);
    }

    const text = await response.text();
    console.log('🔍 Raw API Response:', text);
    const data = JSON.parse(text);
    console.log('📦 Parsed Data:', JSON.stringify(data).substring(0, 500));
    const result = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || '';
    console.log('📝 Extracted Content:', result ? result.substring(0, 200) : '(empty)');
    return result;
  }

  // Placeholder for Anthropic text
  private async callAnthropic_Text(systemPrompt: string, userPrompt: string): Promise<string> {
    // Simplified for now, assuming OpenAI usage based on logs
    return this.callOpenAI_Text(systemPrompt, userPrompt);
  }

  /**
   * 進行對話並處理意圖
   */
  async chat(
    userInput: string,
    projectContext?: {
      projectId: string;
      projectName: string;
      currentPhase?: string;
      teamMembers?: string[];
    }
  ): Promise<ChatResponse> {
    try {
      // Step 1: 意圖分類
      const intentResult = await this.classifyIntent(userInput, projectContext);

      // Step 2: 根據信心度決定行為
      if (intentResult.confidence >= CONFIDENCE_THRESHOLDS.HIGH) {
        // 高信心度：自動執行
        return this.handleHighConfidenceIntent(intentResult);
      } else if (intentResult.confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) {
        // 中信心度：建議動作但需確認
        return this.handleMediumConfidenceIntent(intentResult);
      } else {
        // 低信心度：請求澄清
        return this.handleLowConfidenceIntent(intentResult, userInput);
      }
    } catch (error) {
      console.error('AI Service chat error:', error);
      return {
        reply: '抱歉，處理你的請求時發生錯誤。請稍後再試或聯繫技術支援。',
        actions_taken: []
      };
    }
  }

  /**
   * 處理高信心度意圖（自動執行）
   */
  private handleHighConfidenceIntent(
    intentResult: IntentClassificationResult
  ): ChatResponse {
    const { intent, extracted_info } = intentResult;

    switch (intent) {
      case 'chat':
        return {
          reply: this.generateChatResponse(extracted_info),
          intent_result: intentResult,
          actions_taken: []
        };

      case 'create_task':
        return {
          reply: this.generateTaskCreationConfirmation(extracted_info),
          intent_result: intentResult,
          actions_taken: [], // 實際建立任務由上層處理
          clarification_needed: false
        };

      case 'record_decision':
        return {
          reply: this.generateDecisionRecordConfirmation(extracted_info),
          intent_result: intentResult,
          actions_taken: []
        };

      case 'mark_pending':
        return {
          reply: this.generatePendingMarkConfirmation(extracted_info),
          intent_result: intentResult,
          actions_taken: []
        };

      case 'change_request':
        return {
          reply: this.generateChangeRequestConfirmation(extracted_info),
          intent_result: intentResult,
          actions_taken: []
        };

      default:
        return {
          reply: '我理解你的意圖，但目前無法處理此類請求。',
          intent_result: intentResult,
          actions_taken: []
        };
    }
  }

  /**
   * 處理中信心度意圖（建議動作但需確認）
   */
  private handleMediumConfidenceIntent(
    intentResult: IntentClassificationResult
  ): ChatResponse {
    const options = this.generateClarificationOptions(intentResult);

    return {
      reply: `我理解你可能想要：「${intentResult.extracted_info?.title || '執行某個動作'}」\n\n請確認我的理解是否正確？`,
      intent_result: intentResult,
      actions_taken: [],
      clarification_needed: true,
      clarification_options: options
    };
  }

  /**
   * 處理低信心度意圖（請求澄清）
   */
  private handleLowConfidenceIntent(
    intentResult: IntentClassificationResult,
    userInput: string
  ): ChatResponse {
    const options: ClarificationOption[] = [
      {
        id: 'create_task',
        label: '建立任務',
        description: '新增待辦事項並設定提醒',
        intent: 'create_task'
      },
      {
        id: 'mark_pending',
        label: '標記待回覆',
        description: '追蹤等待他人回應的事項',
        intent: 'mark_pending'
      },
      {
        id: 'chat',
        label: '一般對話',
        description: '只是討論，不建立任何紀錄',
        intent: 'chat'
      }
    ];

    return {
      reply: `我不太確定你想要做什麼：「${userInput}」\n\n請選擇你的意圖：`,
      intent_result: intentResult,
      actions_taken: [],
      clarification_needed: true,
      clarification_options: options
    };
  }

  /**
   * 生成澄清選項
   */
  private generateClarificationOptions(
    intentResult: IntentClassificationResult
  ): ClarificationOption[] {
    const { intent, extracted_info } = intentResult;

    // 主要選項（AI 判斷的意圖）
    const primaryOption: ClarificationOption = {
      id: intent,
      label: INTENT_DISPLAY_NAMES[intent] || intent,
      description: this.getIntentDescription(intent, extracted_info),
      intent: intent
    };

    // 替代選項
    const alternativeOptions: ClarificationOption[] = [
      {
        id: 'chat',
        label: '一般對話',
        description: '只是討論，不建立任何紀錄',
        intent: 'chat'
      }
    ];

    return [primaryOption, ...alternativeOptions];
  }

  /**
   * 取得意圖的描述
   */
  private getIntentDescription(intent: IntentType, info?: ExtractedInfo): string {
    switch (intent) {
      case 'create_task':
        return `新增任務：${info?.title || '待確認'}`;
      case 'record_decision':
        return `記錄決議：${info?.title || '待確認'}`;
      case 'mark_pending':
        return `標記待回覆：${info?.title || '待確認'}`;
      case 'change_request':
        return `需求變更：${info?.title || '待確認'}`;
      case 'chat':
        return '一般對話，不建立紀錄';
      default:
        return '未知動作';
    }
  }

  /**
   * 生成對話回應
   */
  private generateChatResponse(info?: ExtractedInfo): string {
    // 根據輸入提供更友善的回應
    const responses = [
      '你好！我是你的專案秘書，有什麼我可以幫你的嗎？',
      '我在這裡隨時為你服務！有什麼問題嗎？',
      '嗨！需要我協助處理專案事務嗎？',
      '很高興為你服務！有任何專案相關的問題都可以問我。'
    ];

    // 隨機選擇一個友善的回應
    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * 生成任務建立確認訊息
   */
  private generateTaskCreationConfirmation(info?: ExtractedInfo): string {
    const title = info?.title || '未命名任務';
    const dueDate = info?.due_date ? `\n- 截止日期：${this.formatDueDate(info.due_date)}` : '';
    const priority = info?.priority ? `\n- 優先級：${this.formatPriority(info.priority)}` : '';
    const assignee = info?.assignee ? `\n- 責人：${info.assignee}` : '\n- 負責人：（未指定）';

    return `✅ 已為你建立任務：【${title}】${dueDate}${priority}${assignee}\n\n需要調整任何資訊嗎？`;
  }

  /**
   * 生成決議記錄確認訊息
   */
  private generateDecisionRecordConfirmation(info?: ExtractedInfo): string {
    const title = info?.title || '未命名決議';
    const category = info?.category ? `\n- 類別：${this.formatCategory(info.category)}` : '';
    const scope = info?.scope ? `\n- 範圍：${this.formatScope(info.scope)}` : '';

    return `✅ 已記錄決議：【${title}】${category}${scope}\n\n這項決議將被追蹤並可供團隊查閱。`;
  }

  /**
   * 生成待回覆標記確認訊息
   */
  private generatePendingMarkConfirmation(info?: ExtractedInfo): string {
    const title = info?.title || '未命名待回覆事項';
    const waitingOn = info?.waiting_on_name
      ? `\n- 等待對象：${info.waiting_on_name}`
      : '';
    const expected = info?.expected_response
      ? `\n- 預期回應：${info.expected_response}`
      : '';

    return `✅ 已標記為待回覆：【${title}】${waitingOn}${expected}\n\n我會追蹤此事項的進度。`;
  }

  /**
   * 生成需求變更確認訊息
   */
  private generateChangeRequestConfirmation(info?: ExtractedInfo): string {
    const title = info?.title || '未命名變更';
    const target = info?.change_target ? `\n- 變更目標：${info.change_target}` : '';
    const type = info?.change_type ? `\n- 變更類型：${this.formatChangeType(info.change_type)}` : '';

    return `✅ 已記錄需求變更：【${title}】${target}${type}\n\n這項變更將被追蹤並通知相關人員。`;
  }

  /**
   * 格式化截止日期
   */
  private formatDueDate(dueDate: string): string {
    if (dueDate === 'tomorrow') return '明天';
    if (dueDate.startsWith('next_')) {
      const day = dueDate.replace('next_', '');
      return `下週${day}`;
    }
    return dueDate;
  }

  /**
   * 格式化優先級
   */
  private formatPriority(priority: string): string {
    const map: Record<string, string> = {
      low: '低',
      medium: '中',
      high: '高'
    };
    return map[priority] || priority;
  }

  /**
   * 格式化類別
   */
  private formatCategory(category: string): string {
    const map: Record<string, string> = {
      technical: '技術決策',
      business: '商業決策',
      design: '設計決策',
      other: '其他'
    };
    return map[category] || category;
  }

  /**
   * 格式化範圍
   */
  private formatScope(scope: string): string {
    const map: Record<string, string> = {
      global: '全專案',
      module: '模組層級',
      page: '頁面層級'
    };
    return map[scope] || scope;
  }

  /**
   * 格式化變更類型
   */
  private formatChangeType(type: string): string {
    const map: Record<string, string> = {
      add: '新增',
      modify: '修改',
      remove: '移除'
    };
    return map[type] || type;
  }

  /**
   * 分析文件並生成任務清單（支援多格式：圖片、Excel、Word、PDF）
   * @param parsedContent 已解析的文件內容
   * @param projectId 專案 ID
   * @param onProgress 進度回調函數
   */
  async analyzeDocumentForTasks(
    parsedContent: { type: string; content: string },
    projectId: string,
    onProgress?: (status: string) => void,
    userInstruction?: string // 新增參數：使用者指令，用於決定 Prompt 類型
  ): Promise<{
    success: boolean;
    tasks?: any[];
    count?: number;
    project_summary?: string;
    reasoning?: string;
    error?: string;
  }> {
    try {
      const { projectId: supabaseProjectId, publicAnonKey } = await import('../../../utils/supabase/info');

      // 根據文件類型與使用者指令選擇最佳 Prompt (Prompt Routing)
      // 預設與 Fallback：使用精簡版 WBS Parser
      let selectedSystemPrompt = WBS_PARSER_PROMPT;
      let promptType = 'general-wbs';

      // 簡單的關鍵字路由策略：檢查使用者指令 + 文件前 500 字
      const contextText = (userInstruction || '') + (parsedContent.content.substring(0, 500) || '');

      // 引入 DEFAULT_PROMPT_TEMPLATES 以獲取專用 Prompt
      const { DEFAULT_PROMPT_TEMPLATES } = await import('./prompts');

      if (contextText.match(/會議|紀錄|meeting|minutes/i)) {
        // 使用會議記錄專用 Prompt
        const template = DEFAULT_PROMPT_TEMPLATES.find(t => t.id === 'meeting-notes');
        if (template) {
          selectedSystemPrompt = template.system_prompt;
          promptType = 'meeting-notes';
        }
      } else if (contextText.match(/需求|規格|spec|requirement/i)) {
        // 使用需求分析專用 Prompt
        const template = DEFAULT_PROMPT_TEMPLATES.find(t => t.id === 'requirement-analysis');
        if (template) {
          selectedSystemPrompt = template.system_prompt;
          promptType = 'requirement-analysis';
        }
      } else if (contextText.match(/email|郵件|信件/i)) {
        // 使用 Email 分析專用 Prompt
        const template = DEFAULT_PROMPT_TEMPLATES.find(t => t.id === 'email-to-tasks');
        if (template) {
          selectedSystemPrompt = template.system_prompt;
          promptType = 'email-to-tasks';
        }
      }

      console.log(`🤖 Prompt Routing: 偵測為 [${promptType}] 類型，切換至專用 Prompt`);

      // 根據文件類型選擇不同的處理方式
      if (parsedContent.type === 'image') {
        // 圖片使用 Vision API
        onProgress?.('📷 正在掃描圖片文字與方框...');

        const response = await fetch(`https://${supabaseProjectId}.supabase.co/functions/v1/make-server-4df51a95/ai/vision`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            provider: this.config.provider,
            model: this.config.model,
            apiKey: this.config.apiKey,
            systemPrompt: WBS_PARSER_PROMPT,
            userText: '請幫我解析這張 WBS 圖檔並建立任務清單草稿。',
            imageBase64: parsedContent.content,
            maxTokens: this.config.maxTokens || 16000 // 🔥 提升到 16000，避免 token 不足
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorData.message || JSON.stringify(errorData);
          } catch {
            if (errorText) errorMessage = errorText;
          }
          throw new Error(`WBS 圖片解析失敗: ${errorMessage}`);
        }

        onProgress?.('🌳 正在構建任務樹狀結構...');

        const responseText = await response.text();
        if (!responseText || responseText.trim() === '') {
          throw new Error('AI 回傳空的回應');
        }

        const data = JSON.parse(responseText);
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
          throw new Error(`AI 回應格式錯誤: ${JSON.stringify(data)}`);
        }

        const wbsResult = JSON.parse(data.choices[0].message.content);

        onProgress?.('✅ 解析完成！');

        return {
          success: true,
          tasks: wbsResult.tasks || [],
          count: (wbsResult.tasks || []).length,
          project_summary: wbsResult.project_title,
          reasoning: wbsResult.reasoning
        };
      } else {
        // Excel、Word、PDF 使用文字分析 API
        onProgress?.('🌳 正在分析文件結構...');

        // 恢復使用使用者設定的模型（例如 gpt-5-nano），但保留上方的截斷保護
        // 若使用者選用較慢的模型導致 Timeout，錯誤處理會提示
        const targetModel = this.config.model;
        console.log(`📄 文件解析使用模型: ${targetModel}`);

        const response = await fetch(`https://${supabaseProjectId}.supabase.co/functions/v1/make-server-4df51a95/ai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            provider: this.config.provider,
            model: targetModel,
            apiKey: this.config.apiKey,
            messages: [
              { role: 'system', content: selectedSystemPrompt },
              { role: 'user', content: `${userInstruction || '請幫我解析以下文件內容並建立任務清單草稿：'}\n\n${parsedContent.content.substring(0, 15000)}` }
            ],
            temperature: this.config.temperature || 0.3,
            maxTokens: 12000 // 🔥 適度調回 12000 以避免 Token 不足，配合快速模型應不會 Timeout
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

          if (response.status === 546) {
            errorMessage = "文件過大或運算資源不足 (Compute Resources Exceeded)。請嘗試減少文件內容或分批處理。";
          } else {
            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.error || errorData.message || JSON.stringify(errorData);
            } catch {
              if (errorText) errorMessage = errorText;
            }
          }
          throw new Error(`文件解析失敗: ${errorMessage}`);
        }

        onProgress?.('📅 正在計算預估工期...');

        const responseText = await response.text();
        if (!responseText || responseText.trim() === '') {
          throw new Error('AI 回傳空的回應');
        }

        const data = JSON.parse(responseText);

        // 處理不同 provider 的回應格式 (支援 Server 端的標準化回應與原始回應)
        let content: string | undefined;

        // 1. 嘗試讀取 OpenAI 格式 (Server 端會將 Anthropic 回應轉為此格式)
        if (data.choices && data.choices[0] && data.choices[0].message) {
          content = data.choices[0].message.content;

          // 救援：如果 content 為空，檢查 reasoning_content (針對 DeepSeek 或特殊模型)
          if (!content && data.choices[0].message.reasoning_content) {
            console.warn('⚠️ Content 為空，但發現 reasoning_content，嘗試讀取');
            // 注意：reasoning_content 通常不是 JSON，但如果是唯一的輸出，也只能試試
            // content = data.choices[0].message.reasoning_content;
          }
        }
        // 2. 嘗試讀取 Anthropic 原始格式 (Fallback)
        else if (data.content && Array.isArray(data.content)) {
          const textBlock = data.content.find((b: any) => b.type === 'text');
          content = textBlock ? textBlock.text : (data.content[0]?.text || '');
        }

        if (content === undefined) {
          throw new Error(`無法識別的 AI 回應格式: ${JSON.stringify(data).substring(0, 200)}...`);
        }

        // 檢查 Content 是否為空
        if (!content || content.trim() === '') {
          // 檢查是否因為 Token 不足
          const finishReason = data.choices?.[0]?.finish_reason || data.stop_reason;
          if (finishReason === 'length' || finishReason === 'max_tokens') {
            throw new Error('AI 生成中斷 (Token 不足)。請嘗試減少文件內容或增加 Max Tokens。');
          }

          throw new Error('AI 回傳空的內容 (Content is empty)');
        }

        // 清理 Markdown 語法
        content = content.trim();
        if (content.startsWith('```json')) {
          content = content.replace(/^```json\s*/, '').replace(/```\s*$/, '');
        } else if (content.startsWith('```')) {
          content = content.replace(/^```\s*/, '').replace(/```\s*$/, '');
        }

        const wbsResult = JSON.parse(content);

        onProgress?.('✅ 解析完成！');

        // 🔥 修復：支援 items 和 tasks 兩種欄位名稱（與文字解析保持一致）
        return {
          success: true,
          tasks: wbsResult.items || wbsResult.tasks || [],
          count: (wbsResult.items || wbsResult.tasks || []).length,
          project_summary: wbsResult.project_summary || wbsResult.project_title,
          reasoning: wbsResult.reasoning
        };
      }
    } catch (error) {
      console.error('文件解析錯誤:', error);

      let finalErrorMessage = error instanceof Error ? error.message : '未知錯誤';

      // 處理 Fetch 失敗 (通常是 CORS 或 504 Timeout 被瀏覽器攔截顯示為 TypeError)
      if (finalErrorMessage.includes('Failed to fetch')) {
        finalErrorMessage = '連線逾時 (Gateway Timeout)。由於 AI 運算時間過長，伺服器已中斷連線。請嘗試減少文件內容。';
      }

      return {
        success: false,
        error: finalErrorMessage
      };
    }
  }

  /**
   * 分析 WBS 圖片並生成任務清單（舊版，建議使用 analyzeDocumentForTasks）
   * @deprecated 使用 analyzeDocumentForTasks 替代
   */
  async analyzeWBSImage(
    imageBase64: string,
    projectId: string,
    onProgress?: (status: string) => void
  ): Promise<{
    success: boolean;
    tasks?: any[];
    count?: number;
    project_title?: string;
    confidence?: number;
    reasoning?: string;
    error?: string;
  }> {
    try {
      // 步驟 1：掃描圖片
      onProgress?.('📷 正在掃描圖片文字與方框...');

      // 透過 Edge Function 代理呼叫，使用多模態格式
      const { projectId: supabaseProjectId, publicAnonKey } = await import('../../../utils/supabase/info');

      const response = await fetch(`https://${supabaseProjectId}.supabase.co/functions/v1/make-server-4df51a95/ai/vision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          provider: this.config.provider,
          model: this.config.model, // 使用系統設定的模型版本
          apiKey: this.config.apiKey,
          systemPrompt: WBS_PARSER_PROMPT,
          userText: '請幫我解析這張 WBS 圖檔並建立任務清單草稿。',
          imageBase64: imageBase64,
          maxTokens: this.config.maxTokens || 2000
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || JSON.stringify(errorData);
        } catch {
          if (errorText) errorMessage = errorText;
        }
        throw new Error(`WBS 圖片解析失敗: ${errorMessage}`);
      }

      // 步驟 2：構建任務樹狀結構
      onProgress?.('🌳 正在構建任務樹狀結構...');

      const responseText = await response.text();
      if (!responseText || responseText.trim() === '') {
        throw new Error('AI 回傳空的回應');
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse WBS analysis response:', responseText);
        throw new Error(`無法解析 AI 回應: ${parseError instanceof Error ? parseError.message : '未知錯誤'}`);
      }

      // 檢查回應結構（OpenAI 格式）
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error(`AI 回應格式錯誤: ${JSON.stringify(data)}`);
      }

      const content = data.choices[0].message.content;

      if (!content || content.trim() === '') {
        throw new Error('AI 回傳空的內容');
      }

      // 解析 WBS 結果 JSON
      let wbsResult;
      try {
        wbsResult = JSON.parse(content);
      } catch (parseError) {
        console.error('Failed to parse WBS result:', content);
        throw new Error(`無法解析 WBS 結果: ${parseError instanceof Error ? parseError.message : '未知錯誤'}`);
      }

      // 步驟 3：返回結果（由上層處理存入收件匣）
      onProgress?.('✅ 解析完成！');

      return {
        success: true,
        tasks: wbsResult.tasks || [],
        count: (wbsResult.tasks || []).length,
        project_title: wbsResult.project_title,
        confidence: wbsResult.confidence,
        reasoning: wbsResult.reasoning
      };
    } catch (error) {
      console.error('WBS 圖片解析錯誤:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知錯誤'
      };
    }
  }

  /**
   * 呼叫 OpenAI API
   */
  private async callOpenAI(
    systemPrompt: string,
    userPrompt: string
  ): Promise<IntentClassificationResult> {
    // 透過 Edge Function 代理呼叫，避免 CORS 問題
    const { projectId, publicAnonKey } = await import('../../../utils/supabase/info');

    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4df51a95/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`
      },
      body: JSON.stringify({
        provider: this.config.provider,
        model: this.config.model,
        apiKey: this.config.apiKey,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: this.config.temperature || 0.3,
        maxTokens: this.config.maxTokens || 16000 // 🔥 提升到 16000，避免 token 不足
      })
    });

    if (!response.ok) {
      // 嘗試解析錯誤訊息
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || JSON.stringify(errorData);
      } catch {
        // 如果無法解析 JSON，使用原始錯誤訊息
        const errorText = await response.text();
        if (errorText) {
          errorMessage = errorText;
        }
      }
      throw new Error(`OpenAI API Error: ${errorMessage}`);
    }

    // 檢查回應是否為空
    const responseText = await response.text();
    if (!responseText || responseText.trim() === '') {
      throw new Error('OpenAI API 回傳空的回應');
    }

    // 解析 JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', responseText);
      throw new Error(`無法解析 OpenAI API 回應: ${parseError instanceof Error ? parseError.message : '未知錯誤'}`);
    }

    // 檢查回應結構
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error(`OpenAI API 回應格式錯誤: ${JSON.stringify(data)}`);
    }

    const message = data.choices[0].message;
    let content = message.content;

    // 1. 檢查是否有拒絕訊息 (Refusal)
    if (message.refusal) {
      throw new Error(`OpenAI API 拒絕執行: ${message.refusal}`);
    }

    // 2. 深度救援：嘗試從非標準欄位提取內容
    if (!content) {
      console.warn('⚠️ OpenAI content 為空，嘗試深度掃描非標準欄位');

      // 救援 A: 某些 Proxy 或模型可能放在 text 屬性
      if (message.text) {
        content = message.text;
      }
      // 救援 B: 某些 Reasoning 模型可能放在 reasoning_content (雖然這通常是過程，但若沒 content 可暫用)
      else if (message.reasoning_content && !content) {
        console.warn('⚠️ 僅有 reasoning_content，將其視為回應內容');
        // 這裡通常不建議，因為格式可能不是 JSON，但總比空好
        // content = message.reasoning_content; 
        // 暫不啟用 B，因為 reasoning 通常不是 JSON 格式
      }
    }

    // 3. 檢查 Finish Reason
    const finishReason = data.choices[0].finish_reason;
    if (!content && finishReason === 'length') {
      throw new Error('OpenAI API Token 不足 (Length Limit)，請增加 Max Tokens 設定');
    }

    if (!content && finishReason === 'content_filter') {
      throw new Error('OpenAI API 內容被過濾 (Content Filter)');
    }

    // 4. 最終檢查 content 是否為空
    if (!content || content.trim() === '') {
      console.error('❌ OpenAI API 異常回應結構:', JSON.stringify(data, null, 2));
      throw new Error(`OpenAI API 回傳空的 message content (Finish Reason: ${finishReason})`);
    }

    // 解析 content JSON
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI content:', content);
      throw new Error(`無法解析 OpenAI 回應內容: ${parseError instanceof Error ? parseError.message : '未知錯誤'}`);
    }

    return {
      intent: parsed.intent,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning || '',
      extracted_info: parsed.extracted_info,
      suggested_action: parsed.suggested_action
    };
  }

  /**
   * 呼叫 Anthropic API
   */
  private async callAnthropic(
    systemPrompt: string,
    userPrompt: string
  ): Promise<IntentClassificationResult> {
    // 透過 Edge Function 代理呼叫，避免 CORS 問題
    const { projectId, publicAnonKey } = await import('../../../utils/supabase/info');

    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4df51a95/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`
      },
      body: JSON.stringify({
        provider: this.config.provider,
        model: this.config.model,
        apiKey: this.config.apiKey,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: this.config.temperature || 0.3,
        maxTokens: this.config.maxTokens || 1000
      })
    });

    if (!response.ok) {
      // 嘗試解析錯誤訊息
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || JSON.stringify(errorData);
      } catch {
        // 如果無法解析 JSON，使用原始錯誤訊息
        const errorText = await response.text();
        if (errorText) {
          errorMessage = errorText;
        }
      }
      throw new Error(`Anthropic API Error: ${errorMessage}`);
    }

    // 檢查回應是否為空
    const responseText = await response.text();
    if (!responseText || responseText.trim() === '') {
      throw new Error('Anthropic API 回傳空的回應');
    }

    // 解析 JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Anthropic response:', responseText);
      throw new Error(`無法解析 Anthropic API 回應: ${parseError instanceof Error ? parseError.message : '未知錯誤'}`);
    }

    // 檢查回應結構
    if (!data.content || !data.content[0] || !data.content[0].text) {
      throw new Error(`Anthropic API 回應格式錯誤: ${JSON.stringify(data)}`);
    }

    const content = data.content[0].text;

    // 檢查 content 是否為空
    if (!content || content.trim() === '') {
      throw new Error('Anthropic API 回傳空的 text content');
    }

    // Anthropic 需要手動解析 JSON（可能包含 <thinking> 標籤）
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Failed to extract JSON from Anthropic content:', content);
      throw new Error('無法從 Anthropic 回應中解析 JSON');
    }

    // 解析 content JSON
    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse Anthropic JSON:', jsonMatch[0]);
      throw new Error(`無法解析 Anthropic JSON 內容: ${parseError instanceof Error ? parseError.message : '未知錯誤'}`);
    }

    return {
      intent: parsed.intent,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning || '',
      extracted_info: parsed.extracted_info,
      suggested_action: parsed.suggested_action
    };
  }

  /**
   * 多任務規劃 - 根據使用者需求生成任務建議列表
   * @param userInput 使用者輸入（例如：「我 12/30 要交國美館的 SOW，幫我規劃這幾天要做什麼」）
   * @param projectContext 專案上下文
   * @returns 任務建議列表與 AI 的規劃建議訊息
   */
  async planTasks(
    userInput: string,
    projectContext?: {
      projectName: string;
      currentPhase?: string;
      teamMembers?: string[];
    }
  ): Promise<{
    success: boolean;
    understanding?: string;
    suggestion_message?: string;
    tasks?: Array<{
      title: string;
      description: string;
      type: 'action' | 'decision' | 'pending' | 'cr';
      priority: 'low' | 'medium' | 'high';
      due_date?: string;
      estimated_hours?: number;
      dependencies?: string;
    }>;
    reasoning?: string;
    error?: string;
  }> {
    try {
      const { projectId, publicAnonKey } = await import('../../../utils/supabase/info');

      // 加入專案上下文到 prompt
      const today = new Date();
      const dateStr = `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()} (週${['日', '一', '二', '三', '四', '五', '六'][today.getDay()]})`;

      const contextualPrompt = `
${TASK_PLANNING_PROMPT}

**目前日期：** ${dateStr}
${projectContext ? `**專案名稱：** ${projectContext.projectName}` : ''}
${projectContext?.currentPhase ? `**目前階段：** ${projectContext.currentPhase}` : ''}
${projectContext?.teamMembers && projectContext.teamMembers.length > 0
          ? `**團隊成員：** ${projectContext.teamMembers.join('、')}`
          : ''}

**使用者需求：**
${userInput}
`.trim();

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4df51a95/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          provider: this.config.provider,
          model: this.config.model,
          apiKey: this.config.apiKey,
          messages: [
            { role: 'system', content: '你是一位專業的專案管理秘書，擅長任務規劃與時間管理。' },
            { role: 'user', content: contextualPrompt }
          ],
          temperature: this.config.temperature || 0.5,
          maxTokens: this.config.maxTokens || 2000
        })
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || JSON.stringify(errorData);
        } catch {
          const errorText = await response.text();
          if (errorText) errorMessage = errorText;
        }
        throw new Error(`任規劃 API 錯誤: ${errorMessage}`);
      }

      const responseText = await response.text();
      if (!responseText || responseText.trim() === '') {
        throw new Error('AI 回傳空的回應');
      }

      console.log('📋 任務規劃 - 原始回應長度:', responseText.length);

      const data = JSON.parse(responseText);

      console.log('📋 任務規劃 - 解析後的資料結構:', {
        hasChoices: !!data.choices,
        hasContent: !!(data.content),
        keys: Object.keys(data)
      });

      // 處理不同 provider 的回應格式
      let content: string | undefined;

      // 1. 嘗試讀取 OpenAI 格式 (Server 端會將 Anthropic 回應轉為此格式)
      if (data.choices && data.choices[0] && data.choices[0].message) {
        content = data.choices[0].message.content;

        // 檢查是否有拒絕訊息
        if (data.choices[0].message.refusal) {
          throw new Error(`AI 拒絕執行: ${data.choices[0].message.refusal}`);
        }

        // 救援：如果 content 為空，檢查 reasoning_content
        if (!content && data.choices[0].message.reasoning_content) {
          console.warn('⚠️ Content 為空，但發現 reasoning_content');
        }
      }
      // 2. 嘗試讀取 Anthropic 原始格式 (Fallback)
      else if (data.content && Array.isArray(data.content)) {
        const textBlock = data.content.find((b: any) => b.type === 'text');
        content = textBlock ? textBlock.text : (data.content[0]?.text || '');
      }

      // 3. 檢查 Content 是否為空
      if (!content || content.trim() === '') {
        // 檢查是否因為 Token 不足
        const finishReason = data.choices?.[0]?.finish_reason || data.stop_reason;
        if (finishReason === 'length' || finishReason === 'max_tokens') {
          throw new Error('AI 生成中斷 (Token 不足)。請嘗試簡化需求或增加 Max Tokens。');
        }

        if (finishReason === 'content_filter') {
          throw new Error('AI 內容被過濾 (Content Filter)');
        }

        console.error('❌ AI 回應異常結構:', JSON.stringify(data, null, 2));
        throw new Error(`AI 回傳空的內容 (Finish Reason: ${finishReason || 'unknown'})`);
      }

      // 清理 Markdown 語法
      content = content.trim();
      if (content.startsWith('```json')) {
        content = content.replace(/^```json\s*/, '').replace(/```\s*$/, '');
      } else if (content.startsWith('```')) {
        content = content.replace(/^```\s*/, '').replace(/```\s*$/, '');
      }

      const planResult = JSON.parse(content);

      return {
        success: true,
        understanding: planResult.understanding,
        suggestion_message: planResult.suggestion_message,
        tasks: planResult.tasks || [],
        reasoning: planResult.reasoning
      };
    } catch (error) {
      console.error('任務規劃錯誤:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知錯誤'
      };
    }
  }
}

/**
 * 建立 AI Service 實例
 */
export function createAIService(config: AIConfig): AIService {
  return new AIService(config);
}