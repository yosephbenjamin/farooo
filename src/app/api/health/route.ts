import { NextResponse } from "next/server";
import { searchEntities } from "@/lib/cala";
import { loadPool } from "@/lib/report";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/health            is a Cala key configured? (never shows the key)
 * GET /api/health?probe=1    plus one live Cala search, with its status: 200 ok, 401 bad key, 402 no credit
 */
export async function GET(req: Request) {
  const key = process.env.CALA_API_KEY ?? "";
  const offline = process.env.CALA_OFFLINE === "1";
  const out: Record<string, unknown> = {
    calaKey: key ? `set (${key.length} characters)` : "missing",
    calaOffline: offline,
    liveLookups: !!key && !offline,
    storedCompanies: Object.keys(loadPool().profiles).length,
  };
  if (new URL(req.url).searchParams.get("probe") === "1" && key && !offline) {
    const t = Date.now();
    try {
      const r = await searchEntities(`faro probe ${Date.now()}`, { types: ["Company"], limit: 1, cache: "refresh" });
      out.probe = { ok: true, status: 200, results: r.length, ms: Date.now() - t };
    } catch (e) {
      const err = e as { status?: number; message?: string };
      out.probe = { ok: false, status: err.status ?? null, error: String(err.message ?? e).slice(0, 200), ms: Date.now() - t };
    }
  }
  return NextResponse.json(out, { headers: { "Cache-Control": "no-store" } });
}
