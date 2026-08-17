"use client";

import { KidsReadError } from "@/components/kids";

export default function KidsError({ retry }: { retry: () => void }) {
  return <KidsReadError onRetry={retry} />;
}
