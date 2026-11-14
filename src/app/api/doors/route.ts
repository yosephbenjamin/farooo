import { NextResponse } from "next/server";
import { getReport, getReportForEmail } from "@/lib/report";
import { logJson } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/doors?name=Lovable  or  /api/doors?email=founder@lovable.dev  (+ &taps=<json>) */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const email = u.searchParams.get("email");
  const name = u.searchParams.get("name");
  const r = email ? await getReportForEmail(email) : name ? await getReport(name) : null;
  if (!r) return NextResponse.json({ error: "unknown company" }, { status: 404 });
  return NextResponse.json(logJson(r, u.searchParams.get("taps")));
}
