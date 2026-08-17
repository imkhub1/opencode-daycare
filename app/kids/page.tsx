import { getChildren, getRooms, type ChildStatus } from "@/app/kids/actions";
import { ChildrenDirectory } from "@/components/kids";

const ROOM_ORDER = ["Soles", "Lunas", "Estrellas"];

export default async function KidsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const requestedView = (await searchParams).view;
  const view: ChildStatus = requestedView === "archived" ? "archived" : "active";
  const [rooms, children] = await Promise.all([getRooms(), getChildren(view)]);
  const orderedRooms = rooms.sort(
    (left, right) => ROOM_ORDER.indexOf(left.name) - ROOM_ORDER.indexOf(right.name),
  );

  return <ChildrenDirectory rooms={orderedRooms} childRecords={children} view={view} />;
}
