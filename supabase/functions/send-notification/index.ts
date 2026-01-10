import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts"

const GMAIL_USER = Deno.env.get('GMAIL_USER')
const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD')

interface EmailRequest {
  to: string
  type: 'new_task' | 'task_assigned' | 'task_updated'
  project: string
  title: string
  due: string
  url: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 英文框架模板（避免編碼問題），動態資料會是中文
const templates = {
  new_task: {
    subject: (p: string) => `[AI Project] ${p} - New Task`,
    body: (data: EmailRequest) => `<html><head><meta charset="UTF-8"></head><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px 8px 0 0;"><h2 style="color: white; margin: 0;">New Task Assigned</h2></div><div style="background: #fff; border: 1px solid #e0e0e0; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;"><p>You have been assigned a new task:</p><table style="width: 100%; margin: 15px 0; border-collapse: collapse;"><tr><td style="padding: 8px 0; color: #666; width: 80px;">Project</td><td style="padding: 8px 0; font-weight: bold;">${data.project}</td></tr><tr><td style="padding: 8px 0; color: #666;">Task</td><td style="padding: 8px 0; font-weight: bold;">${data.title}</td></tr><tr><td style="padding: 8px 0; color: #666;">Due</td><td style="padding: 8px 0;">${data.due}</td></tr></table><div style="margin-top: 20px;"><a href="${data.url}" style="display: inline-block; background: #667eea; color: white; padding: 10px 24px; text-decoration: none; border-radius: 5px;">View Task</a></div><p style="color: #888; font-size: 12px; margin-top: 25px;">Sent by AI Project Secretary</p></div></body></html>`
  },
  task_assigned: {
    subject: (p: string) => `[AI Project] ${p} - Task Assigned`,
    body: (data: EmailRequest) => `<html><head><meta charset="UTF-8"></head><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 8px 8px 0 0;"><h2 style="color: white; margin: 0;">Task Assigned to You</h2></div><div style="background: #fff; border: 1px solid #e0e0e0; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;"><p>You have been assigned to the following task:</p><table style="width: 100%; margin: 15px 0; border-collapse: collapse;"><tr><td style="padding: 8px 0; color: #666; width: 80px;">Project</td><td style="padding: 8px 0; font-weight: bold;">${data.project}</td></tr><tr><td style="padding: 8px 0; color: #666;">Task</td><td style="padding: 8px 0; font-weight: bold;">${data.title}</td></tr><tr><td style="padding: 8px 0; color: #666;">Due</td><td style="padding: 8px 0;">${data.due}</td></tr></table><div style="margin-top: 20px;"><a href="${data.url}" style="display: inline-block; background: #f5576c; color: white; padding: 10px 24px; text-decoration: none; border-radius: 5px;">View Task</a></div><p style="color: #888; font-size: 12px; margin-top: 25px;">Sent by AI Project Secretary</p></div></body></html>`
  },
  task_updated: {
    subject: (p: string) => `[AI Project] ${p} - Task Updated`,
    body: (data: EmailRequest) => `<html><head><meta charset="UTF-8"></head><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 8px 8px 0 0;"><h2 style="color: white; margin: 0;">Task Has Been Updated</h2></div><div style="background: #fff; border: 1px solid #e0e0e0; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;"><p>A task assigned to you has been updated:</p><table style="width: 100%; margin: 15px 0; border-collapse: collapse;"><tr><td style="padding: 8px 0; color: #666; width: 80px;">Project</td><td style="padding: 8px 0; font-weight: bold;">${data.project}</td></tr><tr><td style="padding: 8px 0; color: #666;">Task</td><td style="padding: 8px 0; font-weight: bold;">${data.title}</td></tr><tr><td style="padding: 8px 0; color: #666;">Due</td><td style="padding: 8px 0;">${data.due}</td></tr></table><div style="margin-top: 20px;"><a href="${data.url}" style="display: inline-block; background: #4facfe; color: white; padding: 10px 24px; text-decoration: none; border-radius: 5px;">View Task</a></div><p style="color: #888; font-size: 12px; margin-top: 25px;">Sent by AI Project Secretary</p></div></body></html>`
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const data: EmailRequest = await req.json()
    console.log(`📧 Sending ${data.type} email to: ${data.to}`)

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      throw new Error('Gmail credentials not configured')
    }

    const template = templates[data.type]
    if (!template) {
      throw new Error(`Unknown email type: ${data.type}`)
    }

    const subject = template.subject(data.project)
    const html = template.body(data)

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: GMAIL_USER,
          password: GMAIL_APP_PASSWORD.replace(/\s/g, ''),
        },
      },
    })

    await client.send({
      from: GMAIL_USER,
      to: data.to,
      subject: subject,
      content: "auto",
      html: html,
    })

    await client.close()
    console.log(`✅ Email sent to ${data.to}`)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
