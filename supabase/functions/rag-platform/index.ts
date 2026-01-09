
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

// CORS Headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Helper to get OpenAI Key from DB
async function getOpenAIKey(url: string, key: string) {
    // Create a specific client for 'aiproject' schema
    const client = createClient(url, key, {
        db: { schema: 'aiproject' }
    });

    const { data, error } = await client
        .from('system_ai_config')
        .select('api_key')
        .eq('is_active', true)
        .maybeSingle();

    if (error || !data || !data.api_key) {
        console.error('API Key Fetch Error:', error);
        throw new Error('OpenAI API Key not found in system settings.');
    }
    return data.api_key;
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);

        // Initialize Supabase Client with aiproject schema
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
            db: { schema: 'aiproject' }
        });

        // Fetch API Key dynamically
        const OPENAI_API_KEY = await getOpenAIKey(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

        // Parse Request Body ONCE (supports both path-based and body-based routing)
        let body;
        try {
            body = await req.json();
        } catch (e) {
            throw new Error('Invalid JSON body');
        }

        // Determine Action: Prefer 'action' in body, fallback to URL path suffix
        const pathSuffix = url.pathname.split('/').pop();
        const action = body.action || pathSuffix;

        console.log(`🚀 Request Action: ${action} (Path: ${pathSuffix})`);

        // 1. EMBED Route: Vectorize and Store
        if (action === 'embed') {
            const { content, source_id, source_type, project_id, metadata } = body;

            if (!content || !source_id || !source_type || !project_id) {
                throw new Error('Missing required fields: content, source_id, source_type, project_id');
            }

            // Call OpenAI Embedding API
            const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'text-embedding-3-small',
                    input: content.replaceAll('\n', ' '), // Normalize text
                }),
            });

            const embeddingData = await embeddingResponse.json();
            if (embeddingData.error) {
                throw new Error(`OpenAI Error: ${embeddingData.error.message}`);
            }

            const embedding = embeddingData.data[0].embedding;

            // Store in DB
            const { error } = await supabase.from('embeddings').insert({
                project_id,
                source_id,
                source_type,
                content,
                metadata,
                embedding,
            });

            if (error) throw error;

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 2. QUERY Route: Search similar documents
        if (action === 'query') {
            const { query, project_id, threshold = 0.5, match_count = 5, search_type = 'documents' } = body;

            if (!query || !project_id) {
                throw new Error('Missing required fields: query, project_id');
            }

            // Generate Query Vector
            const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'text-embedding-3-small',
                    input: query.replaceAll('\n', ' '),
                }),
            });

            const embeddingData = await embeddingResponse.json();
            if (embeddingData.error) {
                throw new Error(`OpenAI Error: ${embeddingData.error.message}`);
            }

            const queryVector = embeddingData.data[0].embedding;

            // Determine which RPC to call based on search_type
            if (search_type === 'tasks') {
                // Call match_tasks RPC
                const { data: tasks, error } = await supabase.rpc('match_tasks', {
                    query_embedding: queryVector,
                    match_threshold: threshold,
                    match_count: match_count,
                    project_id: project_id,
                });

                if (error) throw error;

                // Map result to common document format or return raw
                return new Response(JSON.stringify({ documents: tasks }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });

            } else {
                // Default: Call match_documents RPC (existing logic)
                const { data: documents, error } = await supabase.rpc('match_documents', {
                    query_embedding: queryVector,
                    match_threshold: threshold,
                    match_count: match_count,
                    filter_project_id: project_id,
                });

                if (error) throw error;

                return new Response(JSON.stringify({ documents }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }
        }

        // 3. EMBED TASK Route
        if (action === 'embed-task') {
            const { task_id, title, description, project_id } = body;

            if (!task_id || !title || !project_id) {
                throw new Error('Missing required fields for task embedding');
            }

            const contentToEmbed = `${title}\n${description || ''}`;

            // Call OpenAI
            const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'text-embedding-3-small',
                    input: contentToEmbed.replaceAll('\n', ' '),
                }),
            });

            const embeddingData = await embeddingResponse.json();
            if (embeddingData.error) {
                throw new Error(`OpenAI Error: ${embeddingData.error.message}`);
            }
            const embedding = embeddingData.data[0].embedding;

            // Update items table directly
            const { error } = await supabase
                .from('items')
                .update({ embedding })
                .eq('id', task_id)
                .eq('project_id', project_id);

            if (error) throw error;

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 4. ANALYZE DOCUMENT Route (Phase 3 Expanded)
        if (action === 'analyze-document') {
            const { content, project_id, document_type: overrideDocType } = body;

            if (!content || !project_id) {
                throw new Error('Missing content or project_id for analysis');
            }

            console.log(`📄 Analyzing document for project: ${project_id} (Length: ${content.length})`);

            // --- Step 1: Detect Document Type ---
            let docType = overrideDocType;
            if (!docType) {
                const typeResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [
                            { role: 'system', content: 'Identify document type: meeting_notes, requirements, contract, technical, communication, design, or general. Return JSON: {"type": "..."}' },
                            { role: 'user', content: content.substring(0, 1000) }
                        ],
                        response_format: { type: "json_object" }
                    }),
                });
                const typeData = await typeResponse.json();
                docType = JSON.parse(typeData.choices[0].message.content).type || 'general';
            }
            console.log(`📌 Document Type Identified: ${docType}`);

            // --- Step 2: Semantic Chunking ---
            const chunks = semanticChunking(content);
            console.log(`🔪 Split into ${chunks.length} chunks`);

            const analysisChunks = [];
            const CHUNK_LIMIT = 10; // Avoid timeout, process first 10 meaningful chunks
            const processedChunks = chunks.slice(0, CHUNK_LIMIT);

            // --- Step 3: Process Chunks (Parallel-ish) ---
            for (let i = 0; i < processedChunks.length; i++) {
                const chunkText = processedChunks[i];
                if (chunkText.trim().length < 20) continue; // Skip too short chunks

                // 3a. Generate Embedding for Chunk pre-filtering
                const embedding = await generateEmbedding(chunkText, OPENAI_API_KEY);

                // 3b. Call RPC for candidate tasks
                const { data: candidates, error: rpcError } = await supabase.rpc('match_tasks', {
                    query_embedding: embedding,
                    project_id: project_id,
                    match_count: 5,
                    match_threshold: 0.3
                });

                if (rpcError) {
                    console.error('RPC Error:', rpcError);
                }

                // 3c. LLM Refined Mapping
                const prompt = `
Segment of Document:
"${chunkText}"

Existing Tasks (Candidate Matches):
${JSON.stringify(candidates || [])}

Goal:
Analyze the segment and determine if it maps to an existing task or suggests a new one.

Output JSON:
{
  "action": "map_existing" | "create_new" | "append_spec" | "ignore",
  "targetTaskId": "uuid" | null,
  "extractedTitle": "Brief title",
  "extractedDescription": "Detail content",
  "category": "action" | "decision" | "todo" | "rule" | "cr",
  "confidence": 0.0-1.0,
  "reasoning": "Why",
  "riskLevel": "high" | "medium" | "low"
}
`;
                const mappingResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [
                            { role: 'system', content: 'You are a PM Assistant. Output valid JSON only.' },
                            { role: 'user', content: prompt }
                        ],
                        response_format: { type: "json_object" },
                        temperature: 0.1
                    }),
                });

                const mappingData = await mappingResponse.json();
                const mappingResult = JSON.parse(mappingData.choices[0].message.content);

                analysisChunks.push({
                    id: crypto.randomUUID(),
                    originalText: chunkText,
                    sourceLocation: `Section ${i + 1}`,
                    candidateTasks: candidates || [],
                    mappingResult
                });
            }

            // --- Step 4: Summary calculation ---
            const summary = {
                totalItems: analysisChunks.length,
                newItems: analysisChunks.filter(c => c.mappingResult?.action === 'create_new').length,
                mappedItems: analysisChunks.filter(c => c.mappingResult?.action === 'map_existing').length,
                appendedSpecs: analysisChunks.filter(c => c.mappingResult?.action === 'append_spec').length,
                criticalRisks: analysisChunks.filter(c => c.mappingResult?.riskLevel === 'high').length
            };

            return new Response(JSON.stringify({
                document_type: docType,
                chunks: analysisChunks,
                summary
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        throw new Error(`Invalid action: ${action}`);

    } catch (error) {
        console.error('RAG Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});

/**
 * Helper: Generate Embedding
 */
async function generateEmbedding(text: string, apiKey: string) {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: text.replaceAll('\n', ' '),
        }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.data[0].embedding;
}

/**
 * Helper: Simple Section-based Chunking
 */
function semanticChunking(content: string) {
    const lines = content.split('\n');
    const chunks: string[] = [];
    let currentChunk: string[] = [];

    // Simple pattern for titles: "1. ", "1.1 ", "■ ", "● ", or all caps short lines
    const titlePattern = /^(\d+(\.\d+)*\.?|[一二三四五六七八九十]+、|[\(（][\d一二三五六七八九十]+[\)）]|[■●◆▪])\s+/;

    for (const line of lines) {
        const trimmed = line.trim();
        if (titlePattern.test(trimmed) && currentChunk.length > 3) {
            chunks.push(currentChunk.join('\n'));
            currentChunk = [line];
        } else {
            currentChunk.push(line);
        }
    }

    if (currentChunk.length > 0) {
        chunks.push(currentChunk.join('\n'));
    }

    // If chunks are too few/big, split by size secondary
    const finalChunks: string[] = [];
    for (const chunk of chunks) {
        if (chunk.length > 2000) {
            for (let i = 0; i < chunk.length; i += 1800) {
                finalChunks.push(chunk.substring(i, i + 2000));
            }
        } else {
            finalChunks.push(chunk);
        }
    }

    return finalChunks;
}

