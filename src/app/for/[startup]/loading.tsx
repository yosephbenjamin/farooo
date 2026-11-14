"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Looking } from "@/components/Looking";
import { Shore } from "@/components/Shore";

/** Shown while the log is built: the cove, the beam looking around, three status lines. */
export default function Loading() {
  const params = useParams<{ startup: string }>();
  const search = useSearchParams();
  const name = search.get("name")?.trim() || decodeURIComponent(params?.startup ?? "").replace(/-/g, " ");
  return (
    <Shore sweeping>
      <Looking name={name} />
    </Shore>
  );
}
