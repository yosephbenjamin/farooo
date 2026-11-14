import Link from "next/link";
import { Lighthouse } from "@/components/Lighthouse";
import { readJson } from "@/lib/data";
import { renderAlertFragment, type Alert } from "@/lib/email";
import { numWord } from "@/lib/prose";

export const dynamic = "force-dynamic";
export const metadata = { title: "Faro: sent" };

export default function SentLog() {
  const alerts = readJson<Alert[]>("alerts.json", []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-8 sm:py-14">
      <header className="mb-12 flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2 no-underline" aria-label="Faro, home">
          <Lighthouse className="h-8 w-8" />
          <span className="text-[13px] uppercase tracking-[0.18em] text-ink-500">Faro</span>
        </Link>
      </header>
      <h1 className="text-[clamp(32px,4.5vw,52px)] font-light leading-[1.08] tracking-[-0.015em] text-ink-deep">
        {alerts.length ? `${numWord(alerts.length)} ${alerts.length === 1 ? "signal" : "signals"} sent.` : "Nothing sent yet."}
      </h1>
      <p className="mt-3 italic text-ink-500 text-[18px]">Each one exactly as it reached the inbox.</p>
      <div className="mt-14 space-y-16">
        {alerts.map((a) => (
          <article key={a.id}>
            <dl className="mb-3 grid grid-cols-[5rem_1fr] gap-y-0.5 text-[14px] text-ink-500">
              <dt className="text-ink-300">From</dt>
              <dd>Faro</dd>
              <dt className="text-ink-300">To</dt>
              <dd>{a.to ?? `founders of ${a.startup.name}`}</dd>
              <dt className="text-ink-300">Subject</dt>
              <dd className="text-ink">{a.subject}</dd>
              <dt className="text-ink-300">Sent</dt>
              <dd>
                {new Date(a.createdAt).toUTCString().replace(" GMT", " UTC")}
                {a.delivery === "log-only" ? ", kept here (no mail key)" : ", delivered"}
              </dd>
            </dl>
            <div className="border-t border-paper-200" dangerouslySetInnerHTML={{ __html: renderAlertFragment(a) }} />
          </article>
        ))}
      </div>
    </main>
  );
}
