import { LoginScreen } from "@/components/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string; activation?: string }>;
}) {
  const params = await searchParams;
  return <LoginScreen invite={params.invite} activation={params.activation} />;
}
