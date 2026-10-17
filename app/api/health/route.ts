/**
 * GET /api/health
 * Lightweight deployment health check.
 *
 * @module app/api/health/route
 */
import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({
    ok: true,
    service: 'datacore-ai',
    timestamp: new Date().toISOString(),
  });
}
