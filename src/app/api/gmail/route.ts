import { NextResponse } from "next/server";
import { getReport, getReportForEmail, loadPool, slugify } from "@/lib/report";
import { bareDomain } from "@/lib/profile";
import { doorJson, logJson } from "@/lib/api";
import { parseTaps } from "@/lib/taps";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Gmail gives an add-on about 30 s to answer, and so does Vercel's function limit. A live Cala
 * lookup for a startup Faro hasn't stored paces its calls ~6 s apart and can run past both, and
 * then the sidebar just spins. So every answer races a budget well inside that limit; past it the
 * add-on gets a plain "try again" card, never silence.
 */
const BUDGET_MS = Number(process.env.FARO_GMAIL_BUDGET_MS ?? 20_000);
const SLOW = Symbol("slow");

const PUBLIC_MAIL = /^(gmail|googlemail|outlook|hotmail|live|yahoo|icloud|me|proton|protonmail|aol|gmx)\./i;

/**
 * GET /api/gmail?user=<the user's email>[&startup=<name typed once>][&sender=<open message's sender>][&taps=<json>][&quick=1]
 *
 * quick=1 answers from stored data only (instant). A company Faro would have to look up live in
 * Cala answers { pending: true, name }, so the add-on can show a "Looking…" card first: Google's
 * cards can't show anything while a request runs.
 *
 * Identity: the user's email domain matched to a company's website in Cala. A personal address
 * (gmail.com…) or an unknown domain answers { needsName: true }, and the add-on asks for the
 * startup's name once, as the web does. With a sender whose company is one of the user's doors,
 * returns that door; otherwise the user's log.
 */
export async function GET(req: Request) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const slow = new Promise<typeof SLOW>((resolve) => {
    timer = setTimeout(() => resolve(SLOW), BUDGET_MS);
  });
  const out = await Promise.race([answer(req), slow]);
  clearTimeout(timer);
  if (out === SLOW) {
    console.error("gmail: over budget", BUDGET_MS);
    return NextResponse.json({ error: "Cala is taking its time with this one. Try again in a minute." });
  }
  return out;
}

async function answer(req: Request): Promise<NextResponse> {
  const u = new URL(req.url);
  const user = (u.searchParams.get("user") ?? "").trim();
  const startup = (u.searchParams.get("startup") ?? "").trim();
  const sender = u.searchParams.get("sender");
  const tapsRaw = u.searchParams.get("taps");
  try {
    const quick = u.searchParams.get("quick") === "1";
    const r = startup ? await getReport(startup, quick ? { live: false } : {}) : await getReportForEmail(user, quick ? { live: false } : {});
    const known = !!r && (!!r.startup.country || r.startup.industries.length > 0);
    if (!r || !known) {
      const dom = bareDomain(user.includes("@") ? user.split("@")[1] : user);
      const canLive = !!process.env.CALA_API_KEY && process.env.CALA_OFFLINE !== "1";
      if (quick && canLive && (startup || (dom && !PUBLIC_MAIL.test(dom)))) {
        return NextResponse.json({ pending: true, name: startup || dom });
      }
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
