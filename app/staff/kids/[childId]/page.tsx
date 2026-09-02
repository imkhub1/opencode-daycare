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

  const [rooms, linkedParents, invitations] = await Promise.all([
    getRooms(),
    getChildParentLinks(child.id),
    getChildInvitations(child.id),
  ]);
  rooms.sort((left, right) => ROOM_ORDER.indexOf(left.name) - ROOM_ORDER.indexOf(right.name));

  return (
    <ChildProfile
      child={child}
      rooms={rooms}
      linkedParents={linkedParents}
      invitations={invitations}
    />
  );
}
