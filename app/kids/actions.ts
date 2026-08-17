"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/utils/supabase/server";

const AUTHORIZATION_ERROR = "No tienes permiso para gestionar niños.";
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
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(AUTHORIZATION_ERROR);
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
    throw new Error(AUTHORIZATION_ERROR);
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

function validateChild(values: ChildFormValues): {
  errors: Partial<Record<keyof ChildFormValues, string>>;
  data?: ChildWrite;
} {
  const errors: Partial<Record<keyof ChildFormValues, string>> = {};
  const fullName = values.fullName.trim();
  const birthDate = parseBirthDate(values.birthDate);
  const enrolledAt = values.enrolledAt.trim();

  if (!fullName) errors.fullName = "Escribe el nombre completo.";
  if (!birthDate) errors.birthDate = "Usa una fecha válida en formato DD/MM/AAAA.";
  if (!validIsoDate(enrolledAt)) {
    errors.enrolledAt = "Selecciona una fecha de inscripción válida.";
  }
  if (!UUID_PATTERN.test(values.roomId)) {
    errors.roomId = "Selecciona una sala válida.";
  }

  if (birthDate && validIsoDate(enrolledAt)) {
    if (birthDate >= enrolledAt) {
      errors.birthDate = "El nacimiento debe ser anterior a la inscripción.";
    } else if (enrolledAt > new Date().toISOString().slice(0, 10)) {
      errors.enrolledAt = "La inscripción no puede ser posterior a hoy.";
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
  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase
    .from("rooms")
    .select("id, name")
    .order("name");

  if (error) throw new Error("No se pudieron cargar las salas.");
  return data;
}

export async function getChildren(status: ChildStatus = "active"): Promise<Child[]> {
  if (status !== "active" && status !== "archived") {
    throw new Error("La vista de niños solicitada no es válida.");
  }

  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase
    .from("children")
    .select(
      "id, room_id, full_name, birth_date, enrolled_at, medical_notes, allergy_tags, photo_consent, status, created_at, updated_at, rooms!inner(id, name)",
    )
    .eq("status", status)
    .order("full_name");

  if (error) throw new Error("No se pudieron cargar los niños.");
  return data.map(mapChild);
}

export async function getChild(childId: string): Promise<Child | null> {
  if (!UUID_PATTERN.test(childId)) return null;

  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase
    .from("children")
    .select(
      "id, room_id, full_name, birth_date, enrolled_at, medical_notes, allergy_tags, photo_consent, status, created_at, updated_at, rooms!inner(id, name)",
    )
    .eq("id", childId)
    .maybeSingle();

  if (error) throw new Error("No se pudo cargar el niño.");
  return data ? mapChild(data) : null;
}

export async function createChild(
  _previousState: ChildFormState,
  formData: FormData,
): Promise<ChildFormState> {
  const values = readChildFormValues(formData);
  const validation = validateChild(values);

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
    const { data, error } = await supabase
      .from("children")
      .insert(validation.data)
      .select("id")
      .single();

    if (error || !data) {
      return {
        success: false,
        message: "No se pudo guardar el niño. Inténtalo de nuevo.",
        values,
      };
    }

    revalidatePath("/kids");
    return { success: true, childId: data.id };
  } catch {
    return { success: false, message: AUTHORIZATION_ERROR, values };
  }
}

export async function updateChild(
  childId: string,
  _previousState: ChildFormState,
  formData: FormData,
): Promise<ChildFormState> {
  const values = readChildFormValues(formData);
  const validation = validateChild(values);

  if (!UUID_PATTERN.test(childId)) {
    return {
      success: false,
      message: "El niño no existe o no está disponible.",
      values,
    };
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
    const { data, error } = await supabase
      .from("children")
      .update(validation.data)
      .eq("id", childId)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return {
        success: false,
        message: "El niño no existe o no está disponible.",
        values,
      };
    }

    revalidatePath("/kids");
    revalidatePath(`/kids/${childId}`);
    revalidatePath(`/kids/${childId}/edit`);
    return { success: true, childId: data.id };
  } catch {
    return { success: false, message: AUTHORIZATION_ERROR, values };
  }
}

async function changeChildStatus(
  childId: string,
  from: ChildStatus,
  to: ChildStatus,
): Promise<ChildLifecycleState> {
  if (!UUID_PATTERN.test(childId)) {
    return { success: false, message: "El niño no existe o no está disponible." };
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
      return { success: false, message: "El niño no existe o no está disponible." };
    }

    revalidatePath("/kids");
    revalidatePath(`/kids/${childId}`);
    return { success: true, message: "", childId: data.id, status: to };
  } catch {
    return { success: false, message: AUTHORIZATION_ERROR };
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
