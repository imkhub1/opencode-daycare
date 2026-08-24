"use client";

import { KidsReadError } from "@/components/kids";

export default function StaffKidsError({ retry }: { retry: () => void }) {
  return <KidsReadError onRetry={retry} />;
}
