import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LogView } from "@/components/LogView";
import { demoStartups, getReport } from "@/lib/report";
import { readJson } from "@/lib/data";
import { parseTaps, tapsCookie } from "@/lib/taps";
import { firstLook, rankDoors } from "@/lib/doors";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ startup: string }>; searchParams: Promise<{ name?: string; booth?: string; auto?: string }> };

function displayName(slug: string, name?: string) {
  return name?.trim() || demoStartups().find((d) => d.slug === slug)?.name || slug.replace(/-/g, " ");
}

export async function generateMetadata({ params, searchParams }: Params): Promise<Metadata> {
  const { startup } = await params;
  const { name } = await searchParams;
  return { title: `${displayName(startup, name)} · Faro` };
}

export default async function StartupLog({ params, searchParams }: Params) {
  const { startup } = await params;
  const { name, booth, auto } = await searchParams;
  const report = await getReport(displayName(startup, name));
  const isBooth = booth === "1";
  const taps = isBooth ? parseTaps(null) : parseTaps((await cookies()).get(tapsCookie(startup))?.value);
  // the scripted moment: hold back the top door in booth mode (or the one named in demo/scripted.json)
  const scripts = readJson<Record<string, string>>("demo/scripted.json", {});
  const top = isBooth ? rankDoors(report.doors, taps)[0] : firstLook(report.doors)[0]?.door;
  const scriptedId = isBooth ? scripts[startup] ?? top?.id ?? null : null;
  return <LogView report={report} slug={startup} taps={taps} booth={isBooth} scriptedId={scriptedId} autoMs={auto ? Number(auto) || 6000 : null} />;
}
