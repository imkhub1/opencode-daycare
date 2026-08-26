import { cookies } from "next/headers";

import {
  getRecoveryFlowCookieOptions,
  RECOVERY_FLOW_COOKIE,
} from "@/utils/auth/recovery";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set({
    ...getRecoveryFlowCookieOptions(0),
    expires: new Date(0),
    name: RECOVERY_FLOW_COOKIE,
    value: "",
  });

  return Response.json({ ok: true });
}
