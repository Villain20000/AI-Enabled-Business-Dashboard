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
import { checkFeature, checkAiCallLimit } from '@/lib/billing/limits';
import { recordUsage } from '@/lib/usage';
import { rateLimit, getClientIp } from '@/lib/security/rate-limit';
import { checkCsrf } from '@/lib/security/csrf';
import { stripDangerousHtml } from '@/lib/security/sanitize';

/** Zod schema validating the chat request body. */
const ChatSchema = z.object({
  message: z.string().min(1).max(2000),
  contextData: z.unknown(),
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
  const { message, contextData } = parsed;

  // 7. Build prompt + call Gemini
  const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
  const prompt = `
    You are an AI Business Intelligence Assistant for a pharmaceutical company (like Pfizer).
    The user is asking a question about their data.
    Here is the current data context (mocked database state):
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

  // 8. Meter usage
  await recordUsage(auth.ctx.orgId, 'ai_call');

  // 9. Sanitize AI output before returning
  return NextResponse.json({ text: stripDangerousHtml(text) });
}
