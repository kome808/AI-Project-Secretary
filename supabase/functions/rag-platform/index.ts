
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
        const path = url.pathname.split('/').pop(); // "embed" or "query"

        // Initialize Supabase Client for public schema operations (embeddings)
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

        // Fetch API Key dynamically using helper
        const OPENAI_API_KEY = await getOpenAIKey(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

        // 1. EMBED Route: Vectorize and Store
        if (path === 'embed') {
            const { content, source_id, source_type, project_id, metadata } = await req.json();

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
        if (path === 'query') {
            const { query, project_id, threshold = 0.5, match_count = 5 } = await req.json();

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

            // Call RPC Function
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

        throw new Error('Invalid endpoint. Use /embed or /query');

    } catch (error) {
        console.error('RAG Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
