"use server";

import { revalidatePath } from "next/cache";

import {
  buildParentInvitationEmail,
  decryptParentInvitationToken,
  encryptParentInvitationToken,
  generateParentInvitationToken,
  hashParentInvitationToken,
  type ParentInvitationRelationship,
} from "@/utils/email/parent-invitation";
import {
  getParentInvitationIdempotencyKey,
  sendResendEmail,
} from "@/utils/email/resend";
import { createClient } from "@/utils/supabase/server";

const GENERIC_INVITATION_ERROR =
  "No se pudo procesar la invitación. Revisa los datos e inténtalo nuevamente.";
const GENERIC_DELIVERY_ERROR =
  "La invitación se creó, pero no se pudo enviar el correo. Puedes reintentarlo.";
const GENERIC_CANCELLATION_ERROR =
  "No se pudo cancelar la invitación. Inténtalo nuevamente.";
const GENERIC_UPDATE_ERROR =
  "No se pudo actualizar la invitación. Inténtalo nuevamente.";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RELATIONSHIPS: ParentInvitationRelationship[] = [
  "mother",
  "father",
  "guardian",
];

export type ParentRelationship = "Mamá" | "Papá" | "Tutor/a";

export type ParentInvitationFormValues = {
  name: string;
  email: string;
  relationship: ParentRelationship;
};

export type ParentInvitationActionState = {
  success: boolean;
  message?: string;
  errors?: Partial<Record<"name" | "email" | "relationship", string>>;
  values?: ParentInvitationFormValues;
  invitationId?: string;
  token?: string;
};

export type ParentLink = {
  id: string;
  fullName: string;
  email: string;
  relationship: ParentInvitationRelationship;
  status: "pending" | "active";
};

export type ParentInvitationSummary = {
  id: string;
  childId: string;
  fullName: string;
  email: string;
  relationship: ParentInvitationRelationship;
  status: "pending" | "accepted" | "expired" | "cancelled";
  deliveryStatus: "sent" | "failed";
  expiresAt: string;
  sentAt: string | null;
  deliveryError: string | null;
};

type InvitationDeliveryPayload = {
  invitation_id: string;
  token_ciphertext: string;
  child_name: string;
  daycare_name: string;
  full_name: string;
  email: string;
  relationship: ParentInvitationRelationship;
  expires_at: string;
};

type ParentLinkRow = {
  parent_id: string;
  full_name: string;
  email: string;
  relationship: ParentInvitationRelationship;
  parent_status: "pending" | "active";
};

type ParentInvitationRow = {
  id: string;
  child_id: string;
  full_name: string;
  email: string;
  relationship: ParentInvitationRelationship;
  status: "pending" | "accepted" | "expired" | "cancelled";
  delivery_status: "sent" | "failed";
  expires_at: string;
  sent_at: string | null;
  delivery_error: string | null;
};

function readText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function relationshipFromLabel(value: string): ParentInvitationRelationship | null {
  return (
    {
      Mamá: "mother",
      Papá: "father",
      "Tutor/a": "guardian",
    } as Record<string, ParentInvitationRelationship>
  )[value] ?? null;
}

function relationshipToLabel(value: string): ParentRelationship {
  if (value === "Mamá" || value === "Papá" || value === "Tutor/a") {
    return value;
  }

  return (
    {
      mother: "Mamá",
      father: "Papá",
      guardian: "Tutor/a",
    } as Record<string, ParentRelationship>
  )[value] ?? (value as ParentRelationship);
}

function readFormValues(formData: FormData): ParentInvitationFormValues {
  const relationship = readText(formData, "relationship");

  return {
    name: readText(formData, "name"),
    email: readText(formData, "email"),
    relationship: relationshipToLabel(relationship),
  };
}

function validateForm(values: ParentInvitationFormValues) {
  const errors: ParentInvitationActionState["errors"] = {};
  const name = values.name.trim();
  const email = values.email.trim().toLowerCase();
  const relationship = relationshipFromLabel(values.relationship);

  if (!name || name.length > 120) {
    errors.name = "Ingresa un nombre válido.";
  }

  if (!EMAIL_PATTERN.test(email) || email.length > 320) {
    errors.email = "Ingresa un email válido.";
  }

  if (!relationship || !RELATIONSHIPS.includes(relationship)) {
    errors.relationship = "Selecciona un parentesco válido.";
  }

  return {
    errors,
    data:
      Object.keys(errors).length === 0
        ? {
            name,
            email,
            relationship: relationship as ParentInvitationRelationship,
          }
        : undefined,
  };
}

async function createAuthorizedClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) throw new Error(GENERIC_INVITATION_ERROR);

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role, status")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.status !== "active" ||
    (profile.role !== "staff" && profile.role !== "admin")
  ) {
    throw new Error(GENERIC_INVITATION_ERROR);
  }

  return supabase;
}

async function markDelivery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  invitationId: string,
  status: "sent" | "failed",
  deliveryError: string | null,
  emailId: string | null,
) {
  const { error } = await supabase.rpc("mark_parent_invitation_delivery", {
    p_invitation_id: invitationId,
    p_delivery_status: status,
    p_delivery_error: deliveryError,
    p_resend_email_id: emailId,
  });

  return !error;
}

async function deliverInvitation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  invitationId: string,
) {
  const { data, error } = await supabase.rpc(
    "prepare_parent_invitation_delivery",
    { p_invitation_id: invitationId },
  );
  const payload = (data?.[0] ?? null) as InvitationDeliveryPayload | null;

  if (error || !payload) {
    return { ok: false as const, token: null, message: GENERIC_DELIVERY_ERROR };
  }

  try {
    const token = decryptParentInvitationToken(payload.token_ciphertext);
    const email = buildParentInvitationEmail({
      fullName: payload.full_name,
      childName: payload.child_name,
      daycareName: payload.daycare_name,
      relationship: payload.relationship,
      token,
      expiresAt: payload.expires_at,
    });
    const result = await sendResendEmail({
      to: payload.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
      idempotencyKey: getParentInvitationIdempotencyKey(invitationId),
    });

    if (!result.ok) {
      await markDelivery(supabase, invitationId, "failed", result.error, null);
      return { ok: false as const, token: null, message: GENERIC_DELIVERY_ERROR };
    }

    const marked = await markDelivery(
      supabase,
      invitationId,
      "sent",
      null,
      result.emailId,
    );

    if (!marked) {
      return { ok: false as const, token: null, message: GENERIC_DELIVERY_ERROR };
    }

    return { ok: true as const, token, message: undefined };
  } catch {
    await markDelivery(
      supabase,
      invitationId,
      "failed",
      "Email delivery failed",
      null,
    );
    return { ok: false as const, token: null, message: GENERIC_DELIVERY_ERROR };
  }
}

export async function createParentInvitation(
  _previousState: ParentInvitationActionState,
  formData: FormData,
): Promise<ParentInvitationActionState> {
  const values = readFormValues(formData);
  const childId = readText(formData, "childId");
  const existingInvitationId = readText(formData, "invitationId");
  const validation = validateForm(values);

  if (!UUID_PATTERN.test(childId)) {
    return { success: false, message: GENERIC_INVITATION_ERROR, values };
  }

  if (UUID_PATTERN.test(existingInvitationId)) {
    try {
      const supabase = await createAuthorizedClient();
      const delivery = await deliverInvitation(supabase, existingInvitationId);

      if (!delivery.ok) {
        return {
          success: false,
          message: delivery.message,
          values,
          invitationId: existingInvitationId,
        };
      }

      revalidatePath(`/kids/${childId}`);
      revalidatePath("/kids");
      return {
        success: true,
        invitationId: existingInvitationId,
        token: delivery.token ?? undefined,
      };
    } catch {
      return {
        success: false,
        message: GENERIC_DELIVERY_ERROR,
        values,
        invitationId: existingInvitationId,
      };
    }
  }

  if (!validation.data) {
    return {
      success: false,
      message: "Revisa los campos indicados.",
      errors: validation.errors,
      values,
    };
  }

  try {
    const supabase = await createAuthorizedClient();
    const token = generateParentInvitationToken();
    const { data, error } = await supabase.rpc("create_parent_invitation", {
      p_child_id: childId,
      p_full_name: validation.data.name,
      p_email: validation.data.email,
      p_relationship: validation.data.relationship,
      p_code_hash: hashParentInvitationToken(token),
      p_code_ciphertext: encryptParentInvitationToken(token),
    });

    if (error || typeof data !== "string") {
      return { success: false, message: GENERIC_INVITATION_ERROR, values };
    }

    const delivery = await deliverInvitation(supabase, data);

    if (!delivery.ok) {
      return {
        success: false,
        message: delivery.message,
        values,
        invitationId: data,
      };
    }

    revalidatePath(`/kids/${childId}`);
    revalidatePath("/kids");

    return { success: true, invitationId: data, token: delivery.token ?? undefined };
  } catch {
    return { success: false, message: GENERIC_INVITATION_ERROR, values };
  }
}

export async function retryParentInvitation(
  invitationId: string,
  previousState: ParentInvitationActionState,
  formData: FormData,
): Promise<ParentInvitationActionState> {
  void previousState;
  void formData;
  if (!UUID_PATTERN.test(invitationId)) {
    return { success: false, message: GENERIC_DELIVERY_ERROR };
  }

  try {
    const supabase = await createAuthorizedClient();
    const delivery = await deliverInvitation(supabase, invitationId);

    if (!delivery.ok) {
      return {
        success: false,
        message: delivery.message,
        invitationId,
      };
    }

    revalidatePath("/kids");
    return { success: true, invitationId, token: delivery.token ?? undefined };
  } catch {
    return { success: false, message: GENERIC_DELIVERY_ERROR, invitationId };
  }
}

export async function editParentInvitation(
  invitationId: string,
  childId: string,
  _previousState: ParentInvitationActionState,
  formData: FormData,
): Promise<ParentInvitationActionState> {
  const values = readFormValues(formData);
  const validation = validateForm(values);

  if (!UUID_PATTERN.test(invitationId) || !UUID_PATTERN.test(childId)) {
    return { success: false, message: GENERIC_UPDATE_ERROR, values };
  }

  if (!validation.data) {
    return {
      success: false,
      message: "Revisa los campos indicados.",
      errors: validation.errors,
      values,
    };
  }

  try {
    const supabase = await createAuthorizedClient();
    const { error } = await supabase.rpc("update_parent_invitation", {
      p_invitation_id: invitationId,
      p_full_name: validation.data.name,
      p_email: validation.data.email,
      p_relationship: validation.data.relationship,
    });

    if (error) {
      return { success: false, message: GENERIC_UPDATE_ERROR, values };
    }

    revalidatePath(`/kids/${childId}`);
    revalidatePath("/kids");
    return { success: true };
  } catch {
    return { success: false, message: GENERIC_UPDATE_ERROR, values };
  }
}

export async function cancelParentInvitation(
  invitationId: string,
  childId: string,
) {
  if (!UUID_PATTERN.test(invitationId) || !UUID_PATTERN.test(childId)) {
    return { success: false as const, message: GENERIC_CANCELLATION_ERROR };
  }

  try {
    const supabase = await createAuthorizedClient();
    const { error } = await supabase.rpc("cancel_parent_invitation", {
      p_invitation_id: invitationId,
    });

    if (error) {
      return { success: false as const, message: GENERIC_CANCELLATION_ERROR };
    }

    revalidatePath(`/kids/${childId}`);
    revalidatePath("/kids");
    return { success: true as const };
  } catch {
    return { success: false as const, message: GENERIC_CANCELLATION_ERROR };
  }
}

export async function getChildParentLinks(childId: string): Promise<ParentLink[]> {
  if (!UUID_PATTERN.test(childId)) return [];

  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase.rpc("get_child_parent_links", {
    p_child_id: childId,
  });

  if (error) throw new Error("No se pudieron cargar los padres vinculados.");

  return ((data ?? []) as ParentLinkRow[]).map((row) => ({
    id: row.parent_id,
    fullName: row.full_name,
    email: row.email,
    relationship: row.relationship,
    status: row.parent_status,
  }));
}

export async function getChildInvitations(
  childId: string,
): Promise<ParentInvitationSummary[]> {
  if (!UUID_PATTERN.test(childId)) return [];

  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase.rpc("get_child_invitations", {
    p_child_id: childId,
  });

  if (error) throw new Error("No se pudieron cargar las invitaciones.");

  return ((data ?? []) as ParentInvitationRow[]).map((row) => ({
    id: row.id,
    childId: row.child_id,
    fullName: row.full_name,
    email: row.email,
    relationship: row.relationship,
    status: row.status,
    deliveryStatus: row.delivery_status,
    expiresAt: row.expires_at,
    sentAt: row.sent_at,
    deliveryError: row.delivery_error,
  }));
}
