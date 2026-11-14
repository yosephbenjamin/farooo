import type { Metadata } from "next";
import { LogView } from "@/components/LogView";
import { demoStartups, getReport } from "@/lib/report";
import { readJson } from "@/lib/data";

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
  // the scripted moment: hold back the newest opened door in booth mode
  const scripts = readJson<Record<string, string>>("demo/scripted.json", {});
  const scriptedId = isBooth ? scripts[startup] ?? report.opened[0]?.companyId ?? null : null;
  return <LogView report={report} booth={isBooth} scriptedId={scriptedId} autoMs={auto ? Number(auto) || 6000 : null} />;
}
