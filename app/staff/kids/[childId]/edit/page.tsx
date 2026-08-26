import { redirect } from "next/navigation";

export default async function StaffEditChildPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = await params;
  redirect(`/staff/kids/${childId}`);
}
