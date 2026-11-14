import { NextResponse } from "next/server";
import { getReport, getReportForEmail, loadPool, slugify } from "@/lib/report";
import { bareDomain } from "@/lib/profile";
import { doorJson, logJson } from "@/lib/api";
import { parseTaps } from "@/lib/taps";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const PUBLIC_MAIL = /^(gmail|googlemail|outlook|hotmail|live|yahoo|icloud|me|proton|protonmail|aol|gmx)\./i;

/**
 * GET /api/gmail?user=<the user's email>[&startup=<name typed once>][&sender=<open message's sender>][&taps=<json>]
 *
 * Identity: the user's email domain matched to a company's website in Cala. A personal address
 * (gmail.com…) or an unknown domain answers { needsName: true }, and the add-on asks for the
 * startup's name once, as the web does. With a sender whose company is one of the user's doors,
 * returns that door; otherwise the user's log.
 */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const user = (u.searchParams.get("user") ?? "").trim();
  const startup = (u.searchParams.get("startup") ?? "").trim();
  const sender = u.searchParams.get("sender");
  const tapsRaw = u.searchParams.get("taps");
  try {
    const r = startup ? await getReport(startup) : await getReportForEmail(user);
    const known = !!r && (!!r.startup.country || r.startup.industries.length > 0);
    if (!r || !known) {
      const dom = bareDomain(user.includes("@") ? user.split("@")[1] : user);
      return NextResponse.json({
        needsName: true,
        reason: startup
          ? `Cala doesn't know “${startup}” yet. Try its full or legal name.`
          : dom && PUBLIC_MAIL.test(dom)
            ? "A personal address doesn't say which startup is yours."
            : `Cala has no company with the website ${dom ?? "of your address"}.`,
      });
    }
    const slug = slugify(startup || r.startup.name);
    if (sender) {
      const dom = bareDomain(sender.includes("@") ? sender.split("@")[1] : sender);
      const pool = loadPool();
      const door = dom
        ? r.doors.find((d) => {
            const p = pool.profiles[d.id];
            return !!p && (p.domains.includes(dom) || p.domains.some((x) => dom.endsWith(`.${x}`)));
          })
        : undefined;
      if (door) return NextResponse.json({ match: true, startup: r.startup.name, slug, door: doorJson(door, parseTaps(tapsRaw)) });
    }
    return NextResponse.json({ match: false, slug, ...logJson(r, tapsRaw) });
  } catch (e) {
    console.error("gmail", e);
    return NextResponse.json({ error: "The lighthouse is out of reach. Try again in a minute." }, { status: 500 });
  }
}
