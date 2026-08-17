import { notFound } from "next/navigation";

import { getChild, getRooms } from "@/app/kids/actions";
import { ChildEditForm } from "@/components/kids";

const ROOM_ORDER = ["Soles", "Lunas", "Estrellas"];

export default async function EditChildPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = await params;
  const [child, rooms] = await Promise.all([getChild(childId), getRooms()]);

  if (!child) notFound();
  rooms.sort((left, right) => ROOM_ORDER.indexOf(left.name) - ROOM_ORDER.indexOf(right.name));
  return <ChildEditForm child={child} rooms={rooms} />;
}
