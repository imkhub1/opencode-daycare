import type { Metadata } from "next";
import { cookies } from "next/headers";

import { ResetPasswordScreen } from "@/components/auth";
import {
  RECOVERY_FLOW_COOKIE,
  RECOVERY_FLOW_VALUE,
} from "@/utils/auth/recovery";

export const metadata: Metadata = {
  title: "Nueva contraseña | OpenDayCare",
};

export default async function ResetPasswordPage() {
  const cookieStore = await cookies();
  const hasRecoveryMarker =
    cookieStore.get(RECOVERY_FLOW_COOKIE)?.value === RECOVERY_FLOW_VALUE;

  return <ResetPasswordScreen hasRecoveryMarker={hasRecoveryMarker} />;
}
