import type { Metadata } from "next";

import { ForgotPasswordScreen } from "@/components/auth";

export const metadata: Metadata = {
  title: "Recuperar contraseña | OpenDayCare",
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email = "" } = await searchParams;
  const initialEmail = email.trim().length <= 254 ? email.trim() : "";

  return <ForgotPasswordScreen initialEmail={initialEmail} />;
}
