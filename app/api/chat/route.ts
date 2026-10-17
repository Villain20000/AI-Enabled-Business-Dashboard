/**
 * AI Chat API Route
 *
 * This API endpoint handles natural language queries about business data.
 * It uses Google Gemini AI to generate responses based on the provided context.
 *
 * Security hardening: CSRF check, IP-based rate limiting, org auth (ai:use),
 * feature gating (nlq), daily AI call limits, zod input validation, and
 * sanitization of AI output.
 *
 * @module ChatAPI
 * @description POST endpoint for natural language queries to AI assistant
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/route-handlers
 * @see https://ai.google.dev/docs
 */

import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOrgApi } from '@/lib/auth/requireOrg';
import { supabaseServer } from '@/lib/supabase/server';
import { checkFeature, checkAiCallLimit } from '@/lib/billing/limits';
import { recordUsage } from '@/lib/usage';
import { rateLimit, getClientIp } from '@/lib/security/rate-limit';
import { checkCsrf } from '@/lib/security/csrf';
import { stripDangerousHtml } from '@/lib/security/sanitize';

/** Zod schema validating the chat request body. */
const ChatSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().uuid().optional(),
  // Accepted for backwards compatibility but deliberately ignored: the server
  // fetches the org's own rows so a caller cannot forge another tenant's data.
  contextData: z.unknown().optional(),
});

/**
 * POST Handler for AI Chat
 *
 * Processes user messages and generates AI responses based on the provided
 * business data context. The AI acts as a Business Intelligence Assistant
 * for a pharmaceutical company.
 *
 * @param {Request} req - The incoming HTTP request containing message and context data
 * @returns {Promise<NextResponse>} JSON response with AI-generated text or error
 */
export async function POST(req: Request) {
  // 1. CSRF protection
  const csrfErr = checkCsrf(req);
  if (csrfErr) return csrfErr;

  // 2. IP-based rate limiting
  const ip = getClientIp(req);
  const rl = rateLimit({ key: 'ai:chat', identifier: ip, limit: 20, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'x-ratelimit-remaining': String(rl.remaining) } },
    );
  }

  // 3. Organization authentication (requires ai:use permission)
  const auth = await requireOrgApi('ai:use');
  if ('error' in auth) return auth.error;

  // 4. Feature gating: NLQ access
  const allowed = await checkFeature(auth.ctx.orgId, 'nlq');
  if (!allowed) {
    return NextResponse.json(
      { error: 'Natural language queries are not available on your plan. Please upgrade to access AI chat.' },
      { status: 403 },
    );
  }

  // 5. Daily AI call limit
  const limit = await checkAiCallLimit(auth.ctx.orgId);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Daily AI call limit reached', used: limit.used, limit: limit.limit },
      { status: 429 },
    );
  }

  // 6. Parse + validate body
  let parsed: z.infer<typeof ChatSchema>;
  try {
    parsed = ChatSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { message } = parsed;

  // 7. Resolve or create a persisted conversation. RLS ensures the caller can
  // only read/write their own conversations within this org.
  const supabase = await supabaseServer();
  let conversationId = parsed.conversationId;
  if (conversationId) {
    const { data: existing } = await supabase
      .from('ai_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('org_id', auth.ctx.orgId)
      .maybeSingle();
    if (!existing) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
  } else {
    const { data: created, error: createError } = await supabase
      .from('ai_conversations')
      .insert({
        org_id: auth.ctx.orgId,
        user_id: auth.ctx.userId,
        title: message.slice(0, 80),
      })
      .select('id')
      .single();
    if (createError || !created) {
      return NextResponse.json({ error: 'Could not start a conversation' }, { status: 500 });
    }
    conversationId = created.id as string;
  }

  await supabase.from('ai_messages').insert({
    conversation_id: conversationId,
    role: 'user',
    content: message,
  });

  // 8. Fetch the current org's data server-side. RLS scopes these queries; the
  // client no longer supplies context that could be forged.
  const [{ data: sales }, { data: inventory }, { data: kpis }] = await Promise.all([
    supabase.from('sales_data').select('*').eq('org_id', auth.ctx.orgId),
    supabase.from('inventory_data').select('*').eq('org_id', auth.ctx.orgId),
    supabase.from('kpis').select('*').eq('org_id', auth.ctx.orgId),
  ]);
  const contextData = { sales: sales ?? [], inventory: inventory ?? [], kpis: kpis ?? [] };

  // 9. Build prompt + call Gemini
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY,
  });
  const prompt = `
    You are an AI Business Intelligence Assistant for a business intelligence dashboard.
    The user is asking a question about their organization's data.
    Here is the current data context:
    ${JSON.stringify(contextData)}

    User Question: "${message}"

    Provide a concise, professional answer based ONLY on the provided data.
    If the user asks for a SQL query, provide a simulated PostgreSQL query that would fetch this data from a hypothetical Supabase database.
    Format your response in Markdown.
  `;

  let text: string;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    text = response.text ?? '';
  } catch (error) {
    console.error('AI Chat Error:', error);
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }

  const safeText = stripDangerousHtml(text);

  // 10. Persist the assistant reply and meter usage.
  await supabase.from('ai_messages').insert({
    conversation_id: conversationId,
    role: 'assistant',
    content: safeText,
  });
  await supabase
    .from('ai_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);
  await recordUsage(auth.ctx.orgId, 'ai_call');

  // 11. Return the sanitized output plus the conversation id for follow-ups.
  return NextResponse.json({ text: safeText, conversationId });
}
