export const RECOVERY_FLOW_COOKIE = "__od_recovery_flow";
export const RECOVERY_FLOW_VALUE = "1";
export const RECOVERY_FLOW_PATH = "/reset-password";
export const RECOVERY_FLOW_MAX_AGE = 10 * 60;

export function getRecoveryFlowCookieOptions(maxAge = RECOVERY_FLOW_MAX_AGE) {
  return {
    httpOnly: true,
    maxAge,
    path: RECOVERY_FLOW_PATH,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}
