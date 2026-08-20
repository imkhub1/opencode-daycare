import type { Metadata } from "next";
import { LoginScreen } from "@/components/auth";

export const metadata: Metadata = {
  title: "Iniciar sesión | OpenDayCare",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string; activation?: string }>;
}) {
  const params = await searchParams;
  return <LoginScreen invite={params.invite} activation={params.activation} />;
}
