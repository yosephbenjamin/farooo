import { Ask } from "@/components/Ask";
import { demoStartups } from "@/lib/report";

export default function Home() {
  return <Ask demos={demoStartups().map((d) => d.name)} />;
}
