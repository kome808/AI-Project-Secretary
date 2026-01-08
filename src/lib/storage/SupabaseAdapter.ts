import { SupabaseClient } from '@supabase/supabase-js';
import type { StorageAdapter, StorageResponse } from './types';
import type {
  Item,
  Project,
  Artifact,
  SystemAIConfig,
  SystemPromptConfig,
  ProjectConfig,
  Member,
  ItemStatus,
  ItemType,
  ProjectStatus,
  Module,
  Page,
  Milestone,
  WorkPackage,
  WorkActivity,
  AIProvider,
  GlobalConfig,
  ConnectionStatus
} from './types';
import { WBS_PARSER_PROMPT, generateSystemPrompt, generateFewShotPrompt, DEFAULT_PROMPT_TEMPLATES } from '../ai/prompts';
import { getSupabaseClient } from '../supabase/client'; // 使用 Singleton client

// 從 localStorage 讀取 Schema 名稱
// 遵循 Guidelines.md 禁止 6：禁止寫死 Schema 名稱
function getSchemaName(): string {
  const schema = localStorage.getItem('supabase_schema');
  if (!schema || schema.trim() === '') {
    console.warn('⚠️ Schema 名稱未設定，將使用 "public"（PostgreSQL 標準 Schema）。');
    console.warn('   如果您的資料表在其他 Schema 中，請在 Supabase 設定頁面指定正確的 Schema。');
    return 'public';
  }
  const normalizedSchema = schema.toLowerCase().trim();
  console.log(`📊 使用 Schema: ${normalizedSchema}`);
  return normalizedSchema;
}

export class SupabaseAdapter implements StorageAdapter {
  private supabase: SupabaseClient;

  constructor() {
    // 使用 Singleton 實例，避免創建多個 GoTrueClient
    this.supabase = getSupabaseClient();
  }

  // System AI Config Methods
  async getSystemAIConfig(): Promise<StorageResponse<SystemAIConfig | null>> {
    try {
      // AI 設定是全系統層級，使用固定的 'aiproject' schema
      // 不使用動態 schema，確保與 /docs/sql/ai_settings_schema.sql 一致
      const { data, error } = await this.supabase
        .schema('aiproject')
        .from('system_ai_config')
        .select('*')
        .eq('is_active', true)
        .maybeSingle(); // 用 maybeSingle() 避免查詢為空時的錯誤

      if (error) {
        console.error('Supabase getSystemAIConfig error:', error);
        return { data: null, error: new Error(error.message) };
      }

      return { data, error: null };
    } catch (err) {
      console.error('getSystemAIConfig exception:', err);
      return { data: null, error: err as Error };
    }
  }

  async updateSystemAIConfig(
    config: Omit<SystemAIConfig, 'id' | 'created_at' | 'updated_at'>
  ): Promise<StorageResponse<SystemAIConfig>> {
    try {
      // AI 設定是全系統層級，使用固定的 'aiproject' schema

      // 先將所有現有設定設為非啟用（確保只有一筆 is_active = true）
      await this.supabase
        .schema('aiproject')
        .from('system_ai_config')
        .update({ is_active: false })
        .eq('is_active', true);

      // 檢查是否已有設定（查最新一筆）
      const { data: existing } = await this.supabase
        .schema('aiproject')
        .from('system_ai_config')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let result;

      if (existing) {
        // 更新現有設定
        result = await this.supabase
          .schema('aiproject')
          .from('system_ai_config')
          .update({
            provider: config.provider,
            model: config.model,
            api_key: config.api_key,
            api_endpoint: config.api_endpoint,
            is_active: config.is_active,
            test_status: config.test_status,
            last_tested_at: config.last_tested_at,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();
      } else {
        // 新增設定
        result = await this.supabase
          .schema('aiproject')
          .from('system_ai_config')
          .insert({
            provider: config.provider,
            model: config.model,
            api_key: config.api_key,
            api_endpoint: config.api_endpoint,
            is_active: config.is_active,
            test_status: config.test_status,
            last_tested_at: config.last_tested_at,
          })
          .select()
          .single();
      }

      if (result.error) {
        console.error('Supabase updateSystemAIConfig error:', result.error);
        return { data: null as any, error: new Error(result.error.message) };
      }

      return { data: result.data, error: null };
    } catch (err) {
      console.error('updateSystemAIConfig exception:', err);
      return { data: null as any, error: err as Error };
    }
  }

  async testAIConnection(
    provider: AIProvider,
    model: string,
    apiKey: string,
    apiEndpoint?: string
  ): Promise<StorageResponse<{ success: boolean; message: string }>> {
    try {
      console.log(`🧪 測試 ${provider} API 連線...`);

      // 簡單的格式驗證
      if (provider === 'openai' && !apiKey.startsWith('sk-')) {
        return {
          data: {
            success: false,
            message: 'OpenAI API Key 格式錯誤，應以 sk- 或 sk-proj- 開頭',
          },
          error: null,
        };
      }

      if (provider === 'anthropic' && !apiKey.startsWith('sk-ant-')) {
        return {
          data: {
            success: false,
            message: 'Anthropic API Key 格式錯誤，應以 sk-ant- 開頭',
          },
          error: null,
        };
      }

      // 透過 Edge Function 實際測試 AI API 連線
      // 從 localStorage 讀取 Supabase 連線資訊
      const supabaseUrl = localStorage.getItem('supabase_url');
      const publicAnonKey = localStorage.getItem('supabase_anon_key');

      if (!supabaseUrl || !publicAnonKey) {
        return {
          data: {
            success: false,
            message: 'Supabase 連線資訊不完整',
          },
          error: null,
        };
      }

      // 實際呼叫測試端點
      const isLocal = supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1');
      const functionName = 'server';
      const routePath = '/ai/chat';

      // 確保 supabaseUrl 沒有結尾斜線
      const baseUrl = supabaseUrl.replace(/\/$/, '');
      const functionUrl = isLocal
        ? `${baseUrl}/functions/v1/make-server-4df51a95${routePath}` // 本地因 mock 仍保留前綴
        : `${baseUrl}/functions/v1/${functionName}${routePath}`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          provider,
          model,
          apiKey,
          messages: [
            { role: 'user', content: '測試連線：請以 json 格式回答 {"status": "ok"}' }
          ],
          temperature: 0.1,
          maxTokens: 20
        })
      });

      if (response.ok) {
        return {
          data: {
            success: true,
            message: `✅ ${provider} API 連線成功！`
          },
          error: null
        };
      } else {
        const errorData = await response.json().catch(() => ({ error: '未知錯誤' }));
        return {
          data: {
            success: false,
            message: `❌ 連線失敗：${errorData.error || response.statusText}`
          },
          error: null
        };
      }
    } catch (err) {
      console.error('testAIConnection exception:', err);
      return {
        data: {
          success: false,
          message: `❌ 連線失敗：${err instanceof Error ? err.message : '未知錯誤'}`
        },
        error: err as Error
      };
    }
  }

  // RAG / Knowledge Base Methods
  async embedContent(
    content: string,
    sourceId: string,
    sourceType: 'item' | 'artifact',
    projectId: string,
    metadata?: any
  ): Promise<StorageResponse<{ success: boolean }>> {
    try {
      console.log('🧠 [embedContent] Starting embedding process...', { sourceId, sourceType });

      const supabaseUrl = localStorage.getItem('supabase_url');
      const publicAnonKey = localStorage.getItem('supabase_anon_key');

      if (!supabaseUrl || !publicAnonKey) {
        return { data: null, error: new Error('Missing Supabase credentials') };
      }

      const isLocal = supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1');
      const functionName = 'rag-platform';
      const routePath = '/embed';
      const baseUrl = supabaseUrl.replace(/\/$/, '');

      const functionUrl = `${baseUrl}/functions/v1/${functionName}${routePath}`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          content,
          source_id: sourceId,
          source_type: sourceType,
          project_id: projectId,
          metadata
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ [embedContent] Embedding failed:', errorData);
        // Don't throw error to UI, just log it. RAG failure shouldn't block main flow.
        return { data: { success: false }, error: new Error(errorData.error || response.statusText) };
      }

      console.log('✅ [embedContent] Embedding successful!');
      return { data: { success: true }, error: null };
    } catch (err) {
      console.error('❌ [embedContent] Exception:', err);
      return { data: null, error: err as Error };
    }
  }

  async queryKnowledgeBase(
    query: string,
    projectId: string,
    threshold = 0.5,
    matchCount = 5
  ): Promise<StorageResponse<{ documents: any[] }>> {
    try {
      const supabaseUrl = localStorage.getItem('supabase_url');
      const publicAnonKey = localStorage.getItem('supabase_anon_key');

      if (!supabaseUrl || !publicAnonKey) {
        throw new Error('Missing Supabase credentials');
      }

      const functionName = 'rag-platform';
      const routePath = '/query';
      const baseUrl = supabaseUrl.replace(/\/$/, '');
      const functionUrl = `${baseUrl}/functions/v1/${functionName}${routePath}`;

      // 1. Try Remote RAG
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          query,
          project_id: projectId,
          threshold,
          match_count: matchCount
        })
      });

      if (!response.ok) {
        throw new Error(`RAG Function failed: ${response.statusText}`);
      }

      const data = await response.json();
      let documents = data.documents || [];

      // 🔍 Client-side Validation: Filter out 'Ghost Files' (deleted artifacts)
      // Since vector store might contain orphans, we must verify against the artifacts table.
      if (documents.length > 0) {
        const sourceIds = documents.map((d: any) => d.metadata?.source_id).filter(Boolean);
        if (sourceIds.length > 0) {
          const schemaName = getSchemaName();
          // 🔥 strict validation: check id AND project_id AND archived=false
          const { data: validArtifacts } = await this.supabase
            .schema(schemaName)
            .from('artifacts')
            .select('id, meta, original_content') // Select more to debug
            .in('id', sourceIds)
            .eq('project_id', projectId) // Filter by project
            .eq('archived', false);

          console.log('[RAG] Valid Artifacts Found in DB:', validArtifacts?.length, validArtifacts?.map(a => a.id));

          const validIdSet = new Set(validArtifacts?.map(a => a.id));
          documents = documents.filter((d: any) => d.metadata?.source_id && validIdSet.has(d.metadata.source_id));

          // 🧹 Deduplication: Remove identical chunks (same content)
          const seenContent = new Set();
          documents = documents.filter((d: any) => {
            const contentSig = d.pageContent?.trim() || '';
            if (seenContent.has(contentSig)) return false;
            seenContent.add(contentSig);
            return true;
          });
        }
      }

      return { data: { documents }, error: null };

    } catch (err) {
      console.warn('⚠️ [queryKnowledgeBase] Remote RAG failed, falling back to local keyword search:', err);

      // 2. Fallback: Local Keyword Search (Client-side)
      try {
        const schemaName = getSchemaName();
        // Fetch recent artifacts (limit 20 to avoid performance hit)
        const { data: artifacts, error } = await this.supabase
          .schema(schemaName)
          .from('artifacts')
          .select('*')
          .eq('project_id', projectId)
          .eq('archived', false) // 🔥 Fix: Don't search archived/deleted files
          .order('created_at', { ascending: false })
          .limit(20);

        if (error || !artifacts) {
          return { data: { documents: [] }, error: null };
        }

        const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 0);

        let matchedDocs = artifacts.map(artifact => {
          let score = 0;
          const content = (artifact.original_content || '').toLowerCase();
          const title = (artifact.meta?.file_name || artifact.id).toLowerCase();

          // Basic scoring
          keywords.forEach(keyword => {
            if (content.includes(keyword)) score += 2;
            if (title.includes(keyword)) score += 5;
          });

          // Recent boost
          const ageHours = (Date.now() - new Date(artifact.created_at).getTime()) / (1000 * 60 * 60);
          if (ageHours < 24) score += 1;

          return {
            id: artifact.id,
            content: artifact.original_content || '[Binary File]',
            metadata: {
              title: artifact.meta?.file_name || 'Untitled',
              source_id: artifact.id,
              type: artifact.content_type,
              created_at: artifact.created_at
            },
            similarity: score
          };
        });

        // Filter and sort
        matchedDocs = matchedDocs.filter(d => d.similarity > 0);

        // If still no matches, just return valid recent text files (context fallback)
        if (matchedDocs.length === 0) {
          matchedDocs = artifacts
            .filter(a => a.content_type?.startsWith('text/') || !a.content_type)
            .map(artifact => ({
              id: artifact.id,
              content: artifact.original_content || '[Binary File]',
              metadata: {
                title: artifact.meta?.file_name || 'Untitled',
                source_id: artifact.id,
                type: artifact.content_type,
                created_at: artifact.created_at
              },
              similarity: 0.1
            }));
        }

        matchedDocs.sort((a, b) => b.similarity - a.similarity);
        return { data: { documents: matchedDocs.slice(0, matchCount) }, error: null };

      } catch (fallbackErr) {
        console.error('❌ [queryKnowledgeBase] Fallback failed:', fallbackErr);
        return { data: { documents: [] }, error: null };
      }
    }
  }

  // System Prompts Methods
  async getSystemPrompts(
    projectId: string
  ): Promise<StorageResponse<SystemPromptConfig>> {
    try {
      console.log('🔍 [getSystemPrompts] 開始查詢 system_prompts，projectId:', projectId);

      const { data, error } = await this.supabase
        .schema('aiproject')
        .from('system_prompts')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (error) {
        console.error('❌ [getSystemPrompts] Supabase 查詢錯誤:', error);
        return { data: null as any, error: new Error(error.message) };
      }

      // 🔥 如果沒有設定，回傳 prompts.ts 中定義的預設值（而非空字串）
      if (!data) {
        console.log('⚠️ [getSystemPrompts] 查無資料，回傳 prompts.ts 預值');
        const defaultPrompts: SystemPromptConfig = {
          wbs_parser: WBS_PARSER_PROMPT,
          intent_classification: generateSystemPrompt(),
          few_shot_examples: generateFewShotPrompt(),
          prompt_templates: DEFAULT_PROMPT_TEMPLATES // 🔥 新增預設模板
        };
        console.log('📋 [getSystemPrompts] 預設值長度:', {
          wbs_parser: defaultPrompts.wbs_parser.length,
          intent_classification: defaultPrompts.intent_classification.length,
          few_shot_examples: defaultPrompts.few_shot_examples.length,
          prompt_templates: defaultPrompts.prompt_templates.length
        });
        return {
          data: defaultPrompts,
          error: null
        };
      }

      // 🔥 如果 prompt_templates 欄位不存在，補上預設值
      if (!data.prompt_templates) {
        data.prompt_templates = DEFAULT_PROMPT_TEMPLATES;
      }

      console.log('✅ [getSystemPrompts] 查詢成功，資料長度:', {
        wbs_parser: data.wbs_parser?.length || 0,
        intent_classification: data.intent_classification?.length || 0,
        few_shot_examples: data.few_shot_examples?.length || 0,
        prompt_templates: data.prompt_templates?.length || 0
      });

      return { data, error: null };
    } catch (err) {
      console.error('❌ [getSystemPrompts] 異常:', err);
      return { data: null as any, error: err as Error };
    }
  }

  async updateSystemPrompts(
    projectId: string,
    prompts: Partial<SystemPromptConfig>,
    updatedBy?: string
  ): Promise<StorageResponse<SystemPromptConfig>> {
    try {
      console.log('💾 [updateSystemPrompts] 開始儲存 system_prompts，projectId:', projectId);
      console.log('📝 [updateSystemPrompts] 儲存內容長度:', {
        wbs_parser: prompts.wbs_parser?.length || 0,
        intent_classification: prompts.intent_classification?.length || 0,
        few_shot_examples: prompts.few_shot_examples?.length || 0
      });

      // 先取得現有的 system_prompts
      const { data: currentData, error: fetchError } = await this.supabase
        .schema('aiproject')
        .from('system_prompts')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (fetchError) {
        console.error('❌ [updateSystemPrompts] 查詢現有資料失敗:', fetchError);
        return { data: null as any, error: new Error(fetchError.message) };
      }

      // 準備更新的資料（合併現有資料）
      const systemPrompts: SystemPromptConfig = {
        wbs_parser: prompts.wbs_parser ?? (currentData?.wbs_parser || ''),
        intent_classification: prompts.intent_classification ?? (currentData?.intent_classification || ''),
        few_shot_examples: prompts.few_shot_examples ?? (currentData?.few_shot_examples || '')
      };

      if (currentData) {
        console.log('🔄 [updateSystemPrompts] 更新現有記錄，id:', currentData.id);

        // 更新現有記錄
        const { data, error } = await this.supabase
          .schema('aiproject')
          .from('system_prompts')
          .update({
            ...systemPrompts,
            last_updated_at: new Date().toISOString(),
            updated_by: updatedBy || 'system',
            updated_at: new Date().toISOString()
          })
          .eq('project_id', projectId)
          .select()
          .single();

        if (error) {
          console.error('❌ [updateSystemPrompts] 更新失敗:', error);
          return { data: null as any, error: new Error(error.message) };
        }

        console.log('✅ [updateSystemPrompts] 更新成功！');
        return { data, error: null };
      } else {
        console.log('➕ [updateSystemPrompts] 新增記錄');

        // 新增記錄
        const { data, error } = await this.supabase
          .schema('aiproject')
          .from('system_prompts')
          .insert({
            project_id: projectId,
            ...systemPrompts,
            last_updated_at: new Date().toISOString(),
            updated_by: updatedBy || 'system'
          })
          .select()
          .single();

        if (error) {
          console.error('❌ [updateSystemPrompts] 新增失敗:', error);
          return { data: null as any, error: new Error(error.message) };
        }

        console.log('✅ [updateSystemPrompts] 新增成功！');
        return { data, error: null };
      }
    } catch (err) {
      console.error('❌ [updateSystemPrompts] 異常:', err);
      return { data: null as any, error: err as Error };
    }
  }

  async resetSystemPrompt(
    projectId: string,
    promptKey: keyof SystemPromptConfig,
    defaultValue: string,
    updatedBy?: string
  ): Promise<StorageResponse<SystemPromptConfig>> {
    try {
      // 先取得現有的 system_prompts
      const { data: currentData, error: fetchError } = await this.supabase
        .schema('aiproject')
        .from('system_prompts')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (fetchError) {
        console.error('Supabase resetSystemPrompt fetch error:', fetchError);
        return { data: null as any, error: new Error(fetchError.message) };
      }

      // 重置指定的 prompt
      const systemPrompts: SystemPromptConfig = {
        wbs_parser: currentData?.wbs_parser || '',
        intent_classification: currentData?.intent_classification || '',
        few_shot_examples: currentData?.few_shot_examples || '',
        [promptKey]: defaultValue
      };

      if (currentData) {
        // 更新資料庫
        const { data, error } = await this.supabase
          .schema('aiproject')
          .from('system_prompts')
          .update({
            ...systemPrompts,
            last_updated_at: new Date().toISOString(),
            updated_by: updatedBy || 'system',
            updated_at: new Date().toISOString()
          })
          .eq('project_id', projectId)
          .select()
          .single();

        if (error) {
          console.error('Supabase resetSystemPrompt error:', error);
          return { data: null as any, error: new Error(error.message) };
        }

        return { data, error: null };
      } else {
        // 如果不存在，��增記錄
        const { data, error } = await this.supabase
          .schema('aiproject')
          .from('system_prompts')
          .insert({
            project_id: projectId,
            ...systemPrompts,
            last_updated_at: new Date().toISOString(),
            updated_by: updatedBy || 'system'
          })
          .select()
          .single();

        if (error) {
          console.error('Supabase resetSystemPrompt error:', error);
          return { data: null as any, error: new Error(error.message) };
        }

        return { data, error: null };
      }
    } catch (err) {
      console.error('resetSystemPrompt exception:', err);
      return { data: null as any, error: err as Error };
    }
  }

  // 以下是其他必要的 Adapter 方法（目前僅實作 AI Config 相關）
  // TODO: 實作其他方法
  async getProjects(): Promise<StorageResponse<Project[]>> {
    try {
      const schemaName = getSchemaName();
      const { data, error } = await this.supabase
        .schema(schemaName)
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase getProjects error:', error);
        return { data: null, error: new Error(error.message) };
      }

      return { data: data || [], error: null };
    } catch (err) {
      console.error('getProjects exception:', err);
      return { data: null, error: err as Error };
    }
  }

  async createProject(project: Omit<Project, 'id' | 'created_at'>): Promise<StorageResponse<Project>> {
    try {
      const schemaName = getSchemaName();
      const { data, error } = await this.supabase
        .schema(schemaName)
        .from('projects')
        .insert({
          name: project.name,
          description: project.description,
          status: project.status,
          pm_id: project.pm_id,
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase createProject error:', error);
        return { data: null, error: new Error(error.message) };
      }

      return { data, error: null };
    } catch (err) {
      console.error('createProject exception:', err);
      return { data: null, error: err as Error };
    }
  }

  async getProjectById(id: string): Promise<StorageResponse<Project>> {
    try {
      const schemaName = getSchemaName();
      const { data, error } = await this.supabase
        .schema(schemaName)
        .from('projects')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Supabase getProjectById error:', error);
        return { data: null, error: new Error(error.message) };
      }

      if (!data) {
        return { data: null, error: new Error('Project not found') };
      }

      return { data, error: null };
    } catch (err) {
      console.error('getProjectById exception:', err);
      return { data: null, error: err as Error };
    }
  }

  async updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'created_at'>>): Promise<StorageResponse<Project>> {
    try {
      const schemaName = getSchemaName();
      const { data, error } = await this.supabase
        .schema(schemaName)
        .from('projects')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Supabase updateProject error:', error);
        return { data: null, error: new Error(error.message) };
      }

      return { data, error: null };
    } catch (err) {
      console.error('updateProject exception:', err);
      return { data: null, error: err as Error };
    }
  }

  async updateProjectStatus(id: string, status: ProjectStatus): Promise<StorageResponse<Project>> {
    return this.updateProject(id, { status });
  }

  async softDeleteProject(id: string): Promise<StorageResponse<Project>> {
    try {
      const now = new Date();
      const purgeDate = new Date(now);
      purgeDate.setDate(purgeDate.getDate() + 30); // 30 days from now

      return this.updateProject(id, {
        status: 'pending_deletion',
        deleted_at: now.toISOString(),
        purge_at: purgeDate.toISOString(),
      });
    } catch (err) {
      console.error('softDeleteProject exception:', err);
      return { data: null, error: err as Error };
    }
  }

  async restoreProject(id: string): Promise<StorageResponse<Project>> {
    try {
      const schemaName = getSchemaName();
      const { data, error } = await this.supabase
        .schema(schemaName)
        .from('projects')
        .update({
          status: 'active',
          deleted_at: null,
          purge_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('status', 'pending_deletion')
        .select()
        .single();

      if (error) {
        console.error('Supabase restoreProject error:', error);
        return { data: null, error: new Error(error.message) };
      }

      return { data, error: null };
    } catch (err) {
      console.error('restoreProject exception:', err);
      return { data: null, error: err as Error };
    }
  }

  async hardDeleteProject(id: string): Promise<StorageResponse<void>> {
    try {
      const schemaName = getSchemaName();
      const { error } = await this.supabase
        .schema(schemaName)
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase hardDeleteProject error:', error);
        return { data: null, error: new Error(error.message) };
      }

      return { data: undefined, error: null };
    } catch (err) {
      console.error('hardDeleteProject exception:', err);
      return { data: null, error: err as Error };
    }
  }

  async purgeProject(id: string): Promise<StorageResponse<void>> {
    // 永久刪除專案
    // 假設資料庫設定了 CASCADE DELETE，刪除專案會自動刪除關聯資料 (members, artifacts, etc.)
    return this.hardDeleteProject(id);
  }

  async getMembers(projectId: string): Promise<StorageResponse<Member[]>> {
    try {
      const schemaName = getSchemaName();
      const { data, error } = await this.supabase
        .schema(schemaName)
        .from('members')
        .select('*')
        .eq('project_id', projectId);

      if (error) {
        console.error('Supabase getMembers error:', error);
        return { data: null, error: new Error(error.message) };
      }

      return { data: data || [], error: null };
    } catch (err) {
      console.error('getMembers exception:', err);
      return { data: null, error: err as Error };
    }
  }

  async addMember(member: Omit<Member, 'id' | 'joined_at'>): Promise<StorageResponse<Member>> {
    try {
      const schemaName = getSchemaName();
      const { data, error } = await this.supabase
        .schema(schemaName)
        .from('members')
        .insert({
          project_id: member.project_id,
          email: member.email,
          name: member.name,
          role: member.role,
          status: member.status || 'invited',
          role_display_name: member.role_display_name
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase addMember error:', error);
        return { data: null, error: new Error(error.message) };
      }

      // 嘗試透過 Edge Function 寄送邀請信
      // 注意：這是一個非同步操作，我們不等待它完成，也不阻擋回傳
      // 因為 DB insert 已經成功，邀請信失敗不應該視為整個操作失敗
      this.inviteUserByEmail(member.email).catch(err => {
        console.error('Background invite email failed:', err);
      });

      return { data, error: null };
    } catch (err) {
      console.error('addMember exception:', err);
      return { data: null, error: err as Error };
    }
  }

  private async inviteUserByEmail(email: string, redirectTo?: string): Promise<void> {
    try {
      const supabaseUrl = localStorage.getItem('supabase_url');
      const publicAnonKey = localStorage.getItem('supabase_anon_key');

      if (!supabaseUrl || !publicAnonKey) {
        console.warn('Missing Supabase credentials for invitation');
        return;
      }

      // 建構 Edge Function URL
      // Local: http://127.0.0.1:54321/functions/v1/make-server-4df51a95/invite
      // Production: https://<project>.supabase.co/functions/v1/server/make-server-4df51a95/invite
      // (假設部署的 Function 名稱是 "server")

      const isLocal = supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1');
      const functionName = 'server'; // 部署的 Function 名稱

      // 注意：後端已移除 prefix，改為直接使用 /invite
      const routePath = '/invite';

      // 確保 supabaseUrl 沒有結尾斜線
      const baseUrl = supabaseUrl.replace(/\/$/, '');
      const functionUrl = isLocal
        ? `${baseUrl}/functions/v1/make-server-4df51a95${routePath}` // 本地開發保留 mock prefix
        : `${baseUrl}/functions/v1/${functionName}${routePath}`;

      // 呼叫 Edge Function
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          email,
          redirectTo: redirectTo || window.location.origin // 重導回當前應用程式
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to send invitation email:', errorData);
      } else {
        console.log('Invitation email sent successfully to', email);
      }
    } catch (e) {
      console.error('Exception triggering invite email:', e);
    }
  }

  async updateMember(id: string, updates: Partial<Omit<Member, 'id' | 'project_id' | 'joined_at'>>): Promise<StorageResponse<Member>> {
    try {
      const schemaName = getSchemaName();
      const { data, error } = await this.supabase
        .schema(schemaName)
        .from('members')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Supabase updateMember error:', error);
        return { data: null, error: new Error(error.message) };
      }

      return { data, error: null };
    } catch (err) {
      console.error('updateMember exception:', err);
      return { data: null, error: err as Error };
    }
  }

  async deleteMember(id: string): Promise<StorageResponse<void>> {
    try {
      const schemaName = getSchemaName();

      // 1. 先取得該成員的 email（user_id 可能不存在，所以只查 email）
      const { data: memberData, error: fetchError } = await this.supabase
        .schema(schemaName)
        .from('members')
        .select('email')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) {
        console.error('Supabase fetchMember error:', fetchError);
        return { data: null, error: new Error(fetchError.message) };
      }

      const memberEmail = memberData?.email;

      // 2. 刪除 members 記錄
      const { error } = await this.supabase
        .schema(schemaName)
        .from('members')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase deleteMember error:', error);
        return { data: null, error: new Error(error.message) };
      }

      // 3. 檢查該 email 在其他專案是否還有記錄
      if (memberEmail) {
        const { data: remainingRecords, error: checkError } = await this.supabase
          .schema(schemaName)
          .from('members')
          .select('id')
          .eq('email', memberEmail);

        if (checkError) {
          console.warn('Check remaining projects error:', checkError);
          // 不阻止刪除流程
        } else if (!remainingRecords || remainingRecords.length === 0) {
          // 4. 若無其他專案，呼叫 Edge Function 刪除 Auth 使用者
          console.log(`📤 使用者 ${memberEmail} 已無任何專案，嘗試刪除 Auth 帳號...`);
          // 使用 email 刪除（Edge Function 會根據 email 查找 Auth User）
          await this.deleteAuthUserByEmail(memberEmail);
        } else {
          console.log(`✅ 使用者 ${memberEmail} 仍有 ${remainingRecords.length} 個專案`);
        }
      }

      return { data: undefined, error: null };
    } catch (err) {
      console.error('deleteMember exception:', err);
      return { data: null, error: err as Error };
    }
  }

  async removeMember(id: string): Promise<StorageResponse<void>> {
    // Alias for deleteMember
    return this.deleteMember(id);
  }

  /**
   * 根據 email 查詢該使用者在所有專案的成員記錄
   */
  async getMembersByEmail(email: string): Promise<StorageResponse<Member[]>> {
    try {
      const schemaName = getSchemaName();
      const { data, error } = await this.supabase
        .schema(schemaName)
        .from('members')
        .select('*')
        .eq('email', email);

      if (error) {
        console.error('Supabase getMembersByEmail error:', error);
        return { data: null, error: new Error(error.message) };
      }

      return { data: data || [], error: null };
    } catch (err) {
      console.error('getMembersByEmail exception:', err);
      return { data: null, error: err as Error };
    }
  }

  /**
   * 呼叫 Edge Function 刪除 Supabase Auth 使用者
   * 需要後端 Service Role Key 權限
   */
  private async deleteAuthUser(userId: string, email: string): Promise<void> {
    try {
      const supabaseUrl = localStorage.getItem('supabase_url');
      const publicAnonKey = localStorage.getItem('supabase_anon_key');

      if (!supabaseUrl || !publicAnonKey) {
        console.warn('Missing Supabase credentials for delete-user');
        return;
      }

      const isLocal = supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1');
      const functionName = 'server';
      const routePath = '/delete-user';

      const baseUrl = supabaseUrl.replace(/\/$/, '');
      const functionUrl = isLocal
        ? `${baseUrl}/functions/v1/make-server-4df51a95${routePath}`
        : `${baseUrl}/functions/v1/${functionName}${routePath}`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ userId, email })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to delete Auth user:', errorData);
      } else {
        console.log(`✅ Auth 使用者已刪除: ${email}`);
      }
    } catch (e) {
      console.error('Exception deleting Auth user:', e);
    }
  }

  /**
   * 呼叫 Edge Function 刪除 Supabase Auth 使用者（透過 email 查找）
   * 後端會根據 email 查找 Auth User ID 再刪除
   */
  private async deleteAuthUserByEmail(email: string): Promise<void> {
    try {
      const supabaseUrl = localStorage.getItem('supabase_url');
      const publicAnonKey = localStorage.getItem('supabase_anon_key');

      if (!supabaseUrl || !publicAnonKey) {
        console.warn('Missing Supabase credentials for delete-user');
        return;
      }

      const isLocal = supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1');
      const functionName = 'server';
      const routePath = '/delete-user-by-email';

      const baseUrl = supabaseUrl.replace(/\/$/, '');
      const functionUrl = isLocal
        ? `${baseUrl}/functions/v1/make-server-4df51a95${routePath}`
        : `${baseUrl}/functions/v1/${functionName}${routePath}`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to delete Auth user by email:', errorData);
      } else {
        console.log(`✅ Auth 使用者已刪除（by email）: ${email}`);
      }
    } catch (e) {
      console.error('Exception deleting Auth user by email:', e);
    }
  }

  async getArtifacts(projectId: string): Promise<StorageResponse<Artifact[]>> {
    try {
      const schemaName = getSchemaName();

      // 檢查是否為 Local Phase ID (例如: proj_nmth_001)
      const isLocalId = !projectId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      let query = this.supabase
        .schema(schemaName)
        .from('artifacts')
        .select('*');

      // 如果不是 Local Phase ID，才進行 project_id 過濾
      if (!isLocalId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase getArtifacts error:', error);
        return { data: null, error: new Error(error.message) };
      }

      return { data: data || [], error: null };
    } catch (err) {
      console.error('getArtifacts exception:', err);
      return { data: null, error: err as Error };
    }
  }

  async getArtifactById(id: string): Promise<StorageResponse<Artifact>> {
    try {
      const schemaName = getSchemaName();
      const { data, error } = await this.supabase
        .schema(schemaName)
        .from('artifacts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Supabase getArtifactById error:', error);
        return { data: null, error: new Error(error.message) };
      }

      return { data, error: null };
    } catch (err) {
      console.error('getArtifactById exception:', err);
      return { data: null, error: err as Error };
    }
  }

  async createArtifact(artifact: Omit<Artifact, 'id' | 'created_at'>): Promise<StorageResponse<Artifact>> {
    console.log('✅ SupabaseAdapter.createArtifact 被調用（方法已實作）', artifact);
    try {
      const schemaName = getSchemaName();
      const { data, error } = await this.supabase
        .schema(schemaName)
        .from('artifacts')
        .insert({
          project_id: artifact.project_id,
          content_type: artifact.content_type,
          original_content: artifact.original_content,
          masked_content: artifact.masked_content,
          storage_path: artifact.storage_path,
          file_url: artifact.file_url,
          file_size: artifact.file_size,
          file_hash: artifact.file_hash,
          archived: artifact.archived || false,
          meta: artifact.meta || {},
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase createArtifact error:', error);
        return { data: null, error: new Error(error.message) };
      }

      return { data, error: null };
    } catch (err) {
      console.error('createArtifact exception:', err);
      return { data: null, error: err as Error };
    }
  }

  async updateArtifact(id: string, updates: Partial<Omit<Artifact, 'id' | 'project_id' | 'created_at'>>): Promise<StorageResponse<Artifact>> {
    try {
      const schemaName = getSchemaName();
      const { data, error } = await this.supabase
        .schema(schemaName)
        .from('artifacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Supabase updateArtifact error:', error);
        return { data: null, error: new Error(error.message) };
      }

      return { data, error: null };
    } catch (err) {
      console.error('updateArtifact exception:', err);
      return { data: null, error: err as Error };
    }
  }



  // File Storage Methods (Supabase Storage)
  async uploadFile(projectId: string, file: File): Promise<StorageResponse<{
    artifactId: string;
    storagePath: string;
    fileUrl: string;
    fileSize: number;
  }>> {
    try {
      // Step 1: 產生 artifact ID
      const artifactId = crypto.randomUUID();

      // Step 2: 提取副檔名（保留原始檔名供資料庫儲存）
      const originalFileName = file.name;
      const fileExtension = originalFileName.includes('.')
        ? '.' + originalFileName.split('.').pop()
        : '';

      // Step 3: 構建「乾淨」的儲存路徑（僅 ASCII 字元，避免中文）
      // 格式：{projectId}/{artifactId}{extension}
      const safeFileName = `${artifactId}${fileExtension}`;
      const storagePath = `${projectId}/${safeFileName}`;

      console.log(`📤 上傳檔案: "${originalFileName}" → Storage Key: "${storagePath}"`);

      // Step 4: 上傳檔案到 Supabase Storage
      const { error: uploadError } = await this.supabase.storage
        .from('aiproject-files')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Supabase Storage upload error:', uploadError);
        return { data: null, error: new Error(`檔案上傳失敗: ${uploadError.message}`) };
      }

      // Step 5: 產生 signed URL (1 小時有效)
      const { data: urlData, error: urlError } = await this.supabase.storage
        .from('aiproject-files')
        .createSignedUrl(storagePath, 3600);

      if (urlError) {
        console.error('Supabase Storage createSignedUrl error:', urlError);
        return { data: null, error: new Error(`產生檔案 URL 失敗: ${urlError.message}`) };
      }

      console.log(`✅ 檔案上傳成功，Signed URL 已產生`);

      return {
        data: {
          artifactId,
          storagePath,
          fileUrl: urlData.signedUrl,
          fileSize: file.size,
        },
        error: null,
      };
    } catch (err) {
      console.error('uploadFile exception:', err);
      return { data: null, error: err as Error };
    }
  }

  async getFileUrl(storagePath: string, expiresIn: number = 3600): Promise<StorageResponse<string>> {
    try {
      const { data, error } = await this.supabase.storage
        .from('aiproject-files')
        .createSignedUrl(storagePath, expiresIn);

      if (error) {
        console.error('Supabase Storage getFileUrl error:', error);
        return { data: null, error: new Error(`產生檔案 URL 失敗: ${error.message}`) };
      }

      return { data: data.signedUrl, error: null };
    } catch (err) {
      console.error('getFileUrl exception:', err);
      return { data: null, error: err as Error };
    }
  }

  async deleteFile(storagePath: string): Promise<StorageResponse<void>> {
    try {
      const { error } = await this.supabase.storage
        .from('aiproject-files')
        .remove([storagePath]);

      if (error) {
        console.error('Supabase Storage deleteFile error:', error);
        return { data: null, error: new Error(`刪除檔案失敗: ${error.message}`) };
      }

      return { data: undefined, error: null };
    } catch (err) {
      console.error('deleteFile exception:', err);
      return { data: null, error: err as Error };
    }
  }

  async refreshFileUrl(artifactId: string): Promise<StorageResponse<string>> {
    try {
      // Step 1: 取得 Artifact 的 storage_path
      const { data: artifact, error: artifactError } = await this.getArtifactById(artifactId);

      if (artifactError || !artifact) {
        return { data: null, error: artifactError || new Error('找不到 Artifact') };
      }

      if (!artifact.storage_path) {
        return { data: null, error: new Error('此 Artifact 沒有儲存路徑') };
      }

      // Step 2: 產生新的 signed URL
      const { data: newUrl, error: urlError } = await this.getFileUrl(artifact.storage_path);

      if (urlError || !newUrl) {
        return { data: null, error: urlError || new Error('無法產生新的 URL') };
      }

      // Step 3: 更新 Artifact 的 file_url
      await this.updateArtifact(artifactId, { file_url: newUrl });

      return { data: newUrl, error: null };
    } catch (err) {
      console.error('refreshFileUrl exception:', err);
      return { data: null, error: err as Error };
    }
  }

  async scanArtifacts(pattern: string): Promise<StorageResponse<Artifact[]>> {
    try {
      const schemaName = getSchemaName();
      console.log(`🔍 Scanning artifacts in schema '${schemaName}' with pattern: '${pattern}'`);

      const { data, error } = await this.supabase
        .schema(schemaName)
        .from('artifacts')
        .select('id, created_at, project_id, archived, meta, content_type, original_content')
        .or(`meta->>file_name.ilike.%${pattern}%, original_content.ilike.%${pattern}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Supabase scanArtifacts error:', error);
        return { data: null, error: new Error(error.message) };
      }

      return { data: data || [], error: null };
    } catch (err) {
      console.error('scanArtifacts exception:', err);
      return { data: null, error: err as Error };
    }
  }

  async deleteArtifact(id: string): Promise<StorageResponse<void>> {
    try {
      const schemaName = getSchemaName();

      // 1. Fetch artifact to get storage_path
      const { data: artifact, error: fetchError } = await this.supabase
        .schema(schemaName)
        .from('artifacts')
        .select('storage_path')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.warn('⚠️ Query artifact failed before deletion, continuing to delete record:', fetchError);
      }

      // 2. Delete file from Storage bucket if exists
      if (artifact?.storage_path) {
        console.log('🗑️ Deleting file from bucket:', artifact.storage_path);
        const { error: storageError } = await this.supabase.storage
          .from('aiproject-files')
          .remove([artifact.storage_path]);

        if (storageError) {
          console.error('❌ Failed to delete file from storage bucket:', storageError);
          // Don't block record deletion, just warn
        }
      }

      // 3. Delete record from DB
      const { error } = await this.supabase
        .schema(schemaName)
        .from('artifacts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Supabase deleteArtifact 錯誤:', error);
        return { data: null, error: new Error(error.message) };
      }

      console.log('✅ Supabase deleteArtifact 成功:', id);
      return { data: undefined, error: null };
    } catch (error) {
      console.error('❌ Supabase deleteArtifact 異常:', error);
      return { data: null, error: error as Error };
    }
  }

  async pruneOrphanedFiles(projectId: string): Promise<StorageResponse<{ deletedCount: number }>> {
    try {
      console.log('🧹 開始深度清理孤兒檔案:', projectId);
      const schemaName = getSchemaName();

      // 1. List all files in storage
      // Note: This lists files in the folder named {projectId}
      const { data: storageFiles, error: listError } = await this.supabase.storage
        .from('aiproject-files')
        .list(projectId, { limit: 1000 });

      if (listError) throw listError;
      if (!storageFiles || storageFiles.length === 0) {
        return { data: { deletedCount: 0 }, error: null };
      }

      // 2. List all artifact storage_paths in DB
      const { data: dbArtifacts, error: dbError } = await this.supabase
        .schema(schemaName)
        .from('artifacts')
        .select('storage_path')
        .eq('project_id', projectId)
        .not('storage_path', 'is', null);

      if (dbError) throw dbError;

      const validPaths = new Set(dbArtifacts?.map(a => a.storage_path) || []);
      const orphanedFiles: string[] = [];

      // 3. Compare
      for (const file of storageFiles) {
        if (file.name === '.emptyFolderPlaceholder') continue;

        // Supabase list returns filenames (e.g. "abc.pdf").
        // But storage_path is stored as "projectId/filename" (e.g. "uuid/abc.pdf").
        // We must construct the full path to match DB or use logic carefully.
        const fullPath = `${projectId}/${file.name}`;

        if (!validPaths.has(fullPath)) {
          console.log('ATTRIP: Found orphan:', fullPath);
          orphanedFiles.push(fullPath);
        }
      }

      console.log(`🔍 掃描結果: 總檔案 ${storageFiles.length}, 孤兒檔案 ${orphanedFiles.length}`);

      if (orphanedFiles.length === 0) {
        return { data: { deletedCount: 0 }, error: null };
      }

      // 4. Delete orphans
      const { error: deleteError } = await this.supabase.storage
        .from('aiproject-files')
        .remove(orphanedFiles);

      if (deleteError) throw deleteError;

      return { data: { deletedCount: orphanedFiles.length }, error: null };
    } catch (error) {
      console.error('❌ Prune orphaned files error:', error);
      return { data: null, error: error as Error };
    }
  }

  async getItems(projectId: string, filters?: { status?: ItemStatus; type?: ItemType }): Promise<StorageResponse<Item[]>> {
    try {
      const schemaName = getSchemaName();

      // 檢查是否為 Local Phase ID (例如: proj_nmth_001)
      // Local Phase ID 不是 UUID 格式，無法接查詢
      const isLocalId = !projectId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      let query = this.supabase
        .schema(schemaName)
        .from('items')
        .select('*');

      // 如果是 Local Phase ID，查詢所有項目（因為 Supabase 階段通常只有一個專案）
      // 如果是有效的 UUID，則進行精確查詢
      if (!isLocalId) {
        query = query.eq('project_id', projectId);
      }

      // 應用過濾條件
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase getItems error:', error);
        return { data: null, error: new Error(error.message) };
      }

      return { data: data || [], error: null };
    } catch (err) {
      console.error('getItems exception:', err);
      return { data: null, error: err as Error };
    }
  }

  async getItemById(id: string): Promise<StorageResponse<Item>> {
    try {
      const schemaName = getSchemaName();
      const { data, error } = await this.supabase
        .schema(schemaName)
        .from('items')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Supabase getItemById error:', error);
        return { data: null, error: new Error(error.message) };
      }

      if (!data) {
        return { data: null, error: new Error('Item not found') };
      }

      return { data, error: null };
    } catch (err) {
      console.error('getItemById exception:', err);
      return { data: null, error: err as Error };
    }
  }

  async createItem(item: Omit<Item, 'id' | 'created_at'>): Promise<StorageResponse<Item>> {
    try {
      const schemaName = getSchemaName();
      const { data, error } = await this.supabase
        .schema(schemaName)
        .from('items')
        .insert({
          project_id: item.project_id,
          type: item.type,
          status: item.status,
          title: item.title,
          description: item.description,
          assignee_id: item.assignee_id || null,
          work_package_id: item.work_package_id || null,
          parent_id: item.parent_id || null,
          due_date: item.due_date || null,
          priority: item.priority || 'medium',
          source_artifact_id: item.source_artifact_id || null,
          notes: item.notes || null,
          notes_updated_at: item.notes_updated_at || null,
          notes_updated_by: item.notes_updated_by || null,
          meta: item.meta || {},
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase createItem error:', error);
        return { data: null, error: new Error(error.message) };
      }

      return { data, error: null };
    } catch (err) {
      console.error('createItem exception:', err);
      return { data: null, error: err as Error };
    }
  }

  async updateItem(id: string, updates: Partial<Omit<Item, 'id' | 'created_at'>>): Promise<StorageResponse<Item>> {
    try {
      const schemaName = getSchemaName();
      const { data, error } = await this.supabase
        .schema(schemaName)
        .from('items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Supabase updateItem error:', error);
        return { data: null, error: new Error(error.message) };
      }

      return { data, error: null };
    } catch (err) {
      console.error('updateItem exception:', err);
      return { data: null, error: err as Error };
    }
  }

  async updateItemStatus(id: string, status: ItemStatus): Promise<StorageResponse<Item>> {
    try {
      const schemaName = getSchemaName();
      const { data, error } = await this.supabase
        .schema(schemaName)
        .from('items')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Supabase updateItemStatus error:', error);
        return { data: null, error: new Error(error.message) };
      }

      return { data, error: null };
    } catch (err) {
      console.error('updateItemStatus exception:', err);
      return { data: null, error: err as Error };
    }
  }

  async deleteItem(id: string): Promise<StorageResponse<void>> {
    try {
      const schemaName = getSchemaName();
      const { error } = await this.supabase
        .schema(schemaName)
        .from('items')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase deleteItem error:', error);
        return { data: null, error: new Error(error.message) };
      }

      return { data: undefined, error: null };
    } catch (err) {
      console.error('deleteItem exception:', err);
      return { data: null, error: err as Error };
    }
  }

  async linkItemToArtifact(itemId: string, artifactId: string): Promise<StorageResponse<void>> {
    try {
      const schemaName = getSchemaName();
      const { error } = await this.supabase
        .schema(schemaName)
        .from('items')
        .update({ source_artifact_id: artifactId })
        .eq('id', itemId);

      if (error) {
        console.error('Supabase linkItemToArtifact error:', error);
        return { data: null, error: new Error(error.message) };
      }

      return { data: undefined, error: null };
    } catch (err) {
      console.error('linkItemToArtifact exception:', err);
      return { data: null, error: err as Error };
    }
  }

  async unlinkItemFromArtifact(itemId: string, artifactId: string): Promise<StorageResponse<void>> {
    try {
      const schemaName = getSchemaName();
      const { error } = await this.supabase
        .schema(schemaName)
        .from('items')
        .update({ source_artifact_id: null })
        .eq('id', itemId)
        .eq('source_artifact_id', artifactId);

      if (error) {
        console.error('Supabase unlinkItemFromArtifact error:', error);
        return { data: null, error: new Error(error.message) };
      }

      return { data: undefined, error: null };
    } catch (err) {
      console.error('unlinkItemFromArtifact exception:', err);
      return { data: null, error: err as Error };
    }
  }

  async getGlobalConfig(): Promise<StorageResponse<GlobalConfig>> {
    // TODO: 實作 Supabase 查詢
    throw new Error('Method not implemented.');
  }

  async updateGlobalConfig(updates: Partial<GlobalConfig>): Promise<StorageResponse<GlobalConfig>> {
    // TODO: 實作 Supabase 更新
    throw new Error('Method not implemented.');
  }

  async getProjectConfig(projectId: string): Promise<StorageResponse<ProjectConfig>> {
    // TODO: 實作 Supabase 查詢
    throw new Error('Method not implemented.');
  }

  async updateProjectConfig(projectId: string, updates: Partial<ProjectConfig>): Promise<StorageResponse<ProjectConfig>> {
    // TODO: 實作 Supabase 更新
    throw new Error('Method not implemented.');
  }

  async testConnection(): Promise<StorageResponse<ConnectionStatus>> {
    try {
      const schemaName = getSchemaName();

      // 直接嘗試查詢 system_ai_config 表來測試連線
      // 不再使用 pg_namespace_exists RPC（該函數不存在）
      const { error: tableError } = await this.supabase
        .schema(schemaName)
        .from('system_ai_config')
        .select('id')
        .limit(1);

      if (tableError) {
        // 分析錯誤類型
        if (tableError.message.includes('schema must be one of')) {
          return {
            data: {
              connected: false,
              mode: 'supabase',
              storage_writable: false,
              message: `Schema "${schemaName}" 不存在。可用的 Schema：${tableError.message.split('following: ')[1] || '請檢查 Supabase'}`,
            },
            error: null,
          };
        }

        if (tableError.message.includes('relation') && tableError.message.includes('does not exist')) {
          return {
            data: {
              connected: false,
              mode: 'supabase',
              storage_writable: false,
              message: `Schema "${schemaName}" 存在，但 system_ai_config 表尚未建立。請執行 SQL 建表指令。`,
            },
            error: null,
          };
        }

        return {
          data: {
            connected: false,
            mode: 'supabase',
            storage_writable: false,
            message: `連線失敗: ${tableError.message}`,
          },
          error: null,
        };
      }

      // 連線成功
      return {
        data: {
          connected: true,
          mode: 'supabase',
          storage_writable: true,
          message: `✅ 已成功連線至 Supabase (Schema: ${schemaName})`,
        },
        error: null,
      };
    } catch (err) {
      return {
        data: {
          connected: false,
          mode: 'supabase',
          storage_writable: false,
          message: `連線錯誤: ${(err as Error).message}`,
        },
        error: err as Error,
      };
    }
  }

  async getModules(projectId: string): Promise<StorageResponse<Module[]>> {
    // TODO: 實作 Supabase 查詢
    return { data: [], error: null };
  }

  async createModule(module: Omit<Module, 'id' | 'created_at'>): Promise<StorageResponse<Module>> {
    // TODO: 實作 Supabase 插入
    throw new Error('Method not implemented.');
  }

  async updateModule(id: string, updates: Partial<Omit<Module, 'id' | 'created_at'>>): Promise<StorageResponse<Module>> {
    // TODO: 實作 Supabase 更新
    throw new Error('Method not implemented.');
  }

  async deleteModule(id: string): Promise<StorageResponse<void>> {
    // TODO: 實作 Supabase 刪除
    throw new Error('Method not implemented.');
  }

  async getPages(projectId: string): Promise<StorageResponse<Page[]>> {
    // TODO: 實作 Supabase 查詢
    return { data: [], error: null };
  }

  async createPage(page: Omit<Page, 'id' | 'created_at'>): Promise<StorageResponse<Page>> {
    // TODO: 實作 Supabase 插入
    throw new Error('Method not implemented.');
  }

  async updatePage(id: string, updates: Partial<Omit<Page, 'id' | 'created_at'>>): Promise<StorageResponse<Page>> {
    // TODO: 實作 Supabase 更新
    throw new Error('Method not implemented.');
  }

  async deletePage(id: string): Promise<StorageResponse<void>> {
    // TODO: 實作 Supabase 刪除
    throw new Error('Method not implemented.');
  }

  async getMilestones(projectId: string): Promise<StorageResponse<Milestone[]>> {
    // TODO: 實作 Supabase 查詢
    return { data: [], error: null };
  }

  async createMilestone(milestone: Omit<Milestone, 'id' | 'created_at'>): Promise<StorageResponse<Milestone>> {
    // TODO: 實作 Supabase 插入
    throw new Error('Method not implemented.');
  }

  async updateMilestone(id: string, updates: Partial<Omit<Milestone, 'id' | 'created_at'>>): Promise<StorageResponse<Milestone>> {
    // TODO: 實作 Supabase 更新
    throw new Error('Method not implemented.');
  }

  async deleteMilestone(id: string): Promise<StorageResponse<void>> {
    // TODO: 實作 Supabase 刪除
    throw new Error('Method not implemented.');
  }

  // 🔥 DEPRECATED: 舊版 work_packages 表已棄用，改用 items 表中的 isWorkPackage 項目
  async getWorkPackages(projectId: string): Promise<StorageResponse<WorkPackage[]>> {
    // Return empty array to deprecate old table
    console.warn('[DEPRECATED] getWorkPackages: This method is deprecated. Use items with meta.isWorkPackage instead.');
    return { data: [], error: null };
  }

  async createWorkPackage(workPackage: Omit<WorkPackage, 'id' | 'created_at' | 'updated_at'>): Promise<StorageResponse<WorkPackage>> {
    try {
      const schemaName = getSchemaName();
      const { data, error } = await this.supabase
        .schema(schemaName)
        .from('work_packages')
        .insert({
          project_id: workPackage.project_id,
          title: workPackage.title,
          description: workPackage.description,
          owner_id: workPackage.owner_id,
          status: workPackage.status,
          module_id: workPackage.module_id,
          page_id: workPackage.page_id,
          milestone_id: workPackage.milestone_id,
          wave: workPackage.wave,
          target_date: workPackage.target_date,
          completion_rate: workPackage.completion_rate || 0,
          source_artifact_id: workPackage.source_artifact_id,
          notes: workPackage.notes,
          notes_updated_at: workPackage.notes_updated_at,
          notes_updated_by: workPackage.notes_updated_by,
          meta: workPackage.meta || {},
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase createWorkPackage error:', error);
        return { data: null, error: new Error(error.message) };
      }

      return { data, error: null };
    } catch (err) {
      console.error('createWorkPackage exception:', err);
      return { data: null, error: err as Error };
    }
  }

  async updateWorkPackage(id: string, updates: Partial<Omit<WorkPackage, 'id' | 'created_at'>>): Promise<StorageResponse<WorkPackage>> {
    try {
      const schemaName = getSchemaName();

      // 準備更新資料，自動加上 updated_at
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await this.supabase
        .schema(schemaName)
        .from('work_packages')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Supabase updateWorkPackage error:', error);
        return { data: null, error: new Error(error.message) };
      }

      return { data, error: null };
    } catch (err) {
      console.error('updateWorkPackage exception:', err);
      return { data: null, error: err as Error };
    }
  }

  async deleteWorkPackage(id: string): Promise<StorageResponse<void>> {
    try {
      const schemaName = getSchemaName();
      const { error } = await this.supabase
        .schema(schemaName)
        .from('work_packages')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase deleteWorkPackage error:', error);
        return { data: null, error: new Error(error.message) };
      }

      return { data: undefined, error: null };
    } catch (err) {
      console.error('deleteWorkPackage exception:', err);
      return { data: null, error: err as Error };
    }
  }

  async getWorkActivities(projectId: string): Promise<StorageResponse<WorkActivity[]>> {
    // TODO: 實作 Supabase 查詢
    return { data: [], error: null };
  }

  async createWorkActivity(workActivity: Omit<WorkActivity, 'id' | 'created_at'>): Promise<StorageResponse<WorkActivity>> {
    // TODO: 實作 Supabase 插入
    throw new Error('Method not implemented.');
  }

  async updateWorkActivity(id: string, updates: Partial<Omit<WorkActivity, 'id' | 'created_at'>>): Promise<StorageResponse<WorkActivity>> {
    // TODO: 實作 Supabase 更新
    throw new Error('Method not implemented.');
  }

  async deleteWorkActivity(id: string): Promise<StorageResponse<void>> {
    // TODO: 實作 Supabase 刪除
    throw new Error('Method not implemented.');
  }
}