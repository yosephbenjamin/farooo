/**
 * npm run alerts
 *
 * For each subscriber, build the door report and alert on doors that opened since the last
 * run (one signal per door, ever). Sends with Resend if RESEND_API_KEY is set; otherwise the
 * alert is kept in data/alerts.json and shown at /log.
 */
import { readJson, writeJson } from "../src/lib/data";
import { makeAlert, renderAlertHtml, renderAlertText, type Alert } from "../src/lib/email";
import { demoStartups, getReport } from "../src/lib/report";

const log = (...a: unknown[]) => console.log("[alerts]", ...a);

interface Subscriber {
  startup: string;
  slug: string;
  description?: string;
  email: string | null;
}

async function send(a: Alert): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !a.to) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.ALERT_FROM ?? "Faro <faro@example.com>",
      to: [a.to],
      subject: a.subject,
      html: renderAlertHtml(a, process.env.FARO_BASE_URL ?? ""),
      text: renderAlertText(a),
    }),
  });
  if (!res.ok) log(`resend failed for ${a.startup.name}: HTTP ${res.status}`);
  return res.ok;
}

async function main() {
  const subs = readJson<Subscriber[]>(
    "subscribers.json",
    demoStartups().map((d) => ({ startup: d.name, slug: d.slug, description: d.description, email: process.env.ALERT_TO || null })),
  );
  const alerted = new Set(readJson<string[]>("alerted.json", []));
  const alerts = readJson<Alert[]>("alerts.json", []);
  const now = new Date().toISOString();
  let made = 0;
  for (const s of subs) {
    const r = await getReport(s.startup, { description: s.description, forceLive: true });
    const fresh = r.opened.filter((d) => !alerted.has(`${s.slug}|${d.companyId}|${d.reason!.date}`)).slice(0, 5);
    if (!fresh.length) {
      log(`${s.startup}: quiet`);
      continue;
    }
    const a = makeAlert(r, fresh, s.slug, s.email, now);
    a.delivery = (await send(a)) ? "resend" : "log-only";
    alerts.push(a);
    for (const d of fresh) alerted.add(`${s.slug}|${d.companyId}|${d.reason!.date}`);
    made++;
    log(`${s.startup}: ${fresh.length} door(s) -> ${a.delivery}`);
  }
  writeJson("alerts.json", alerts);
  writeJson("alerted.json", [...alerted]);
  log(`${made} alert(s)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
