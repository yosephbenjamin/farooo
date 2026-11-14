/** Alert email: plain, typeset, inline styles only (email clients ignore stylesheets). */
import type { Door, DoorReport } from "./doors";
import { doorCountLine, emailSubject, entryLead, entryMeta, entryWhy, headline, shortDate } from "./prose";
import { hostOf } from "./hosts";

export interface Alert {
  id: string;
  createdAt: string;
  startup: { name: string; slug: string };
  to: string | null;
  subject: string;
  headline: string;
  entries: { companyId: string; lead: string; name: string; why: string; meta: string; xray: string | null; date: string; sourceName: string; sourceRank: string | null; sourceUrl: string }[];
  doorCount: string | null;
  delivery: "resend" | "log-only";
}

export function makeAlert(r: DoorReport, fresh: Door[], slug: string, to: string | null, createdAt: string): Alert {
  return {
    id: `${slug}-${createdAt.slice(0, 10)}-${fresh.map((d) => d.id.slice(0, 6)).join("")}`.slice(0, 80),
    createdAt,
    startup: { name: r.startup.name, slug },
    to,
    subject: emailSubject(fresh),
    headline: headline(r, fresh),
    entries: fresh.map((d) => {
      const l = entryLead(d);
      return {
        companyId: d.id,
        name: l.name,
        lead: `${l.name}${l.rest}.`,
        why: entryWhy(d),
        meta: (() => { const m = entryMeta(d); return [...m.parts, m.people].filter(Boolean).join(". "); })(),
        xray: d.people.length ? null : d.xray,
        sourceRank: d.whyNow.source.rank,
        date: d.whyNow.date,
        sourceName: d.whyNow.source.name && d.whyNow.source.name.length < 40 ? d.whyNow.source.name : hostOf(d.whyNow.source.url),
        sourceUrl: d.whyNow.source.url,
      };
    }),
    doorCount: doorCountLine(r),
    delivery: "log-only",
  };
}

const C = {
  paper: "#f6e8cd",
  paper50: "#fcf8f0",
  ink: "#3b322c", // brown-900 as hex for email clients without oklch
  inkDeep: "#2e2723",
  ink500: "#8f8178",
  ink300: "#b9aba1",
  light: "#ffc234",
  sea: "#d6dec9",
  peach: "#f6c3aa",
};
const SERIF = `'Newsreader', 'Iowan Old Style', Georgia, 'Times New Roman', serif`;
const MONO = `Newsreader, 'Iowan Old Style', Georgia, serif`; // small text: the same serif as the site (no monospace)

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** "Customer. A food company…" -> the partnership as a small label, then the sentence. */
function whyHtml(why: string): string {
  const cut = why.indexOf(". ");
  if (cut <= 0 || cut > 13) return esc(why);
  return `<span style="font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:${C.ink};">${esc(why.slice(0, cut))}</span>&nbsp;&nbsp;${esc(why.slice(cut + 2))}`;
}

/** The body, usable inside a page (the /log view) or wrapped as a full email document. */
export function renderAlertFragment(a: Alert, baseUrl = ""): string {
  const [opened, ...through] = a.headline.split(/(?<=\.) /);
  const items = a.entries
    .map(
      (e, i) => `
      <tr><td style="padding:0 0 30px 0;">
        <p style="margin:0;font-family:${SERIF};font-size:22px;line-height:1.3;color:${C.inkDeep};">
          <strong style="font-weight:500;">${esc(e.name)}</strong>${esc(e.lead.slice(e.name.length))}<sup style="font-family:${MONO};font-size:10px;color:${C.ink500};"><a href="${esc(e.sourceUrl)}" style="color:${C.ink500};text-decoration:none;">${i + 1}</a></sup>
        </p>
        <p style="margin:8px 0 0 0;font-family:${SERIF};font-size:16px;line-height:1.5;color:${C.ink500};">${whyHtml(e.why)}</p>
        <p style="margin:3px 0 0 0;font-family:${SERIF};font-style:italic;font-size:16px;line-height:1.5;color:${C.ink500};">${esc(e.meta)}${e.meta ? ". " : ""}${e.xray ? `<a href="${esc(e.xray)}" style="color:${C.ink500};font-style:normal;">Find the right person →</a>` : ""}</p>
      </td></tr>`,
    )
    .join("");
  const notes = a.entries
    .map(
      (e, i) =>
        `<div style="font-family:${MONO};font-size:13px;line-height:1.8;color:${C.ink500};"><span style="color:${C.ink300};">${i + 1}&nbsp;&nbsp;</span><a href="${esc(e.sourceUrl)}" style="color:${C.ink500};text-decoration:none;">${esc(shortDate(e.date))}, ${esc(e.sourceName)}${e.sourceRank ? `, ${esc(e.sourceRank.toLowerCase())}` : ""}</a></div>`,
    )
    .join("");
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper};">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${C.paper50};">
        <tr><td style="padding:44px 44px 6px 44px;">
          <div style="font-family:${MONO};font-size:12px;letter-spacing:2.6px;text-transform:uppercase;color:${C.ink};">
            <span style="display:inline-block;width:9px;height:11px;background:${C.light};border:1px solid ${C.ink};margin-right:9px;vertical-align:-2px;"></span>Faro
          </div>
          <h1 style="margin:30px 0 0 0;font-family:${SERIF};font-weight:300;font-size:34px;line-height:1.14;letter-spacing:-0.4px;color:${C.inkDeep};">${esc(opened)}</h1>
          ${through.length ? `<p style="margin:8px 0 0 0;font-family:${SERIF};font-weight:300;font-style:italic;font-size:25px;line-height:1.2;color:${C.ink500};">${esc(through.join(" "))}</p>` : ""}
          <div style="height:34px;line-height:34px;font-size:0;">&nbsp;</div>
        </td></tr>
        <tr><td style="padding:0 44px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}</table></td></tr>
        <tr><td style="padding:0 44px;"><div style="border-top:1px solid #f1dbb7;padding-top:18px;">${notes}</div></td></tr>
        ${a.doorCount ? `<tr><td style="padding:16px 44px 0 44px;font-family:${MONO};font-style:italic;font-size:13px;color:${C.ink500};">${esc(a.doorCount)}</td></tr>` : ""}
        <tr><td style="padding:34px 44px 30px 44px;font-family:${SERIF};font-size:14px;line-height:1.5;color:${C.ink500};">
          The lighthouse stays quiet until a door opens.${baseUrl ? ` <a href="${esc(baseUrl)}/for/${esc(a.startup.slug)}" style="color:${C.ink};">Read the log.</a>` : ""}
        </td></tr>
        <tr><td style="height:14px;line-height:14px;font-size:0;background:${C.sea};border-top:1.5px solid ${C.ink};">&nbsp;</td></tr>
      </table>
    </td></tr>
  </table>`;
}

export function renderAlertHtml(a: Alert, baseUrl = ""): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(a.subject)}</title></head><body style="margin:0;padding:0;background:${C.paper};">${renderAlertFragment(a, baseUrl)}</body></html>`;
}

export function renderAlertText(a: Alert): string {
  return [
    a.headline,
    "",
    ...a.entries.flatMap((e, i) => [`${e.lead} [${i + 1}]`, e.why, e.meta, e.xray ?? "", ""]),
    ...a.entries.map((e, i) => `[${i + 1}] ${shortDate(e.date)}, ${e.sourceUrl}`),
    "",
    a.doorCount ?? "",
    "",
    "The lighthouse stays quiet until a door opens.",
  ].join("\n");
}
