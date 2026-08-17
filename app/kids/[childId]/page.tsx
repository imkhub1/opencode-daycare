import { notFound } from "next/navigation";

import { getChild } from "@/app/kids/actions";
import { ChildProfile } from "@/components/kids";

export default async function ChildPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = await params;
  const child = await getChild(childId);

  if (!child) notFound();
  return <ChildProfile child={child} />;
}
