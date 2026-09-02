import type { Metadata } from "next";

import { ForgotPasswordScreen } from "@/components/auth";

export const metadata: Metadata = {
  title: "Recuperar contraseña | OpenDayCare",
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[] }>;
}) {
  const { email } = await searchParams;
  const emailValue = Array.isArray(email) ? email[0] ?? "" : email ?? "";
  const initialEmail = emailValue.trim().length <= 254 ? emailValue.trim() : "";

  return <ForgotPasswordScreen initialEmail={initialEmail} />;
}
