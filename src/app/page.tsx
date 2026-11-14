import { Shore } from "@/components/Shore";
import { demoStartups } from "@/lib/report";

export default function Home() {
  const demos = demoStartups();
  return (
    <Shore draw>
      <form action="/for" method="get">
        <label className="block">
          <span className="block text-[clamp(38px,4.7vw,68px)] font-light leading-[1.04] tracking-[-0.02em] text-ink-deep">Which startup are you?</span>
          <input
            name="s"
            list="demo-startups"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            required
            placeholder={demos[0]?.name ?? ""}
            className="mt-[4vh] w-full max-w-[30rem] border-0 border-b-[1.5px] border-ink bg-transparent pb-2 text-[clamp(24px,2.5vw,34px)] font-light text-ink-deep outline-none placeholder:italic placeholder:text-ink-300 focus:border-ink-deep"
          />
          <span className="mt-6 block max-w-[30rem] text-[clamp(17px,1.35vw,20px)] leading-[1.5] text-ink-500">
            New money, new hires, new acquisitions. Faro tells you who just got a reason to partner, and who can introduce you.
          </span>
          <datalist id="demo-startups">
            {demos.map((d) => (
              <option key={d.slug} value={d.name} />
            ))}
          </datalist>
        </label>
      </form>
    </Shore>
  );
}
