import type { Metadata } from "next";
import { LoginScreen } from "@/components/auth";
import { getServerDictionary } from "@/utils/i18n/server";

export const metadata: Metadata = {
  title: "Iniciar sesión | OpenDayCare",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string; activation?: string }>;
}) {
  const params = await searchParams;
  return (
    <LoginScreen
      invite={params.invite}
      activation={params.activation}
      dictionary={await getServerDictionary()}
    />
  );
}
