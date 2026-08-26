import { notFound } from "next/navigation";

import { getChild, getRooms } from "@/app/kids/actions";
import {
  getChildInvitations,
  getChildParentLinks,
} from "@/app/kids/parent-invitations/actions";
import { ChildProfile } from "@/components/kids";

const ROOM_ORDER = ["Soles", "Lunas", "Estrellas"];

export default async function StaffChildPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = await params;
  const child = await getChild(childId);

  if (!child) notFound();

  const [rooms, linkedParentsResult, invitationsResult] = await Promise.all([
    getRooms(),
    Promise.resolve(getChildParentLinks(child.id)).then(
      (value) => ({ status: "fulfilled" as const, value }),
      () => ({ status: "rejected" as const }),
    ),
    Promise.resolve(getChildInvitations(child.id)).then(
      (value) => ({ status: "fulfilled" as const, value }),
      () => ({ status: "rejected" as const }),
    ),
  ]);
  rooms.sort((left, right) => ROOM_ORDER.indexOf(left.name) - ROOM_ORDER.indexOf(right.name));
  const linkedParents =
    linkedParentsResult.status === "fulfilled" ? linkedParentsResult.value : [];
  const invitations =
    invitationsResult.status === "fulfilled" ? invitationsResult.value : [];

  return (
    <ChildProfile
      child={child}
      rooms={rooms}
      linkedParents={linkedParents}
      invitations={invitations}
    />
  );
}
