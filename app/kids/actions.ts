"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import { getServerDictionary } from "@/utils/i18n/server";
import type { Dictionary } from "@/utils/i18n/dictionary";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALLERGY_TRANSLATIONS: Record<string, string> = {
  maní: "peanut",
  lactosa: "lactose",
  gluten: "gluten",
  huevo: "egg",
  leche: "milk",
  soya: "soy",
  "frutos secos": "tree-nuts",
};

export type ChildStatus = "active" | "archived";

export type Room = {
  id: string;
  name: string;
};

export type Child = {
  id: string;
  roomId: string;
  roomName: string;
  fullName: string;
  birthDate: string;
  enrolledAt: string;
  medicalNotes: string | null;
  allergyTags: string[];
  photoConsent: boolean;
  status: ChildStatus;
  createdAt: string;
  updatedAt: string;
};

export type ChildFormValues = {
  fullName: string;
  birthDate: string;
  enrolledAt: string;
  roomId: string;
  allergies: string;
  medicalNotes: string;
  photoConsent: boolean;
};

export type ChildFormState = {
  success: boolean;
  message?: string;
  errors?: Partial<Record<keyof ChildFormValues, string>>;
  values?: ChildFormValues;
  childId?: string;
};

export type ChildLifecycleState = {
  success: boolean;
  message: string;
  childId?: string;
  status?: ChildStatus;
};

export type ChildRoomMoveState =
  | {
      success: true;
      childId: string;
      roomId: string;
    }
  | {
      success: false;
      message: string;
    };

export type ChildDeletionState = {
  success: boolean;
  message?: string;
  childId?: string;
};

type ChildWrite = {
  room_id: string;
  full_name: string;
  birth_date: string;
  enrolled_at: string;
  medical_notes: string | null;
  allergy_tags: string[];
  photo_consent: boolean;
};

async function createAuthorizedClient() {
  const authorizationError = (await getServerDictionary()).actions.authorizationError;
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(authorizationError);
  }

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
    throw new Error(authorizationError);
  }

  return supabase;
}

function readText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function readCheckbox(formData: FormData, name: string) {
  return formData
    .getAll(name)
    .some(
      (value) =>
        typeof value === "string" &&
        ["on", "true", "1"].includes(value.toLowerCase()),
    );
}

function readChildFormValues(formData: FormData): ChildFormValues {
  return {
    fullName: readText(formData, "fullName"),
    birthDate: readText(formData, "birthDate"),
    enrolledAt: readText(formData, "enrolledAt"),
    roomId: readText(formData, "roomId"),
    allergies: readText(formData, "allergies"),
    medicalNotes: readText(formData, "medicalNotes"),
    photoConsent: readCheckbox(formData, "photoConsent"),
  };
}

function validIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match || Number(match[1]) < 1) return false;

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parseBirthDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;

  const isoDate = `${match[3]}-${match[2]}-${match[1]}`;
  return validIsoDate(isoDate) ? isoDate : null;
}

function normalizeAllergies(value: string) {
  return [
    ...new Set(
      value
        .split(",")
        .map((allergy) => allergy.trim().toLowerCase())
        .filter(Boolean)
        .map((allergy) => ALLERGY_TRANSLATIONS[allergy] ?? allergy),
    ),
  ];
}

function validateChild(values: ChildFormValues, dictionary: Dictionary): {
  errors: Partial<Record<keyof ChildFormValues, string>>;
  data?: ChildWrite;
} {
  const errors: Partial<Record<keyof ChildFormValues, string>> = {};
  const fullName = values.fullName.trim();
  const birthDate = parseBirthDate(values.birthDate);
  const enrolledAt = values.enrolledAt.trim();

  if (!fullName) errors.fullName = dictionary.kids.validation.fullName;
  if (!birthDate) errors.birthDate = dictionary.kids.validation.birthDate;
  if (!validIsoDate(enrolledAt)) {
    errors.enrolledAt = dictionary.kids.validation.enrollmentDate;
  }
  if (!UUID_PATTERN.test(values.roomId)) {
    errors.roomId = dictionary.kids.validation.room;
  }

  if (birthDate && validIsoDate(enrolledAt)) {
    if (birthDate >= enrolledAt) {
      errors.birthDate = dictionary.kids.validation.birthBeforeEnrollment;
    } else if (enrolledAt > new Date().toISOString().slice(0, 10)) {
      errors.enrolledAt = dictionary.kids.validation.enrollmentAfterToday;
    }
  }

  if (Object.keys(errors).length > 0 || !birthDate) return { errors };

  return {
    errors,
    data: {
      room_id: values.roomId,
      full_name: fullName,
      birth_date: birthDate,
      enrolled_at: enrolledAt,
      medical_notes: values.medicalNotes.trim() || null,
      allergy_tags: normalizeAllergies(values.allergies),
      photo_consent: values.photoConsent,
    },
  };
}

function mapChild(row: {
  id: string;
  room_id: string;
  full_name: string;
  birth_date: string;
  enrolled_at: string;
  medical_notes: string | null;
  allergy_tags: string[];
  photo_consent: boolean;
  status: ChildStatus;
  created_at: string;
  updated_at: string;
  rooms: { id: string; name: string } | { id: string; name: string }[];
}): Child {
  const room = Array.isArray(row.rooms) ? row.rooms[0] : row.rooms;

  return {
    id: row.id,
    roomId: row.room_id,
    roomName: room.name,
    fullName: row.full_name,
    birthDate: row.birth_date,
    enrolledAt: row.enrolled_at,
    medicalNotes: row.medical_notes,
    allergyTags: row.allergy_tags,
    photoConsent: row.photo_consent,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getRooms(): Promise<Room[]> {
  const dictionary = await getServerDictionary();
  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase
    .from("rooms")
    .select("id, name")
    .order("name");

  if (error) throw new Error(dictionary.actions.children.loadRooms);
  return data;
}

export async function getChildren(status: ChildStatus = "active"): Promise<Child[]> {
  const dictionary = await getServerDictionary();
  if (status !== "active" && status !== "archived") {
    throw new Error(dictionary.actions.children.invalidView);
  }

  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase
    .from("children")
    .select(
      "id, room_id, full_name, birth_date, enrolled_at, medical_notes, allergy_tags, photo_consent, status, created_at, updated_at, rooms!inner(id, name)",
    )
    .eq("status", status)
    .order("full_name");

  if (error) throw new Error(dictionary.actions.children.loadChildren);
  return data.map(mapChild);
}

export async function getChild(childId: string): Promise<Child | null> {
  const dictionary = await getServerDictionary();
  if (!UUID_PATTERN.test(childId)) return null;

  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase
    .from("children")
    .select(
      "id, room_id, full_name, birth_date, enrolled_at, medical_notes, allergy_tags, photo_consent, status, created_at, updated_at, rooms!inner(id, name)",
    )
    .eq("id", childId)
    .maybeSingle();

  if (error) throw new Error(dictionary.actions.children.loadChild);
  return data ? mapChild(data) : null;
}

export async function createChild(
  _previousState: ChildFormState,
  formData: FormData,
): Promise<ChildFormState> {
  const dictionary = await getServerDictionary();
  const values = readChildFormValues(formData);
  const validation = validateChild(values, dictionary);

  if (!validation.data) {
    return {
      success: false,
       message: dictionary.actions.children.reviewFields,
      errors: validation.errors,
      values,
    };
  }

  try {
    const supabase = await createAuthorizedClient();
    const { data, error } = await supabase
      .from("children")
      .insert(validation.data)
      .select("id")
      .single();

    if (error || !data) {
      return {
        success: false,
        message: dictionary.actions.children.saveChild,
        values,
      };
    }

    revalidatePath("/staff/kids");
    return { success: true, childId: data.id };
  } catch {
    return { success: false, message: dictionary.actions.authorizationError, values };
  }
}

export async function updateChild(
  childId: string,
  _previousState: ChildFormState,
  formData: FormData,
): Promise<ChildFormState> {
  const dictionary = await getServerDictionary();
  const values = readChildFormValues(formData);
  const validation = validateChild(values, dictionary);

  if (!UUID_PATTERN.test(childId)) {
    return {
      success: false,
       message: dictionary.actions.children.unavailableChild,
      values,
    };
  }

  if (!validation.data) {
    return {
      success: false,
       message: dictionary.actions.children.reviewFields,
      errors: validation.errors,
      values,
    };
  }

  try {
    const supabase = await createAuthorizedClient();
    const { data, error } = await supabase
      .from("children")
      .update(validation.data)
      .eq("id", childId)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return {
        success: false,
        message: dictionary.actions.children.unavailableChild,
        values,
      };
    }

    revalidatePath("/staff/kids");
    revalidatePath(`/staff/kids/${childId}`);
    revalidatePath(`/staff/kids/${childId}/edit`);
    return { success: true, childId: data.id };
  } catch {
    return { success: false, message: dictionary.actions.authorizationError, values };
  }
}

export async function moveChildToRoom(
  childId: string,
  roomId: string,
): Promise<ChildRoomMoveState> {
  const dictionary = await getServerDictionary();

  if (!UUID_PATTERN.test(childId) || !UUID_PATTERN.test(roomId)) {
    return { success: false, message: dictionary.actions.children.unavailableChild };
  }

  try {
    const supabase = await createAuthorizedClient();
    const { data: child, error: childError } = await supabase
      .from("children")
      .select("room_id")
      .eq("id", childId)
      .maybeSingle();

    if (childError || !child) {
      return { success: false, message: dictionary.actions.children.unavailableChild };
    }

    if (child.room_id === roomId) {
      return { success: true, childId, roomId };
    }

    const { data: destinationRoom, error: destinationRoomError } = await supabase
      .from("rooms")
      .select("id")
      .eq("id", roomId)
      .maybeSingle();

    if (destinationRoomError || !destinationRoom) {
      return { success: false, message: dictionary.actions.children.moveChild };
    }

    const { data, error } = await supabase
      .from("children")
      .update({ room_id: destinationRoom.id })
      .eq("id", childId)
      .eq("room_id", child.room_id)
      .select("id, room_id")
      .maybeSingle();

    if (error || !data) {
      return { success: false, message: dictionary.actions.children.moveChild };
    }

    revalidatePath("/staff/kids");
    revalidatePath(`/staff/kids/${childId}`);
    return { success: true, childId: data.id, roomId: data.room_id };
  } catch {
    return { success: false, message: dictionary.actions.authorizationError };
  }
}

async function changeChildStatus(
  childId: string,
  from: ChildStatus,
  to: ChildStatus,
): Promise<ChildLifecycleState> {
  const dictionary = await getServerDictionary();
  if (!UUID_PATTERN.test(childId)) {
    return { success: false, message: dictionary.actions.children.unavailableChild };
  }

  try {
    const supabase = await createAuthorizedClient();
    const { data, error } = await supabase
      .from("children")
      .update({ status: to })
      .eq("id", childId)
      .eq("status", from)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return { success: false, message: dictionary.actions.children.unavailableChild };
    }

    revalidatePath("/staff/kids");
    revalidatePath(`/staff/kids/${childId}`);
    return { success: true, message: "", childId: data.id, status: to };
  } catch {
    return { success: false, message: dictionary.actions.authorizationError };
  }
}

export async function archiveChild(
  childId: string,
  _previousState: ChildLifecycleState,
): Promise<ChildLifecycleState> {
  void _previousState;
  return changeChildStatus(childId, "active", "archived");
}

export async function restoreChild(
  childId: string,
  _previousState: ChildLifecycleState,
): Promise<ChildLifecycleState> {
  void _previousState;
  return changeChildStatus(childId, "archived", "active");
}

export async function deleteChild(
  childId: string,
  _previousState: ChildDeletionState,
  formData: FormData,
): Promise<ChildDeletionState> {
  void _previousState;
  const dictionary = await getServerDictionary();
  const confirmationName = readText(formData, "confirmationName");

  if (!UUID_PATTERN.test(childId)) {
    return { success: false, message: dictionary.actions.children.unavailableChild };
  }

  try {
    const supabase = await createAuthorizedClient();
    const { data: child, error: childError } = await supabase
      .from("children")
      .select("full_name, rooms!inner(id)")
      .eq("id", childId)
      .maybeSingle();

    if (childError || !child) {
      return { success: false, message: dictionary.actions.children.unavailableChild };
    }

    if (confirmationName !== child.full_name) {
      return {
        success: false,
        message: dictionary.actions.children.exactName,
      };
    }

    const { data, error } = await supabase.rpc("delete_child", {
      p_child_id: childId,
    });

    if (error || data !== true) {
      return { success: false, message: dictionary.actions.children.deleteChild };
    }

  } catch {
    return { success: false, message: dictionary.actions.children.deleteChild };
  }

  revalidatePath("/staff/kids");
  redirect("/staff/kids");
}
