import { notFound } from "next/navigation";

import { getChild } from "@/app/kids/actions";
import {
  getChildInvitations,
  getChildParentLinks,
} from "@/app/kids/parent-invitations/actions";
import { ChildProfile } from "@/components/kids";

export default async function ChildPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = await params;
  const child = await getChild(childId);

  if (!child) notFound();

  const [linkedParentsResult, invitationsResult] = await Promise.allSettled([
    getChildParentLinks(child.id),
    getChildInvitations(child.id),
  ]);
  const linkedParents =
    linkedParentsResult.status === "fulfilled" ? linkedParentsResult.value : [];
  const invitations =
    invitationsResult.status === "fulfilled" ? invitationsResult.value : [];

  return (
    <ChildProfile
      child={child}
      linkedParents={linkedParents}
      invitations={invitations}
    />
  );
}
