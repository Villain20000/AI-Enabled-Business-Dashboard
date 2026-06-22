/**
 * Public v1 Insights API — POST /api/v1/insights
 *
 * Accepts a natural-language question about the org's data and returns an
 * AI-generated answer (Gemini). Authenticated via Bearer API key. The org's
 * KPI/sales/inventory data is injected as context so answers are grounded in
 * the caller's own data.
 *
 * @module api/v1/insights
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import { authenticateApiKey } from '@/lib/auth/apiKeyAuth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { recordUsage } from '@/lib/usage';
import { rateLimit } from '@/lib/security/rate-limit';
import { checkFeature, checkAiCallLimit } from '@/lib/billing/limits';
import { stripDangerousHtml } from '@/lib/security/sanitize';

/** Shared CORS headers applied to every response. */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** Request body schema — a single non-empty question (<=2000 chars). */
const BodySchema = z.object({
  question: z.string().min(1).max(2000),
});

/** OPTIONS preflight — short-circuit with 204. */
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * POST /api/v1/insights
 *
 * Flow: authenticate -> rate limit -> feature gates (api_keys + ai_insights) ->
 * validate body -> AI call-limit check -> fetch org data -> Gemini call ->
 * sanitize -> record usage -> return answer.
 */
export async function POST(req: Request) {
  // 1. Authenticate via Bearer API key.
  const ctx = await authenticateApiKey(req.headers.get('authorization'));
  if (!ctx) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401, headers: CORS_HEADERS },
    );
  }

  // 2. Rate limit: 100 req/min per org (shared limiter key space).
  const rl = rateLimit({
    key: 'v1:insights',
    identifier: ctx.orgId,
    limit: 100,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { ...CORS_HEADERS, 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  // 3. Feature gate: api_keys must be enabled.
  const apiKeysEnabled = await checkFeature(ctx.orgId, 'api_keys');
  if (!apiKeysEnabled) {
    return NextResponse.json(
      { error: 'API access is not enabled on your plan' },
      { status: 403, headers: CORS_HEADERS },
    );
  }

  // 4. Feature gate: ai_insights must be enabled.
  const aiInsightsEnabled = await checkFeature(ctx.orgId, 'ai_insights');
  if (!aiInsightsEnabled) {
    return NextResponse.json(
      { error: 'AI insights are not enabled on your plan' },
      { status: 403, headers: CORS_HEADERS },
    );
  }

  // 5. Validate request body.
  let parsed: z.infer<typeof BodySchema>;
  try {
    const json = await req.json();
    parsed = BodySchema.parse(json);
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body: expected { question: string (1-2000 chars) }' },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  // 6. AI call-limit check (daily per-org quota).
  const aiLimit = await checkAiCallLimit(ctx.orgId);
  if (!aiLimit.allowed) {
    return NextResponse.json(
      { error: 'Daily AI call limit exceeded', used: aiLimit.used, limit: aiLimit.limit },
      { status: 429, headers: CORS_HEADERS },
    );
  }

  try {
    // 7. Fetch org-scoped data to ground the AI answer.
    const [kpisRes, salesRes, inventoryRes] = await Promise.all([
      supabaseAdmin.from('kpis').select('*').eq('org_id', ctx.orgId),
      supabaseAdmin.from('sales_data').select('*').eq('org_id', ctx.orgId),
      supabaseAdmin.from('inventory_data').select('*').eq('org_id', ctx.orgId),
    ]);

    const contextData = {
      kpis: kpisRes.data ?? [],
      sales: salesRes.data ?? [],
      inventory: inventoryRes.data ?? [],
    };

    // 8. Build the Gemini prompt (same BI-assistant persona as the chat route).
    const prompt = `
      You are an AI Business Intelligence Assistant for a pharmaceutical company (like Pfizer).
      The user is asking a question about their data.
      Here is the current data context (database state for this organization):
      ${JSON.stringify(contextData)}

      User Question: "${parsed.question}"

      Provide a concise, professional answer based ONLY on the provided data.
      Format your response in Markdown.
    `;

    // 9. Call Gemini (fresh client per request; key is a public env var).
    const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    // 10. Sanitize AI output (defense-in-depth against prompt-injected HTML).
    const answer = stripDangerousHtml(response.text ?? '');

    // 11. Record AI usage (separate event type for quota enforcement).
    await recordUsage(ctx.orgId, 'ai_call');

    return NextResponse.json({ answer }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('v1/insights error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
