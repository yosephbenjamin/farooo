import { redirect } from "next/navigation";
import { slugify } from "@/lib/report";

export default async function For({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s } = await searchParams;
  if (!s?.trim()) redirect("/");
  redirect(`/for/${slugify(s)}?name=${encodeURIComponent(s.trim())}`);
}
