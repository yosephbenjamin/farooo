import { NextResponse } from "next/server";
import { getReport } from "@/lib/report";
import { headline, entryLead, entryWhy, doorCountLine, shortDate } from "@/lib/prose";

export const dynamic = "force-dynamic";

/** The log as JSON (used by the Gmail add-on). */
export async function GET(req: Request, { params }: { params: Promise<{ startup: string }> }) {
  const { startup } = await params;
  const name = new URL(req.url).searchParams.get("name") ?? startup.replace(/-/g, " ");
  const r = await getReport(name);
  return NextResponse.json({
    startup: r.startup.name,
    headline: headline(r),
    doors: r.opened.slice(0, 6).map((d) => ({
      lead: `${entryLead(d).name}${entryLead(d).rest}.`,
      why: entryWhy(d),
      date: shortDate(d.reason!.date),
      source: d.reason!.source,
    })),
    doorCount: doorCountLine(r),
  });
}
