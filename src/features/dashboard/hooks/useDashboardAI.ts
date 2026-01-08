import { useState, useEffect } from 'react';

import { toast } from 'sonner';
import { getStorageClient } from '@/lib/storage';
import { createAIService } from '@/lib/ai/AIService';
import { parseDocument } from '@/utils/documentParser';
import { TaskSuggestion } from '@/features/ai/components/TaskPreviewCard';


export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: Date;
    citations?: any[];
}

interface UseDashboardAIProps {
    currentProject: any;
    members: any[];
    setTaskPreview: (preview: { tasks: TaskSuggestion[]; aiMessage: string; sourceArtifactId?: string } | null) => void;
    items?: any[]; // Allow generic items for now
}

export const useDashboardAI = ({ currentProject, members, setTaskPreview, items = [] }: UseDashboardAIProps) => {
    // const navigate = useNavigate();
    const [isAIProcessing, setIsAIProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);

    // Load chat history from sessionStorage when project changes
    useEffect(() => {
        if (currentProject?.id) {
            const key = `ai_chat_history_${currentProject.id}`;
            const saved = sessionStorage.getItem(key);
            if (saved) {
                try {
                    setMessages(JSON.parse(saved));
                } catch (e) {
                    console.error('Failed to parse chat history', e);
                }
            } else {
                setMessages([]);
            }
        }
    }, [currentProject?.id]);

    // 新增：暫存待處理的檔案內容（用於多輪對話意圖確認）
    const [pendingFile, setPendingFile] = useState<{
        file: File;
        parsedContent: { type: string; content: string };
        fileType: string;
        storagePath: string;
        fileUrl: string;
        fileSize: number;
        artifactId: string;
    } | null>(null);

    const addMessage = (role: 'user' | 'assistant', content: string, citations?: any[]) => {
        setMessages(prev => {
            const newMessage: Message = {
                id: Math.random().toString(36).substring(7),
                role,
                content,
                createdAt: new Date(),
                citations
            };
            const updated = [...prev, newMessage];

            // Save to sessionStorage
            if (currentProject?.id) {
                sessionStorage.setItem(`ai_chat_history_${currentProject.id}`, JSON.stringify(updated));
            }

            return updated;
        });
    };

    // Helper function for processing document analysis
    const processDocumentAnalysis = async (instruction: string, context: any) => {
        const storage = getStorageClient();
        const { data: aiConfig } = await storage.getSystemAIConfig();
        if (!aiConfig) return;

        const aiService = createAIService({
            provider: aiConfig.provider as any,
            model: aiConfig.model,
            apiKey: aiConfig.api_key,
            maxTokens: 8000
        });

        const response = await aiService.chat(`Context: Analyze the following file content: ${context.parsedContent.content.substring(0, 5000)}...\n\nUser Instruction: ${instruction}`, {
            projectId: currentProject.id,
            projectName: currentProject.name
        });

        if (response) {
            addMessage('assistant', (response as any).reply || (response as any).content || JSON.stringify(response));
        }
    };

    const handleAIInput = async (input: string, file?: File) => {
        if (!currentProject) return;

        // Add User Message to Chat History
        addMessage('user', input || (file ? `上傳了檔案: ${file.name}` : ''));

        setIsAIProcessing(true);
        setStatusMessage('正在接收指令...');

        // 檢查是否為針對暫存檔案的後續指令
        if (!file && pendingFile && input) {
            const featureModuleKeywords = ['功能模組', '模組清單', '功能列表', '系統功能', '開發清單', '功能需求'];
            const isFeatureModuleRequest = featureModuleKeywords.some(keyword => input.includes(keyword)) || input.includes('建立功能模組');

            if (isFeatureModuleRequest) {
                // 🎯 功能模組分析 - 使用 pending file 內容
                try {
                    setStatusMessage('AI 秘書正在分析功能模組...');
                    const storage = getStorageClient();
                    const { data: aiConfig } = await storage.getSystemAIConfig();
                    if (!aiConfig || !aiConfig.is_active) {
                        toast.error('請先設定 AI API');
                        throw new Error('AI not configured');
                    }

                    const aiService = createAIService({
                        provider: aiConfig.provider as any,
                        model: aiConfig.model,
                        apiKey: aiConfig.api_key,
                        temperature: 0.3,
                        maxTokens: 8000
                    });

                    // 構建功能模組分析 Prompt
                    const featureAnalysisPrompt = `你是專業的系統分析師，請分析以下內容，識別出系統開發需要的功能模組。

輸入內容：
${pendingFile.parsedContent.content.substring(0, 8000)}

請以 JSON 格式回傳：
{
  "project_summary": "專案摘要",
  "modules": [
    {
      "title": "功能模組名稱",
      "description": "功能說明",
      "priority": "high|medium|low",
      "parent_title": "父模組名稱（如果是子功能，否則留空）",
      "estimated_days": 0
    }
  ],
  "reasoning": "分析說明"
}`;

                    const responseText = await aiService.performAIQuery(featureAnalysisPrompt);

                    if (responseText) {
                        let analysis;
                        try {
                            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                            if (jsonMatch) {
                                analysis = JSON.parse(jsonMatch[0]);
                            }
                        } catch (e) {
                            console.error('JSON 解析失敗:', e);
                        }

                        if (analysis && analysis.modules && analysis.modules.length > 0) {
                            setStatusMessage('正在建立功能模組建議...');

                            const parentMap: Record<string, string> = {};

                            for (const mod of analysis.modules) {
                                if (!mod.parent_title || mod.parent_title === '') {
                                    const item = {
                                        project_id: currentProject.id,
                                        type: 'general' as const,
                                        title: mod.title,
                                        description: mod.description || '',
                                        status: 'suggestion' as const,
                                        priority: mod.priority || 'medium',
                                        meta: {
                                            isFeatureModule: true,
                                            ai_source: 'feature_analysis',
                                            estimated_days: mod.estimated_days,
                                            order: Date.now()
                                        }
                                    };

                                    const { data, error } = await storage.createItem(item as any);
                                    if (!error && data) {
                                        parentMap[mod.title] = data.id;
                                    }
                                }
                            }

                            for (const mod of analysis.modules) {
                                if (mod.parent_title && parentMap[mod.parent_title]) {
                                    const item = {
                                        project_id: currentProject.id,
                                        type: 'general' as const,
                                        title: mod.title,
                                        description: mod.description || '',
                                        status: 'suggestion' as const,
                                        priority: mod.priority || 'medium',
                                        parent_id: parentMap[mod.parent_title],
                                        meta: {
                                            isFeatureModule: true,
                                            ai_source: 'feature_analysis',
                                            estimated_days: mod.estimated_days,
                                            order: Date.now()
                                        }
                                    };

                                    await storage.createItem(item as any);
                                }
                            }

                            const moduleCount = analysis.modules.length;
                            const message = `📦 已識別出 ${moduleCount} 個功能模組！

${analysis.project_summary || ''}

識別的模組：
${analysis.modules.map((m: any) => `• ${m.title}${m.parent_title ? ` (子功能: ${m.parent_title})` : ''}`).join('\n')}

${analysis.reasoning || ''}

✅ 已將這些功能模組建議送至「收件匣」，請前往收件匣確認後，它們將出現在「任務清單 > 功能模組」中。`;

                            addMessage('assistant', message);
                            toast.success(`已建立 ${moduleCount} 個功能模組建議`);
                            setPendingFile(null);
                            setAiSuggestions([]);
                            // 讓用戶自己決定是否前往收件匣
                            // navigate('/inbox');
                        } else {
                            addMessage('assistant', '抱歉，無法從內容中識別出功能模組。請提供更明確的功能說明或模組列表。');
                        }
                    }
                } catch (error) {
                    console.error('功能模組分析失敗:', error);
                    addMessage('assistant', '分析功能模組時發生錯誤，請稍後再試。');
                } finally {
                    setTimeout(() => {
                        setIsAIProcessing(false);
                        setStatusMessage('');
                    }, 500);
                }
            }

            // 🎯 任務規劃 (Planning)
            // 🎯 智慧分析 (Smart Analysis)
            if (await processSmartAnalysis(input, pendingFile.parsedContent.content, pendingFile.artifactId)) {
                return;
            }

            // 其他檔案處理邏輯
            try {
                await processDocumentAnalysis(input, pendingFile);
                setPendingFile(null);
                setAiSuggestions([]);
                addMessage('assistant', '已根據您的指示處理檔案。');
            } catch (error) {
                console.error('暫存檔案處理失敗:', error);
                toast.error('檔案處理失敗');
                addMessage('assistant', '處理檔案時發生錯誤。');
            } finally {
                setIsAIProcessing(false);
                setStatusMessage('');
            }
            return;
        }

        // 🔄 Forward to main logic handler (File + Text)
        await handleFileUpload(file, input);
    };

    // Helper: Smart Analysis (Tasks, Decisions, Changes)
    async function processSmartAnalysis(input: string, content?: string, sourceArtifactId?: string): Promise<boolean> {
        // 關鍵字擴充：包含分析、會議、記錄等
        const analysisKeywords = ['待辦', '任務', 'Task', 'To-do', 'todo', '工作', '計畫', '步驟', '整理', '分析', '解析', '會議', '記錄', '紀錄', 'meeting', 'minutes'];

        const hasInputKeyword = input && analysisKeywords.some(k => input.toLowerCase().includes(k.toLowerCase()));

        // 自動觸發判斷：如果輸入為空，但內容看起來像會議記錄
        const contentPreview = content?.substring(0, 1000) || '';
        const looksLikeMeeting = ['會議', '紀錄', '記錄', 'Meeting', 'Minutes', '決議', '待辦', '討論'].some(k => contentPreview.includes(k));

        // 放寬觸發條件：只要看起來像會議記錄，或者有相關關鍵字，就觸發 (優先於 Chat)
        const shouldTrigger = hasInputKeyword || looksLikeMeeting;

        if (!shouldTrigger) return false;

        try {
            setStatusMessage('AI 秘書正在分析文件並規劃任務...');
            const storage = getStorageClient();
            const { data: aiConfig } = await storage.getSystemAIConfig();

            if (aiConfig && aiConfig.is_active) {
                const aiService = createAIService({
                    provider: aiConfig.provider as any,
                    model: aiConfig.model,
                    apiKey: aiConfig.api_key,
                    temperature: 0.3,
                    maxTokens: 8000
                });

                // 🔥 NEW: Fetch project structure for context
                const { data: allItems } = await storage.getItems(currentProject.id);
                const projectNodes = (allItems || []).filter(item =>
                    item.status !== 'suggestion' &&
                    (item.meta?.isFeatureModule || item.meta?.isWorkPackage)
                );

                // Build tree context string
                const buildTreeContext = (nodes: typeof projectNodes): string => {
                    const rootFeatures = nodes.filter(n => n.meta?.isFeatureModule && !n.parent_id);
                    const rootWork = nodes.filter(n => n.meta?.isWorkPackage && !n.parent_id);

                    const buildBranch = (parentId: string | undefined, indent: number): string => {
                        const children = nodes.filter(n => n.parent_id === parentId);
                        return children.map(child => {
                            const prefix = '  '.repeat(indent) + '- ';
                            const childBranch = buildBranch(child.id, indent + 1);
                            return `${prefix}${child.title} (id: ${child.id})${childBranch ? '\n' + childBranch : ''}`;
                        }).join('\n');
                    };

                    let ctx = '';
                    if (rootFeatures.length > 0) {
                        ctx += '功能模組:\n';
                        ctx += rootFeatures.map(f => `- ${f.title} (id: ${f.id})\n${buildBranch(f.id, 1)}`).join('\n');
                    }
                    if (rootWork.length > 0) {
                        if (ctx) ctx += '\n\n';
                        ctx += '專案工作:\n';
                        ctx += rootWork.map(w => `- ${w.title} (id: ${w.id})\n${buildBranch(w.id, 1)}`).join('\n');
                    }
                    return ctx || '(尚無功能模組或專案工作)';
                };

                const projectStructure = buildTreeContext(projectNodes);

                const sysPrompt = `你是一位專業的專案經理與系統分析師。請深入分析提供的會議記錄或文件，識別出以下三類項目：
1. 待辦事項 (Todos) - 會議中指派的具體待辦事項 (Action Items)。(Type: 'todo')
2. 重要決議 (Decisions) - 已達成的共識或是確認的事項。(Type: 'decision')
3. 變更需求 (Features/CR) - 對功能或流程的調整、新增。(Type: 'cr')

🔥 重要：以下是此專案目前的功能模組與專案工作架構。如果文件內容談論的是與其中某個節點相關的需求或任務，請在 target_node_id 欄位填入該節點的 ID。如果無法判斷屬於哪個節點，請留空或填 null。

---
${projectStructure}
---

請務必只回傳 JSON 格式，不要有 Markdown，格式如下：
{
  "items": [
    {
      "title": "項目標題",
      "description": "詳細說明（人、事、時、地、物）",
      "priority": "high|medium|low",
      "type": "todo" | "decision" | "cr",
      "estimated_days": 1,
      "target_node_id": "節點ID（若與特定功能模組或專案工作相關）或 null",
      "requirement_snippet": "從原文擷取的相關需求描述（用於累積到該節點的需求規格中）"
    }
  ],
  "summary": "簡短的文件摘要"
}`;
                const userCtx = `文件:\n${content?.substring(0, 10000) || ''}\n指令:\n${input}`;

                const aiResponse = await aiService.performAIQuery(userCtx, sysPrompt);

                let parsedItems: any[] = [];
                let summary = "";
                try {
                    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        parsedItems = parsed.items || [];
                        summary = parsed.summary || "";
                    }
                } catch (e) { console.error(e); }

                if (parsedItems.length > 0) {
                    // Find node paths for display
                    const getNodePath = (nodeId: string | null): string | null => {
                        if (!nodeId) return null;
                        const node = projectNodes.find(n => n.id === nodeId);
                        if (!node) return null;

                        const path: string[] = [node.title];
                        let current = node;
                        while (current.parent_id) {
                            const parent = projectNodes.find(n => n.id === current.parent_id);
                            if (parent) {
                                path.unshift(parent.title);
                                current = parent;
                            } else break;
                        }

                        const prefix = node.meta?.isFeatureModule ? '功能模組' : '專案工作';
                        return `${prefix} / ${path.join(' / ')}`;
                    };

                    setTaskPreview({
                        tasks: parsedItems.map((t: any) => ({
                            id: `ai-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                            selected: true,
                            title: `[${t.type === 'decision' ? '決議' : t.type === 'cr' ? '變更' : '待辦'}] ${t.title}`,
                            description: t.description || '',
                            priority: (t.priority || 'medium') as 'high' | 'medium' | 'low',
                            type: t.type || 'todo',
                            estimated_days: t.estimated_days || 1,
                            // 🔥 NEW: Include target node info
                            target_node_id: t.target_node_id || null,
                            target_node_path: getNodePath(t.target_node_id) || null,
                            requirement_snippet: t.requirement_snippet || null
                        })),
                        aiMessage: `我已分析文件內容，整理出 ${parsedItems.length} 個重點項目（含待辦、決議與變更）。\n\n摘要：${summary}`,
                        sourceArtifactId
                    });

                    addMessage('assistant', '已為您整理出建議的待辦事項，請查看右側面板進行確認與建立。');
                    setIsAIProcessing(false);
                    setStatusMessage('');
                    return true;
                }
            }
        } catch (error) {
            console.error('Helper Planning Error:', error);
            toast.error('任務規劃失敗');
        }
        return false;
    }

    async function handleFileUpload(file?: File, input?: string) {
        try {
            const storage = getStorageClient();

            let uploadData = { storagePath: '', fileUrl: '', fileSize: 0 };
            let artifactId = '';
            let fileType = 'unknown';
            let parsedContent = null;

            // 🔥 Step 1: 如果有上傳檔案，先處理檔案
            if (file) {
                console.log('📎 檢測到檔案上傳:', file.name, file.type);

                // Check for duplicates
                const { data: existingArtifacts } = await storage.getArtifacts(currentProject.id);
                const duplicate = existingArtifacts?.find(a =>
                    a.meta?.file_name === file.name &&
                    a.file_size === file.size
                );

                let useExisting = false;
                if (duplicate) {
                    if (confirm(`偵測到已存在相同檔案「${file.name}」。\n是否使用現有檔案進行分析？\n(按「取消」將強制重新上傳)`)) {
                        useExisting = true;
                        uploadData = {
                            storagePath: duplicate.storage_path || '',
                            fileUrl: duplicate.file_url || '',
                            fileSize: duplicate.file_size || 0
                        };
                        artifactId = duplicate.id;
                        toast.success('已連結至現有檔案');
                    }
                }

                if (!useExisting) {
                    // Step 1.2: 上傳檔案到 Supabase Storage
                    setStatusMessage(`正在將 ${file.name} 上傳至雲端...`);
                    const uploadRes = await storage.uploadFile(currentProject.id, file);

                    if (uploadRes.error || !uploadRes.data) {
                        toast.error('檔案上傳失敗');
                        throw new Error('Upload failed');
                    }
                    uploadData = uploadRes.data;

                    // Step 1.3: Parse Content Immediately
                    // We parse here to save content in Artifact for later RAG embedding upon Inbox confirmation
                    try {
                        const parseResult = await parseDocument(file);
                        parsedContent = { type: parseResult.fileType, content: parseResult.text || '' };
                        fileType = parseResult.fileType;
                    } catch (e) {
                        console.warn('Parsing failed:', e);
                        parsedContent = { type: file.type, content: '' };
                    }

                    // Step 1.4: Create Artifact Record (with content)
                    const artifactRes = await storage.createArtifact({
                        project_id: currentProject.id,
                        content_type: file.type,
                        original_content: parsedContent.content, // Store parsed text
                        storage_path: uploadData.storagePath,
                        file_url: uploadData.fileUrl,
                        file_size: uploadData.fileSize,
                        meta: {
                            channel: 'upload',
                            file_name: file.name,
                            uploader_id: 'current_user',
                            is_temporary: true
                        }
                    });

                    if (artifactRes.error || !artifactRes.data) {
                        toast.error('建立檔案記錄失敗');
                        throw new Error('Artifact creation failed');
                    }
                    artifactId = artifactRes.data.id;
                }

                // Step 1.5: AI Analysis logic
                // already parsed above

                // Interactive Check with Intelligent Detection


                // Interactive Check with Intelligent Detection
                const isAmbiguousTextDoc = !file.type.startsWith('image/') && (!input || input.trim() === '');
                if (isAmbiguousTextDoc) {
                    setStatusMessage('AI 正在分析文件類型...');

                    // 🧠 智能偵測文件類型
                    let detectedType = 'Other';
                    let suggestionMsg = `已讀取 ${file.name}，請問您希望我如何處理？`;
                    let suggestions = ['整理會議記錄', '建立 WBS', '建立功能模組', '分析需求規格', '摘要重點'];

                    try {
                        const { data: aiConfig } = await storage.getSystemAIConfig();
                        if (aiConfig && aiConfig.is_active) {
                            const aiService = createAIService({
                                provider: aiConfig.provider as any,
                                model: aiConfig.model,
                                apiKey: aiConfig.api_key,
                                maxTokens: 1000
                            });

                            const detectionPrompt = `請分析以下文件內容的前 2000 字，判斷其類型。
只回傳以下其中一個標籤（不要有其他文字）：
- FeatureList (如果是功能需求列表、功能規格書、系統模組清單)
- WBS (如果是專案時程表、工作分解結構、任務清單)
- MeetingNotes (如果是會議記錄、討論事項)
- Other (其他)

文件內容摘要：
${parsedContent!.content.substring(0, 2000)}`;

                            const typeResult = await aiService.performAIQuery(detectionPrompt);
                            detectedType = typeResult.trim().replace(/[^a-zA-Z]/g, ''); // Clean up

                            console.log('📄 AI Detected Document Type:', detectedType);

                            if (detectedType.includes('FeatureList')) {
                                suggestionMsg = `我偵測到這是一份**功能需求文件**。💡\n建議為您直接**建立功能模組**，以便進行後續追蹤。`;
                                suggestions = ['建立功能模組', '分析需求規格', '摘要重點'];
                            } else if (detectedType.includes('WBS')) {
                                suggestionMsg = `我偵測到這是一份**專案任務清單 (WBS)**。💡\n建議為您**建立專案工作**，以進行時程管理。`;
                                suggestions = ['建立專案工作', '分析關鍵路徑', '摘要重點'];
                            } else if (detectedType.includes('MeetingNotes')) {
                                suggestionMsg = `我偵測到這是一份**會議記錄**。💡\n建議為您**整理待辦事項**與決議。`;
                                suggestions = ['整理會議記錄', '摘要重點'];
                            }
                        }
                    } catch (e) {
                        console.warn('Document type detection failed, falling back to default.', e);
                    }

                    setPendingFile({
                        file,
                        parsedContent: parsedContent!,
                        fileType,
                        storagePath: uploadData.storagePath,
                        fileUrl: uploadData.fileUrl,
                        fileSize: uploadData.fileSize,
                        artifactId
                    });

                    addMessage('assistant', suggestionMsg);
                    setAiSuggestions(suggestions);
                    setIsAIProcessing(false);
                    return;
                }

                // If input exists, process immediately
                // 🎯 先檢查是否為功能模組請求
                const featureModuleKeywords = ['功能模組', '模組清單', '功能列表', '系統功能', '開發清單', '功能需求'];
                const isFeatureModuleRequest = input ? (featureModuleKeywords.some(keyword => input.includes(keyword)) || input.includes('建立功能模組')) : false;

                if (isFeatureModuleRequest) {
                    // 功能模組分析
                    setStatusMessage('AI 秘書正在分析功能模組...');
                    const { data: aiConfig } = await storage.getSystemAIConfig();
                    if (!aiConfig || !aiConfig.is_active) {
                        toast.error('請先設定 AI API');
                        throw new Error('AI not configured');
                    }

                    const aiService = createAIService({
                        provider: aiConfig.provider as any,
                        model: aiConfig.model,
                        apiKey: aiConfig.api_key,
                        temperature: 0.3,
                        maxTokens: 8000
                    });

                    const featureAnalysisPrompt = `你是專業的系統分析師，請分析以下內容，識別出系統開發需要的功能模組。

輸入內容：
${parsedContent!.content.substring(0, 8000)}

請以 JSON 格式回傳：
{
  "project_summary": "專案摘要",
  "modules": [
    {
      "title": "功能模組名稱",
      "description": "功能說明",
      "priority": "high|medium|low",
      "parent_title": "父模組名稱（如果是子功能，否則留空）",
      "estimated_days": 0
    }
  ],
  "reasoning": "分析說明"
}`;

                    const responseText = await aiService.performAIQuery(featureAnalysisPrompt);

                    if (responseText) {
                        let analysis;
                        try {
                            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                            if (jsonMatch) {
                                analysis = JSON.parse(jsonMatch[0]);
                            }
                        } catch (e) {
                            console.error('JSON 解析失敗:', e);
                        }

                        if (analysis && analysis.modules && analysis.modules.length > 0) {
                            setStatusMessage('正在建立功能模組建議...');

                            const parentMap: Record<string, string> = {};

                            for (const mod of analysis.modules) {
                                if (!mod.parent_title || mod.parent_title === '') {
                                    const item = {
                                        project_id: currentProject.id,
                                        type: 'general' as const,
                                        title: mod.title,
                                        description: mod.description || '',
                                        status: 'suggestion' as const,
                                        priority: mod.priority || 'medium',
                                        meta: {
                                            isFeatureModule: true,
                                            ai_source: 'feature_analysis',
                                            estimated_days: mod.estimated_days,
                                            order: Date.now()
                                        }
                                    };

                                    const { data, error } = await storage.createItem(item as any);
                                    if (!error && data) {
                                        parentMap[mod.title] = data.id;
                                    }
                                }
                            }

                            for (const mod of analysis.modules) {
                                if (mod.parent_title && parentMap[mod.parent_title]) {
                                    const item = {
                                        project_id: currentProject.id,
                                        type: 'general' as const,
                                        title: mod.title,
                                        description: mod.description || '',
                                        status: 'suggestion' as const,
                                        priority: mod.priority || 'medium',
                                        parent_id: parentMap[mod.parent_title],
                                        meta: {
                                            isFeatureModule: true,
                                            ai_source: 'feature_analysis',
                                            estimated_days: mod.estimated_days,
                                            order: Date.now()
                                        }
                                    };

                                    await storage.createItem(item as any);
                                }
                            }

                            const moduleCount = analysis.modules.length;
                            const message = `📦 已識別出 ${moduleCount} 個功能模組！

${analysis.project_summary || ''}

識別的模組：
${analysis.modules.map((m: any) => `• ${m.title}${m.parent_title ? ` (子功能: ${m.parent_title})` : ''}`).join('\n')}

${analysis.reasoning || ''}

✅ 已將這些功能模組建議送至「收件匣」，請前往收件匣確認後，它們將出現在「任務清單 > 功能模組」中。`;

                            addMessage('assistant', message);
                            toast.success(`已建立 ${moduleCount} 個功能模組建議`);
                            // 讓用戶自己決定是否前往收件匣
                            // navigate('/inbox');
                        } else {
                            addMessage('assistant', '抱歉，無法從內容中識別出功能模組。請提供更明確的功能說明或模組列表。');
                        }
                    }
                    setTimeout(() => {
                        setIsAIProcessing(false);
                        setStatusMessage('');
                    }, 500);
                    return;
                }

                // 其他文件分析
                // 🎯 Smart Analysis for New File (Auto-trigger if content is relevant)
                if (await processSmartAnalysis(input || '', parsedContent?.content, artifactId)) {
                    // Handled by smart analysis
                } else {
                    await processDocumentAnalysis(input || '', {
                        file,
                        parsedContent: parsedContent!,
                        fileType,
                        storagePath: uploadData.storagePath,
                        fileUrl: uploadData.fileUrl,
                        fileSize: uploadData.fileSize,
                        artifactId
                    });
                }

                addMessage('assistant', '文件分析完成。');
                setTimeout(() => {
                    setIsAIProcessing(false);
                    setStatusMessage('');
                }, 500);
                return;
            }

            // 🔥 Step 2: 處理純文字輸入
            const planningKeywords = ['規劃', '幫我安排', '要做什麼', '分解', '拆解', '步驟', '計畫'];
            const featureModuleKeywords = ['功能模組', '模組清單', '功能列表', '系統功能', '開發清單'];
            const isPlanningRequest = input ? planningKeywords.some(keyword => input.includes(keyword)) : false;
            const isFeatureModuleRequest = input ? featureModuleKeywords.some(keyword => input.includes(keyword)) : false;

            // 🎯 建立功能模組處理
            if (input && (isFeatureModuleRequest || input.includes('建立功能模組'))) {
                setStatusMessage('AI 秘書正在分析功能模組...');
                const { data: aiConfig } = await storage.getSystemAIConfig();
                if (!aiConfig || !aiConfig.is_active) {
                    toast.error('請先設定 AI API');
                    throw new Error('AI not configured');
                }

                const aiService = createAIService({
                    provider: aiConfig.provider as any,
                    model: aiConfig.model,
                    apiKey: aiConfig.api_key,
                    temperature: 0.3,
                    maxTokens: 8000
                });

                // 構建功能模組分析 Prompt
                const featureAnalysisPrompt = `你是專業的系統分析師，請分析以下內容，識別出系統開發需要的功能模組。

輸入內容：
${pendingFile ? pendingFile.parsedContent.content.substring(0, 8000) : input}

請以 JSON 格式回傳：
{
  "project_summary": "專案摘要",
  "modules": [
    {
      "title": "功能模組名稱",
      "description": "功能說明",
      "priority": "high|medium|low",
      "parent_title": "父模組名稱（如果是子功能，否則留空）",
      "estimated_days": 0
    }
  ],
  "reasoning": "分析說明"
}`;

                try {
                    const responseText = await aiService.performAIQuery(featureAnalysisPrompt);

                    if (responseText) {
                        let analysis;
                        try {
                            // 嘗試解析 JSON
                            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                            if (jsonMatch) {
                                analysis = JSON.parse(jsonMatch[0]);
                            }
                        } catch (e) {
                            console.error('JSON 解析失敗:', e);
                        }

                        if (analysis && analysis.modules && analysis.modules.length > 0) {
                            // 建立功能模組建議（送入收件匣作為 suggestion）
                            setStatusMessage('正在建立功能模組建議...');

                            // 先建立父模組 map
                            const parentMap: Record<string, string> = {};

                            for (const mod of analysis.modules) {
                                if (!mod.parent_title || mod.parent_title === '') {
                                    // 建立頂層模組（送入收件匣作為 suggestion）
                                    const item = {
                                        project_id: currentProject.id,
                                        type: 'general' as const,
                                        title: mod.title,
                                        description: mod.description || '',
                                        status: 'suggestion' as const,
                                        priority: mod.priority || 'medium',
                                        meta: {
                                            isFeatureModule: true,
                                            ai_source: 'feature_analysis',
                                            estimated_days: mod.estimated_days,
                                            order: Date.now()
                                        }
                                    };

                                    const { data, error } = await storage.createItem(item as any);
                                    if (!error && data) {
                                        parentMap[mod.title] = data.id;
                                    }
                                }
                            }

                            // 再建立子模組
                            for (const mod of analysis.modules) {
                                if (mod.parent_title && parentMap[mod.parent_title]) {
                                    const item = {
                                        project_id: currentProject.id,
                                        type: 'general' as const,
                                        title: mod.title,
                                        description: mod.description || '',
                                        status: 'suggestion' as const,
                                        priority: mod.priority || 'medium',
                                        parent_id: parentMap[mod.parent_title],
                                        meta: {
                                            isFeatureModule: true,
                                            ai_source: 'feature_analysis',
                                            estimated_days: mod.estimated_days,
                                            order: Date.now()
                                        }
                                    };

                                    await storage.createItem(item as any);
                                }
                            }

                            const moduleCount = analysis.modules.length;
                            const message = `📦 已識別出 ${moduleCount} 個功能模組！

${analysis.project_summary || ''}

識別的模組：
${analysis.modules.map((m: any) => `• ${m.title}${m.parent_title ? ` (子功能: ${m.parent_title})` : ''}`).join('\n')}

${analysis.reasoning || ''}

✅ 已將這些功能模組建議送至「收件匣」，請前往收件匣確認後，它們將出現在「任務清單 > 功能模組」中。`;

                            addMessage('assistant', message);
                            toast.success(`已建立 ${moduleCount} 個功能模組建議`);
                            setPendingFile(null);
                            // 讓用戶自己決定是否前往收件匣
                            // navigate('/inbox');
                        } else {
                            addMessage('assistant', '抱歉，無法從內容中識別出功能模組。請提供更明確的功能說明或模組列表。');
                        }
                    }
                } catch (e) {
                    console.error('功能模組分析失敗:', e);
                    addMessage('assistant', '分析功能模組時發生錯誤，請稍後再試。');
                }

                setTimeout(() => {
                    setIsAIProcessing(false);
                    setStatusMessage('');
                }, 500);
                return;
            }

            if (isPlanningRequest) {
                setStatusMessage('AI 秘書正在為您規劃專案任務...');
                const { data: aiConfig } = await storage.getSystemAIConfig();
                if (!aiConfig || !aiConfig.is_active) {
                    toast.error('請先設定 AI API');
                    throw new Error('AI not configured');
                }

                const aiService = createAIService({
                    provider: aiConfig.provider as any,
                    model: aiConfig.model,
                    apiKey: aiConfig.api_key,
                    temperature: 0.5,
                    maxTokens: 8000
                });

                const planResult = await aiService.planTasks(input || '', {
                    projectName: currentProject.name,
                    teamMembers: members.map(m => m.name)
                });

                if (!planResult.success || !planResult.tasks || planResult.tasks.length === 0) {
                    toast.error(planResult.error || 'AI 規劃失敗');
                    addMessage('assistant', `規劃失敗: ${planResult.error}`);
                } else {
                    const suggestions: TaskSuggestion[] = planResult.tasks.map((task, index) => ({
                        id: `plan-${Date.now()}-${index}`,
                        title: task.title,
                        description: task.description,
                        due_date: task.due_date,
                        priority: task.priority,
                        type: task.type,
                        selected: true
                    }));

                    setStatusMessage('規劃完成！準備顯示建議...');
                    const message = planResult.suggestion_message || '以下是我為您規劃的任務清單，請檢視並調整：';

                    setTaskPreview({
                        tasks: suggestions,
                        aiMessage: message
                    });

                    // Add AI Message to chat
                    addMessage('assistant', message);
                }
            } else {
                // General Chat (using direct AI Query with context)
                const { data: aiConfig } = await storage.getSystemAIConfig();

                if (aiConfig && aiConfig.is_active) {
                    // 🔥 RAG Retrieval: Search Knowledge Base
                    setStatusMessage('正在搜尋專案知識庫...');
                    let knowledgeContext = '';
                    let references: any[] = [];

                    try {
                        console.log('🔍 [AI Chat Debug] Querying Knowledge Base...', { query: input, projectId: currentProject.id });

                        // Lower threshold to 0.3 for debugging
                        const searchRes = await storage.queryKnowledgeBase(input || '', currentProject.id, 0.3);

                        console.log('🔍 [AI Chat Debug] Search Result:', searchRes);

                        if (searchRes.data && searchRes.data.documents && searchRes.data.documents.length > 0) {
                            references = searchRes.data.documents;
                            // 只取前 3 個最相關的結果，避免 Prompt 過長
                            const validDocs = references.slice(0, 3);

                            if (validDocs.length > 0) {
                                knowledgeContext = `
【參考知識庫內容】：
${validDocs.map((doc, i) => `文件 ${i + 1}: ${doc.content.substring(0, 500)}... (來源: ${doc.metadata?.fileName || '未知'})`).join('\n\n')}
`;
                                console.log('✅ [AI Chat Debug] Found relevant docs:', validDocs.length);
                            }
                        } else {
                            console.warn('⚠️ [AI Chat Debug] No relevant documents found (empty result).');
                        }
                    } catch (e) {
                        console.error('❌ [AI Chat Debug] RAG Search failed:', e);
                    }

                    setStatusMessage('AI 正在思考...');

                    const aiService = createAIService({
                        provider: aiConfig.provider as any,
                        model: aiConfig.model,
                        apiKey: aiConfig.api_key,
                        maxTokens: 8000
                    });

                    // Build Context from Items - limit to 10 most recent tasks for performance
                    const limitedItems = items?.slice(0, 10) || [];
                    const taskSummary = limitedItems.length > 0
                        ? limitedItems.map((t: any) => `- ${t.title || '未命名任務'} (${t.status || '未知狀態'})`).join('\n')
                        : '目前沒有任務。';
                    const taskCountNote = items && items.length > 10 ? `\n(顯示前10項，共${items.length}項任務)` : '';

                    const systemPrompt = `你是專業的專案經理 AI 助手。
目前專案「${currentProject.name}」的任務狀態如下：
${taskSummary}${taskCountNote}

${knowledgeContext ? knowledgeContext : ''}

請根據以上資訊簡潔回答使用者的問題。${knowledgeContext ? `回答時請務必並優先參考上述【參考知識庫內容】中的資訊來回答，並在回答中明確指出引用的文件名稱。` : '如果資訊不足，請禮貌告知。'}
注意：請以繁體中文自然語言回答，不要使用 JSON 格式。回答請盡量精簡。`;

                    console.log('📝 [AI Chat Debug] RAG Context:', knowledgeContext);
                    console.log('🤖 [AI Chat Debug] System Prompt:', systemPrompt);

                    try {
                        const responseText = await aiService.performAIQuery(input || '', systemPrompt);

                        if (responseText) {
                            // Handle JSON-wrapped responses (due to Edge Function json mode)
                            let cleanResponse = responseText;
                            if (responseText.trim().startsWith('{')) {
                                try {
                                    const parsed = JSON.parse(responseText);
                                    // Extract text from common JSON fields
                                    cleanResponse = parsed.note || parsed.message || parsed.content || parsed.text || parsed.response || JSON.stringify(parsed);
                                } catch {
                                    // Not valid JSON, use as-is
                                    cleanResponse = responseText;
                                }
                            }
                            addMessage('assistant', cleanResponse, references);
                        }
                    } catch (e) {
                        console.error('AI Query Error:', e);
                        addMessage('assistant', '抱歉，我無法處理您的請求。');
                    }
                } else {
                    console.warn('⚠️ AI Config is not active or null');
                    addMessage('assistant', '請先在設定中配置 AI API。');
                }
            }
        } catch (err) {
            console.error('AI Processing Error:', err);
            toast.error('處理失敗');
            addMessage('assistant', '抱歉，發生錯誤，請稍後再試。');
        } finally {
            setTimeout(() => {
                setIsAIProcessing(false);
                setStatusMessage('');
            }, 500);
        }
    };

    return {
        handleAIInput,
        handleFileUpload,
        isAIProcessing,
        statusMessage,
        aiSuggestions,
        chat: { messages, addMessage }
    };
};
