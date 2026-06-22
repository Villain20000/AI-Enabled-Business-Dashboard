/**
 * AI Insights API Route
 *
 * This API endpoint generates actionable business insights from dashboard data
 * using Google Gemini AI. It analyzes sales, inventory, and KPI data to identify
 * trends, anomalies, and alerts.
 *
 * Security hardening: CSRF check, IP-based rate limiting, org auth (ai:use),
 * feature gating (ai_insights), daily AI call limits, zod input validation,
 * defensive JSON parsing, and sanitization of insight text.
 *
 * @module InsightsAPI
 * @description POST endpoint for generating AI-powered business insights
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

/** Zod schema validating the insights request body. */
const InsightsSchema = z.object({
  data: z.unknown(),
});

/** Shape of a single insight returned to the client. */
interface Insight {
  title: string;
  description: string;
}

/**
 * POST Handler for AI Insights Generation
 *
 * Analyzes dashboard data (sales, inventory, KPIs) and generates 3 key
 * actionable insights focusing on anomalies, trends, and critical alerts.
 *
 * @param {Request} req - The incoming HTTP request containing data to analyze
 * @returns {Promise<NextResponse>} JSON response with insights array or error
 */
export async function POST(req: Request) {
  // 1. CSRF protection
  const csrfErr = checkCsrf(req);
  if (csrfErr) return csrfErr;

  // 2. IP-based rate limiting
  const ip = getClientIp(req);
  const rl = rateLimit({ key: 'ai:insights', identifier: ip, limit: 20, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'x-ratelimit-remaining': String(rl.remaining) } },
    );
  }

  // 3. Organization authentication (requires ai:use permission)
  const auth = await requireOrgApi('ai:use');
  if ('error' in auth) return auth.error;

  // 4. Feature gating: AI insights access
  const allowed = await checkFeature(auth.ctx.orgId, 'ai_insights');
  if (!allowed) {
    return NextResponse.json(
      { error: 'AI insights are not available on your plan. Please upgrade to access automated insights.' },
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
  let parsed: z.infer<typeof InsightsSchema>;
  try {
    parsed = InsightsSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { data } = parsed;

  // 7. Build prompt + call Gemini
  const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
  const prompt = `
    You are an AI Business Intelligence Analyst for a pharmaceutical company.
    Analyze the following dashboard data and provide 3 key actionable insights.
    Focus on anomalies, trends, or critical alerts (e.g., low inventory).
    Respond as a JSON array of objects, each with "title" and "description" string fields.

    Data:
    ${JSON.stringify(data)}
  `;

  let raw: string;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    raw = response.text ?? '';
  } catch (error) {
    console.error('AI Insights Error:', error);
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 });
  }

  // 10. Defensive JSON parsing with regex fallback
  let insights: Insight[] = [];
  try {
    const parsedJson = JSON.parse(raw);
    if (Array.isArray(parsedJson)) {
      insights = parsedJson
        .filter((i): i is Record<string, unknown> => typeof i === 'object' && i !== null)
        .map((i) => ({
          title: String(i.title ?? ''),
          description: String(i.description ?? ''),
        }));
    } else if (parsedJson && typeof parsedJson === 'object') {
      insights = [
        {
          title: String((parsedJson as Record<string, unknown>).title ?? ''),
          description: String((parsedJson as Record<string, unknown>).description ?? ''),
        },
      ];
    }
  } catch {
    // Attempt to extract a JSON array via regex
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        const extracted = JSON.parse(match[0]);
        if (Array.isArray(extracted)) {
          insights = extracted
            .filter((i): i is Record<string, unknown> => typeof i === 'object' && i !== null)
            .map((i) => ({
              title: String(i.title ?? ''),
              description: String(i.description ?? ''),
            }));
        }
      } catch {
        // Fall through to raw-text fallback below
      }
    }
    if (insights.length === 0) {
      insights = [{ title: 'Insight', description: raw.trim() }];
    }
  }

  // 8. Meter usage
  await recordUsage(auth.ctx.orgId, 'ai_call');

  // 10. Sanitize insight text before returning
  const sanitized = insights.map((i) => ({
    title: stripDangerousHtml(i.title),
    description: stripDangerousHtml(i.description),
  }));

  return NextResponse.json({ insights: sanitized });
}
