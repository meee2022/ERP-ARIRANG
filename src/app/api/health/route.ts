import { NextResponse } from "next/server";

/**
 * GET /api/health
 * Lightweight health-check endpoint for Vercel / uptime monitors.
 * Returns 200 + JSON status when the Next.js runtime is alive.
 * Does NOT check Convex connectivity (that would require a server action
 * and is overkill for a simple liveness probe).
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      app: "PrimeBalance ERP",
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0",
    },
    { status: 200 }
  );
}
