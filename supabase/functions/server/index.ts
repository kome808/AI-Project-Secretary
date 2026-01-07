import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("*/health", (c) => {
  return c.json({ status: "ok", path: c.req.path });
});

// Invite Member endpoint - Handle both /invite and /server/invite
app.post("*/invite", async (c) => {
  try {
    const body = await c.req.json();
    const { email, redirectTo } = body;

    if (!email) {
      return c.json({ error: 'Missing email' }, 400);
    }

    // Initialize Supabase Admin Client
    // SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are automatically available in Edge Functions
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase keys in environment variables');
      return c.json({ error: 'Server configuration error' }, 500);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Invoke Supabase Auth Admin Invite
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirectTo || undefined
    });

    if (error) {
      console.error('Supabase Auth Invite Error:', error);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ data });
  } catch (error) {
    console.error('Invite Member Proxy error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Delete User endpoint - 刪除 Supabase Auth 使用者
// Handle both /delete-user and /server/delete-user
app.post("*/delete-user", async (c) => {
  try {
    const body = await c.req.json();
    const { userId, email } = body;

    if (!userId) {
      return c.json({ error: 'Missing userId' }, 400);
    }

    // Initialize Supabase Admin Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase keys in environment variables');
      return c.json({ error: 'Server configuration error' }, 500);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 安全檢查：確認該使用者在 members 表中沒有任何記錄
    // 這是為了防止誤刪還在使用中的帳號
    const { data: memberCheck, error: checkError } = await supabaseAdmin
      .schema('aiproject')
      .from('members')
      .select('id')
      .eq('email', email);

    if (checkError) {
      console.error('Member check error:', checkError);
      // 繼續執行，因為可能是 schema 不存在等問題
    }

    if (memberCheck && memberCheck.length > 0) {
      console.log(`安全檢查失敗：使用者 ${email} 仍有 ${memberCheck.length} 個專案成員記錄`);
      return c.json({ error: 'User still has project memberships' }, 400);
    }

    // 刪除 Auth 使用者
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      console.error('Supabase Auth Delete Error:', error);
      return c.json({ error: error.message }, 400);
    }

    console.log(`✅ 成功刪除 Auth 使用者: ${email} (${userId})`);
    return c.json({ success: true, message: `User ${email} deleted` });
  } catch (error) {
    console.error('Delete User Proxy error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// AI Proxy endpoint - 代理 OpenAI API 呼叫
app.post("/make-server-4df51a95/ai/chat", async (c) => {
  try {
    const body = await c.req.json();
    const { provider, model, apiKey, messages, temperature, maxTokens } = body;

    if (!provider || !model || !apiKey || !messages) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    let result;

    if (provider === 'openai') {
      // 呼叫 OpenAI API
      // 注意：
      // 1. 新版 GPT-4 模型使用 max_completion_tokens 而非 max_tokens
      // 2. 某些模型（如 gpt-4o）不支援自訂 temperature，只能使用預設值

      // 判斷是否為推理模型 (Reasoning Model) - 如 o1, o3-mini
      // 這些模型參數行為與 GPT-4o 不同
      const isReasoningModel = model.startsWith('o1') || model.startsWith('o3');

      // 建立請求 body
      const requestBody: any = {
        model,
        messages
      };

      // 1. 處理 Token 限制參數
      // Reasoning Models 使用 max_completion_tokens，其他使用 max_tokens
      if (isReasoningModel) {
        requestBody.max_completion_tokens = maxTokens || 2000;
      } else {
        requestBody.max_tokens = maxTokens || 1000;
      }

      // 2. 處理 Response Format
      // Reasoning Models 建議由 Prompt 控制格式，強制設定 json_object 可能導致錯誤或被拒
      // 一般模型則使用 json_object 確保輸出穩定
      if (!isReasoningModel) {
        requestBody.response_format = { type: 'json_object' };
      }

      // 3. 處理 Temperature
      // Reasoning Models 通常不支援 temperature (固定為 1)
      if (!isReasoningModel && temperature !== undefined) {
        requestBody.temperature = temperature;
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        let errorDetails = 'Unknown error';
        try {
          const errorJson = await response.json();
          errorDetails = JSON.stringify(errorJson);
        } catch (e) {
          errorDetails = await response.text();
        }
        console.log('OpenAI API Error:', errorDetails);
        return c.json({ error: `OpenAI API Error: ${errorDetails}` }, response.status);
      }

      result = await response.json();
    } else if (provider === 'anthropic') {
      // 呼叫 Anthropic API
      const systemMessage = messages.find((m: any) => m.role === 'system');
      const userMessages = messages.filter((m: any) => m.role !== 'system');

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          system: systemMessage?.content || '',
          messages: userMessages,
          temperature: temperature || 0.3,
          max_tokens: maxTokens || 1000 // Anthropic 仍使用 max_tokens
        })
      });

      if (!response.ok) {
        let errorDetails = 'Unknown error';
        try {
          const errorJson = await response.json();
          errorDetails = JSON.stringify(errorJson);
        } catch (e) {
          errorDetails = await response.text();
        }
        console.log('Anthropic API Error:', errorDetails);
        return c.json({ error: `Anthropic API Error: ${errorDetails}` }, response.status);
      }

      const anthropicResult = await response.json();

      // 標準化回應格式：將 Anthropic 格式轉換為 OpenAI 格式
      // 這樣前端 DashboardPage.tsx 就可以統一使用 choices[0].message.content 處理

      // 尋找類型為 text 的區塊，若無則嘗試取第一個區塊的 text 屬性（兼容舊行為）
      // 注意：Anthropic 可能回傳 tool_use 或 thinking 區塊，必須過濾出 text
      const textBlock = anthropicResult.content?.find((block: any) => block.type === 'text');
      const contentText = textBlock?.text || anthropicResult.content?.[0]?.text || '';

      result = {
        id: anthropicResult.id || 'anthropic-mock-id',
        object: 'chat.completion',
        created: Date.now(),
        model: anthropicResult.model || model,
        choices: [
          {
            index: 0,
            message: {
              role: anthropicResult.role || 'assistant',
              content: contentText
            },
            finish_reason: anthropicResult.stop_reason || 'stop'
          }
        ],
        usage: {
          prompt_tokens: anthropicResult.usage?.input_tokens || 0,
          completion_tokens: anthropicResult.usage?.output_tokens || 0,
          total_tokens: (anthropicResult.usage?.input_tokens || 0) + (anthropicResult.usage?.output_tokens || 0)
        }
      };
    } else {
      return c.json({ error: `Unsupported provider: ${provider}` }, 400);
    }

    return c.json(result);
  } catch (error) {
    console.log('AI Proxy error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// AI Vision endpoint - 代理 OpenAI Vision API 呼叫（用於 WBS 圖片解析）
app.post("/make-server-4df51a95/ai/vision", async (c) => {
  try {
    const body = await c.req.json();
    const { provider, model, apiKey, systemPrompt, userText, imageBase64, maxTokens } = body;

    if (!provider || !model || !apiKey || !systemPrompt || !userText || !imageBase64) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    let result;

    if (provider === 'openai') {
      // 呼叫 OpenAI Vision API（多模態）
      // 使用系統設定的模型版本，而非寫死 gpt-4o
      const requestBody: any = {
        model: model, // 使用傳入的模型版本
        messages: [
          {
            role: 'system',
            content: `${systemPrompt}\n\n請以 JSON 格式回應。`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: userText },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
              }
            ]
          }
        ],
        max_completion_tokens: maxTokens || 2000,
        response_format: { type: 'json_object' }
      };

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        let errorDetails = 'Unknown error';
        try {
          const errorJson = await response.json();
          errorDetails = JSON.stringify(errorJson);
        } catch (e) {
          errorDetails = await response.text();
        }
        console.log('OpenAI Vision API Error:', errorDetails);
        return c.json({ error: `OpenAI Vision API Error: ${errorDetails}` }, response.status);
      }

      result = await response.json();
    } else if (provider === 'anthropic') {
      // 呼叫 Anthropic Vision API（多模態）
      // Anthropic 使用不同的圖片格式
      const requestBody: any = {
        model: model, // 使用傳入的模型版本
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: userText },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: imageBase64
                }
              }
            ]
          }
        ],
        max_tokens: maxTokens || 2000
      };

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        let errorDetails = 'Unknown error';
        try {
          const errorJson = await response.json();
          errorDetails = JSON.stringify(errorJson);
        } catch (e) {
          errorDetails = await response.text();
        }
        console.log('Anthropic Vision API Error:', errorDetails);
        return c.json({ error: `Anthropic Vision API Error: ${errorDetails}` }, response.status);
      }

      // Anthropic 的回應格式需要轉換為 OpenAI 格式
      const anthropicResult = await response.json();
      result = {
        choices: [
          {
            message: {
              content: anthropicResult.content[0].text
            }
          }
        ]
      };
    } else {
      return c.json({ error: `Vision API only supports OpenAI and Anthropic providers currently` }, 400);
    }

    return c.json(result);
  } catch (error) {
    console.log('AI Vision Proxy error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

Deno.serve(app.fetch);