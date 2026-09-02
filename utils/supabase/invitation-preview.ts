import "server-only";

import type { InvitationPreview } from "@/app/activate/types";
import { createAdminClient } from "@/utils/supabase/admin";

const TOKEN_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/i;
const RELATIONSHIPS = ["father", "mother", "guardian"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readPreview(data: unknown): InvitationPreview | null {
  if (!Array.isArray(data) || data.length !== 1 || !isRecord(data[0])) {
    return null;
  }

  const row = data[0];
  const relationship = row.relationship;
  const email = typeof row.email === "string" ? row.email.trim().toLowerCase() : "";

  if (
    typeof row.child_name !== "string" ||
    typeof row.daycare_name !== "string" ||
    typeof row.invited_full_name !== "string" ||
    !RELATIONSHIPS.includes(relationship as (typeof RELATIONSHIPS)[number]) ||
    !/^\S+@\S+\.\S+$/.test(email) ||
    typeof row.expires_at !== "string" ||
    !Number.isFinite(Date.parse(row.expires_at))
  ) {
    return null;
  }

  return {
    childName: row.child_name,
    daycareName: row.daycare_name,
    invitedFullName: row.invited_full_name,
    email,
    relationship: relationship as InvitationPreview["relationship"],
    expiresAt: row.expires_at,
  };
}

export async function getInvitationPreview(
  token: string,
): Promise<InvitationPreview | null> {
  const normalizedToken = token.trim().toUpperCase();
  if (!TOKEN_PATTERN.test(normalizedToken)) return null;

  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("get_invitation_preview", {
    p_token: normalizedToken,
  });

  if (error) return null;
  return readPreview(data);
}
