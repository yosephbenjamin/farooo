import { Lighthouse } from "@/components/Lighthouse";
import { demoStartups } from "@/lib/report";

export default function Home() {
  const demos = demoStartups();
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center px-4 sm:px-8">
      <form action="/for" method="get" className="flex w-full flex-col items-start gap-8 sm:flex-row sm:items-end sm:gap-12">
        <Lighthouse className="h-36 w-36 shrink-0 sm:h-52 sm:w-52" />
        <label className="block w-full pb-3">
          <span className="block text-[clamp(34px,5.5vw,64px)] font-light leading-[1.05] tracking-[-0.015em] text-ink-deep">
            Which startup are you?
          </span>
          <input
            name="s"
            list="demo-startups"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            required
            placeholder={demos[0]?.name ?? ""}
            className="mt-6 w-full max-w-md border-0 border-b border-ink-300 bg-transparent pb-2 text-[clamp(22px,2.4vw,30px)] font-light text-ink outline-none placeholder:text-ink-300 placeholder:italic focus:border-ink"
          />
          <datalist id="demo-startups">
            {demos.map((d) => (
              <option key={d.slug} value={d.name} />
            ))}
          </datalist>
        </label>
      </form>
    </main>
  );
}
