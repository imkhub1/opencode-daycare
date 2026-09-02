import type { Metadata } from "next";
import { LoginScreen } from "@/components/auth";
import { getServerDictionary } from "@/utils/i18n/server";

export const metadata: Metadata = {
  title: "Iniciar sesión | OpenDayCare",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    invite?: string | string[];
    activation?: string | string[];
    recovery?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const invite = Array.isArray(params.invite) ? params.invite[0] : params.invite;
  const activation = Array.isArray(params.activation) ? params.activation[0] : params.activation;
  const recovery = Array.isArray(params.recovery) ? params.recovery[0] : params.recovery;

  return (
    <LoginScreen
      invite={invite}
      activation={activation}
      recovery={recovery}
      dictionary={await getServerDictionary()}
    />
  );
}
