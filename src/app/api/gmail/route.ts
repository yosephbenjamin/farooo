import { NextResponse } from "next/server";
import { getReportForEmail } from "@/lib/report";
import { bareDomain } from "@/lib/profile";
import { loadPool } from "@/lib/report";
import { doorJson, logJson } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/gmail?user=<the user's email>&sender=<the open message's sender>
 * Knows the user from their domain. If the sender's company is one of the user's doors,
 * returns that door; otherwise the user's log.
 */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const user = u.searchParams.get("user") ?? "";
  const sender = u.searchParams.get("sender");
  const r = await getReportForEmail(user);
  if (!r) return NextResponse.json({ error: "We couldn't match your email domain to a company in Cala." }, { status: 404 });
  if (sender) {
    const dom = bareDomain(sender.includes("@") ? sender.split("@")[1] : sender);
    const pool = loadPool();
    const door = r.doors.find((d) => {
      const p = pool.profiles[d.id];
      return !!dom && !!p && p.domains.includes(dom);
    });
    if (door) return NextResponse.json({ match: true, startup: r.startup.name, door: doorJson(door) });
  }
  return NextResponse.json({ match: false, ...logJson(r, u.searchParams.get("taps")) });
}
