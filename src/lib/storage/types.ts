export interface StorageResponse<T> {
  data: T | null;
  error: Error | null;
}

export type ProjectStatus = 'active' | 'archived' | 'pending_deletion' | 'deleted';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  pm_id?: string; // Project Manager ID
  deleted_at?: string; // When the project was marked for deletion
  purge_at?: string; // When the project will be permanently deleted (deleted_at + 30 days)
  created_at: string;
  updated_at?: string;
  meta?: Record<string, any>;
}

export type MemberRole = 'client' | 'pm' | 'designer' | 'engineer' | 'other' | 'admin';
export type MemberStatus = 'invited' | 'active' | 'disabled';

export interface Member {
  id: string;
  project_id: string;
  email: string;
  name: string;
  role: MemberRole;
  role_display_name?: string;
  status: MemberStatus;
  joined_at: string;
}

// Module 2: Chat & Inbox Types
export type ItemType = 'general' | 'pending' | 'cr' | 'decision' | 'action' | 'rule' | 'todo';
export type ItemStatus =
  // AI 建議與確認流程
  | 'suggestion'         // AI 產生的建議（收件匣專用）
  | 'rejected'           // 已拒絕的建議

  // 標準任務狀態（符合 rules.md 2.2）
  | 'not_started'        // 未開始
  | 'in_progress'        // 進行中
  | 'blocked'            // 卡關
  | 'awaiting_response'  // 待回覆
  | 'completed';         // 已完成

export type ItemPriority = 'low' | 'medium' | 'high';
export type ArtifactType = 'text' | 'file' | 'image' | 'link' | 'conversation';

// Module 4: Pending-specific Types
export type WaitingOnType = 'client' | 'internal' | 'external';
export type ExpectedResponseType = 'yes_no' | 'choice' | 'file' | 'text' | 'other';
export type ResolutionHint = 'to_decision' | 'to_action' | 'workaround';

// Module 5: Decision/Rule Types
export type DecisionCategory = 'technical' | 'business' | 'ui_ux' | 'process' | 'other';
export type DecisionScope = 'global' | 'module' | 'page';
export type DecisionStatus = 'active' | 'deprecated';

export interface Artifact {
  id: string;
  project_id: string;
  content_type: string; // MIME type (e.g., 'text/plain', 'text/conversation', 'text/uri-list', 'application/pdf')
  original_content: string; // Original content (cannot be modified after creation) - For text only, files use storage_path
  masked_content?: string; // Content with sensitive info masked
  storage_path?: string; // Supabase Storage path (e.g., "project_id/artifact_id/filename.pdf") - For files only
  file_url?: string; // Signed URL (temporary, 1 hour validity)
  file_size?: number; // File size in bytes
  file_hash?: string; // SHA-256 hash for deduplication and integrity check
  created_at: string;
  archived?: boolean; // Module 6: Archiving
  meta?: {
    channel?: 'line' | 'email' | 'meeting' | 'upload' | 'paste';
    summary?: string;
    source_info?: string; // Filename/timestamp/etc
    uploader_id?: string;
    file_name?: string; // Original filename for uploaded files
    file_type?: string; // MIME type of the file (deprecated, use content_type)
    needs_migration?: boolean; // Flag for Local Phase files that need migration to Supabase Storage
    is_manual?: boolean; // 手動匯入標記
    is_temporary?: boolean; // 暫存標記
    original_channel?: string; // 原始來源頻道
  };
}

export interface Item {
  id: string;
  project_id: string;
  type: ItemType;
  status: ItemStatus;
  title: string;
  description: string;
  source_artifact_id?: string;
  assignee_id?: string;
  work_package_id?: string; // Link to WorkPackage (null = 未歸屬)
  parent_id?: string; // Link to parent Item for tree structure (null = root level)
  due_date?: string;
  priority?: ItemPriority; // Module 3: Priority level
  notes?: string; // 備註內容（多行文字）
  notes_updated_at?: string; // 備註最後更新時間
  notes_updated_by?: string; // 備註最後更新者 email
  embedding?: number[]; // Vector embedding (1536 dim)
  meta?: Record<string, any>; // For flexible extension (e.g., tags, confidence, pending target, rule scope)
  created_at: string;
  updated_at: string;
}

// Module 4: Pending Item Meta Structure
export interface PendingMeta {
  waiting_on_type?: WaitingOnType;
  waiting_on_name?: string;
  expected_response?: string;
  resolution_hint?: ResolutionHint;
  response_content?: string;
  response_at?: string;
  response_by?: string;
  workaround_reason?: string;
}

// Module 5: Decision Item Meta Structure
export interface DecisionMeta {
  category?: DecisionCategory;
  scope?: DecisionScope;
  scope_target?: string;
  status?: DecisionStatus;
  deprecated_reason?: string;
  replaced_by_id?: string;
  parent_pending_id?: string;
  last_updated_by?: string;
  last_updated_at?: string;
  citation?: {
    artifact_id: string;
    source_type: string;
    source_label: string;
    location_info: string;
    highlight_text?: string;
  };
}

// Module 7: Change Request (CR) Meta Structure
export type CRRiskLevel = 'low' | 'medium' | 'high';

export interface CRMeta {
  risk_level: CRRiskLevel;
  impact_modules: string[];
  impact_pages: string[];
  impact_description?: string;
  owner_id?: string;
  requester?: string;
  citation?: {
    artifact_id: string;
    source_type: string;
    source_label: string;
    location_info: string;
    highlight_text?: string;
  };
}

// 🔥 NEW: Requirement Snippet for accumulating discussions
export type RequirementSnippetStatus = 'active' | 'superseded' | 'conflict';

export interface RequirementSnippet {
  id: string;
  content: string; // Extracted requirement text
  source_artifact_id?: string; // Link to source document
  source_label: string; // e.g., "2025/01/05 會議記錄"
  created_at: string;
  status: RequirementSnippetStatus;
  conflict_with?: string; // ID of conflicting snippet if any
}

// 🔥 NEW: Extended meta for feature/work nodes
export interface FeatureNodeMeta {
  isFeatureModule?: boolean;
  isWorkPackage?: boolean;
  requirement_snippets?: RequirementSnippet[];
  consolidated_spec?: string; // AI-consolidated specification
  consolidated_at?: string; // Last consolidation timestamp
  order?: number;
  ai_source?: string;
  estimated_days?: number;
}

// 🔥 NEW: Suggestion meta for AI output with target node
export interface SuggestionMeta {
  ai_source?: string;
  confidence?: number;
  reasoning?: string;
  summary?: string;
  risk_level?: CRRiskLevel;
  target_node_id?: string; // AI-suggested parent node
  target_node_path?: string; // Human-readable path (e.g., "功能模組/後台/儀表板")
  requirement_snippet?: RequirementSnippet; // Extracted requirement to append
  citations?: Array<{
    text: string;
    source_name?: string;
    artifact_id?: string;
  }>;
}

// Module 11: Module & Page Execution Map
export type ModuleStatus = 'active' | 'completed' | 'on_hold';
export type PageStatus = 'designing' | 'developing' | 'testing' | 'done';
export type WorkPackageStatus = 'not_started' | 'in_progress' | 'completed' | 'on_hold';

export interface Module {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  status: ModuleStatus;
  created_at: string;
}

export interface Page {
  id: string;
  module_id: string;
  project_id: string;
  name: string;
  description?: string;
  status: PageStatus;
  path?: string;
  reference_link?: string;
  created_at: string;
}

export interface Milestone {
  id: string;
  project_id: string;
  name: string;
  start_date: string;
  end_date: string;
  color?: string;
  created_at: string;
}

// Work Package (WBS / Project Work)
export interface WorkPackage {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  owner_id?: string; // Member ID
  status: WorkPackageStatus;
  module_id?: string; // Optional: link to Module
  page_id?: string; // Optional: link to Page
  milestone_id?: string; // Optional: link to Milestone
  wave?: string; // Wave name (e.g., "Wave 1", "Phase A")
  target_date?: string; // Target completion date
  completion_rate?: number; // 0-100, calculated from related Actions
  source_artifact_id?: string; // Link to source WBS/spec document
  notes?: string; // 備註內容（多行文字）
  notes_updated_at?: string; // 備註最後更新時間
  notes_updated_by?: string; // 備註最後更新者 email
  meta?: {
    order?: number; // Sorting order
    suggested_module?: string;
    suggested_page?: string;
    suggested_wave?: string;
    citation?: {
      artifact_id: string;
      source_label: string;
      location_info?: string;
      highlight_text?: string;
    };
  };
  created_at: string;
  updated_at: string;
}

// Work Package Activity (for status updates/回報)
export interface WorkActivity {
  id: string;
  work_package_id: string;
  project_id: string;
  content: string; // The update/report content
  author_id?: string; // Member who created this update
  created_at: string;
}

// Type guard for Pending items
export function isPendingItem(item: Item): item is Item & { meta: PendingMeta } {
  return item.type === 'pending';
}

// Type guard for Decision/Rule items
export function isDecisionItem(item: Item): item is Item & { meta: DecisionMeta } {
  return item.type === 'decision';
}

// Type guard for CR items
export function isCRItem(item: Item): item is Item & { meta: CRMeta } {
  return item.type === 'cr';
}

export interface GlobalConfig {
  openai_api_key?: string; // Only used for writing in Supabase mode
  openai_api_key_masked?: string;
  gemini_api_key?: string; // Only used for writing in Supabase mode
  gemini_api_key_masked?: string;
  chat_model: string;
  embedding_model: string;
  updated_at: string;
}

// System AI Config (全系統 AI 供應商與模型設定)
export type AIProvider = 'openai' | 'anthropic' | 'google';
export type AITestStatus = 'success' | 'failed' | 'pending';

export interface SystemAIConfig {
  id: string;
  provider: AIProvider;
  model: string;
  api_key: string;
  api_endpoint?: string;
  is_active: boolean;
  last_tested_at?: string;
  test_status?: AITestStatus;
  created_at: string;
  updated_at: string;
}

export interface ProjectConfig {
  project_id: string;
  schema_name: string;
  isolation_key: string;
  preferences: {
    morning_brief_enabled: boolean;
    mask_artifacts_default: boolean;
    notification_frequency: 'immediate' | 'daily' | 'never';
  };
  updated_at: string;
}

export interface ConnectionStatus {
  connected: boolean;
  mode: 'local' | 'supabase';
  storage_writable: boolean;
  message?: string;
}

// AI Chat & Conversation Types
export type MessageRole = 'user' | 'assistant' | 'system';
export type IntentType = 'CREATE' | 'QUERY' | 'UPDATE' | 'RELATE' | 'CLARIFY';
export type ConversationStatus = 'active' | 'archived';

export interface Conversation {
  id: string;
  project_id: string;
  user_id: string;
  title?: string;
  status: ConversationStatus;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  intent?: IntentType;
  confidence?: number;
  citations?: Citation[];
  meta?: {
    suggestion_ids?: string[]; // 建議卡 IDs（若 intent = CREATE）
    search_results?: any[]; // 搜尋結果（若 intent = QUERY）
    clarifications?: Clarification[]; // 追問清單（若 intent = CLARIFY）
  };
  created_at: string;
}

export interface Citation {
  artifact_id?: string;
  item_id?: string;
  text: string;
  start_pos?: number;
  end_pos?: number;
}

export interface Clarification {
  question: string;
  options?: string[];
}

export interface AIResponse {
  intent: IntentType;
  confidence: number;
  message: string;
  suggestions?: SuggestionDraft[];
  searchResults?: {
    items: Item[];
    artifacts: Artifact[];
    summary: string;
  };
  clarifications?: Clarification[];
  citations: Citation[];
}

export interface SuggestionDraft {
  type: ItemType;
  title: string;
  description: string;
  confidence: number;
  assignee_id?: string;
  due_date?: string;
  meta?: Record<string, any>;
}

export interface AIContext {
  project: {
    id: string;
    name: string;
    description?: string;
  };
  members: Member[];
  recentItems: Item[];
  recentArtifacts: Artifact[];
  conversationHistory: Message[];
}

export interface StorageAdapter {
  // Project Methods
  getProjects(): Promise<StorageResponse<Project[]>>;
  createProject(project: Omit<Project, 'id' | 'created_at'>): Promise<StorageResponse<Project>>;
  getProjectById(id: string): Promise<StorageResponse<Project>>;
  updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'created_at'>>): Promise<StorageResponse<Project>>;
  updateProjectStatus(id: string, status: ProjectStatus): Promise<StorageResponse<Project>>;
  softDeleteProject(id: string): Promise<StorageResponse<Project>>; // Mark for deletion (30 days)
  restoreProject(id: string): Promise<StorageResponse<Project>>; // Restore from pending_deletion
  purgeProject(id: string): Promise<StorageResponse<void>>; // Permanent delete

  // Member Methods
  getMembers(projectId: string): Promise<StorageResponse<Member[]>>;
  addMember(member: Omit<Member, 'id' | 'joined_at'>): Promise<StorageResponse<Member>>;
  updateMember(id: string, updates: Partial<Omit<Member, 'id' | 'project_id' | 'joined_at'>>): Promise<StorageResponse<Member>>;
  deleteMember(id: string): Promise<StorageResponse<void>>;

  // Artifact Methods
  createArtifact(artifact: Omit<Artifact, 'id' | 'created_at'>): Promise<StorageResponse<Artifact>>;
  getArtifactById(id: string): Promise<StorageResponse<Artifact>>;
  getArtifacts(projectId: string): Promise<StorageResponse<Artifact[]>>;
  updateArtifact(id: string, updates: Partial<Omit<Artifact, 'id' | 'project_id' | 'created_at'>>): Promise<StorageResponse<Artifact>>;
  deleteArtifact(id: string): Promise<StorageResponse<void>>;

  // File Storage Methods (Supabase Storage)
  uploadFile(projectId: string, file: File): Promise<StorageResponse<{
    artifactId: string;
    storagePath: string;
    fileUrl: string;
    fileSize: number;
  }>>;
  getFileUrl(storagePath: string, expiresIn?: number): Promise<StorageResponse<string>>;
  deleteFile(storagePath: string): Promise<StorageResponse<void>>;
  refreshFileUrl(artifactId: string): Promise<StorageResponse<string>>;

  // Item Methods
  createItem(item: Omit<Item, 'id' | 'created_at' | 'updated_at'>): Promise<StorageResponse<Item>>;
  updateItem(id: string, updates: Partial<Omit<Item, 'id' | 'project_id' | 'created_at'>>): Promise<StorageResponse<Item>>;
  getItemById(id: string): Promise<StorageResponse<Item>>;
  getItems(projectId: string, filters?: { status?: ItemStatus; type?: ItemType }): Promise<StorageResponse<Item[]>>;
  deleteItem(id: string): Promise<StorageResponse<void>>;

  // Module 11 Methods
  getModules(projectId: string): Promise<StorageResponse<Module[]>>;
  createModule(module: Omit<Module, 'id' | 'created_at'>): Promise<StorageResponse<Module>>;
  updateModule(id: string, updates: Partial<Omit<Module, 'id' | 'project_id' | 'created_at'>>): Promise<StorageResponse<Module>>;

  getPages(projectId: string, moduleId?: string): Promise<StorageResponse<Page[]>>;
  createPage(page: Omit<Page, 'id' | 'created_at'>): Promise<StorageResponse<Page>>;
  updatePage(id: string, updates: Partial<Omit<Page, 'id' | 'module_id' | 'project_id' | 'created_at'>>): Promise<StorageResponse<Page>>;

  getMilestones(projectId: string): Promise<StorageResponse<Milestone[]>>;
  createMilestone(milestone: Omit<Milestone, 'id' | 'created_at'>): Promise<StorageResponse<Milestone>>;
  updateMilestone(id: string, updates: Partial<Omit<Milestone, 'id' | 'project_id' | 'created_at'>>): Promise<StorageResponse<Milestone>>;

  // Work Package Methods
  getWorkPackages(projectId: string): Promise<StorageResponse<WorkPackage[]>>;
  createWorkPackage(workPackage: Omit<WorkPackage, 'id' | 'created_at' | 'updated_at'>): Promise<StorageResponse<WorkPackage>>;
  updateWorkPackage(id: string, updates: Partial<Omit<WorkPackage, 'id' | 'project_id' | 'created_at'>>): Promise<StorageResponse<WorkPackage>>;
  deleteWorkPackage(id: string): Promise<StorageResponse<void>>;

  // Work Activity Methods
  getWorkActivities(projectId: string, workPackageId?: string): Promise<StorageResponse<WorkActivity[]>>;
  createWorkActivity(workActivity: Omit<WorkActivity, 'id' | 'created_at'>): Promise<StorageResponse<WorkActivity>>;
  updateWorkActivity(id: string, updates: Partial<Omit<WorkActivity, 'id' | 'project_id' | 'work_package_id' | 'created_at'>>): Promise<StorageResponse<WorkActivity>>;
  deleteWorkActivity(id: string): Promise<StorageResponse<void>>;

  // System Settings Methods
  getGlobalConfig(): Promise<StorageResponse<GlobalConfig>>;
  updateGlobalConfig(updates: Partial<GlobalConfig>): Promise<StorageResponse<GlobalConfig>>;
  testConnection(): Promise<StorageResponse<ConnectionStatus>>;

  // System AI Config Methods
  getSystemAIConfig(): Promise<StorageResponse<SystemAIConfig | null>>;
  updateSystemAIConfig(config: Omit<SystemAIConfig, 'id' | 'created_at' | 'updated_at'>): Promise<StorageResponse<SystemAIConfig>>;
  testAIConnection(provider: AIProvider, model: string, apiKey: string, apiEndpoint?: string): Promise<StorageResponse<{ success: boolean; message: string }>>;

  // RAG / AI Methods
  embedContent(content: string, sourceId: string, sourceType: 'item' | 'artifact', projectId: string, metadata?: any): Promise<StorageResponse<{ success: boolean }>>;
  queryKnowledgeBase(query: string, projectId: string, threshold?: number, matchCount?: number): Promise<StorageResponse<{ documents: any[] }>>;

  // Maintenance
  pruneOrphanedFiles?(projectId: string): Promise<StorageResponse<{ deletedCount: number }>>;
  scanArtifacts?(pattern: string): Promise<StorageResponse<Artifact[]>>;

  // System Prompts Methods
  getSystemPrompts(projectId: string): Promise<StorageResponse<SystemPromptConfig>>;
  updateSystemPrompts(projectId: string, prompts: Partial<SystemPromptConfig>, updatedBy?: string): Promise<StorageResponse<SystemPromptConfig>>;
  resetSystemPrompt(projectId: string, promptKey: keyof SystemPromptConfig, defaultValue: string, updatedBy?: string): Promise<StorageResponse<SystemPromptConfig>>;

  // Project Settings Methods
  getProjectConfig(projectId: string): Promise<StorageResponse<ProjectConfig>>;
  updateProjectConfig(projectId: string, updates: Partial<ProjectConfig>): Promise<StorageResponse<ProjectConfig>>;

  // Development Helper (optional, only in LocalAdapter)
  initializeMockData?(force?: boolean): Promise<void>;
}

// 新增：System Config 設定類型
export interface SystemConfig {
  id: string;
  project_id: string;
  ai_provider: 'openai' | 'anthropic';
  ai_model: string;
  ai_api_key: string;
  system_prompts?: SystemPromptConfig; // 新增：System Prompts 設定
  created_at: string;
  updated_at?: string;
}

// 新增：System Prompt 設定類型
export interface SystemPromptConfig {
  wbs_parser?: string;           // WBS 解析 Prompt
  intent_classification?: string; // 意圖分類 Prompt
  few_shot_examples?: string;     // Few-Shot 範例 Prompt
  prompt_templates?: PromptTemplate[]; // 🔥 場景提示詞模板陣列
  last_updated_at?: string;       // 最後更新時間
  updated_by?: string;            // 更新者
}

// 🔥 新增：場景提示詞模板
export interface PromptTemplate {
  id: string;                    // 唯一識別碼（例如：'meeting-notes'）

  // UI 顯示
  label: string;                 // Badge 顯示文字（例如：「整理會議記錄」）
  category?: string;             // 分類（例如：「會議」、「需求」、「報告」）
  icon?: string;                 // 圖示名稱（選用）

  // 使用者互動
  prompt_prefix: string;         // 預填到輸入框的文字

  // AI 配置
  system_prompt: string;         // 該場景專用的 System Prompt
  user_prompt_template?: string; // 可選：User Prompt 範本

  // 輔助設定
  max_tokens?: number;           // 該場景的 maxTokens 建議值
  temperature?: number;          // 該場景的 temperature 建議值（選用）

  // 管理欄位
  is_active: boolean;            // 是否啟用
  sort_order?: number;           // 排序
  created_at?: string;
  updated_at?: string;
}