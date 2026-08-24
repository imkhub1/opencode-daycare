"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/utils/supabase/server";
import {
  MAX_POST_PHOTOS,
  MAX_POST_PHOTO_BYTES,
  POST_PHOTO_BUCKET,
  POST_PHOTO_MIME_TYPES,
  type PostActionResult,
  type PostPhotoInput,
  type PostType,
  type PreparePostInput,
  type PreparePostResult,
  type UploadSlot,
} from "@/app/posts/types";
import { getCurrentAppProfile } from "@/utils/supabase/profile";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POST_TYPES = new Set<PostType>([
  "meal",
  "nap",
  "activity",
  "achievement",
  "mood",
  "photo",
  "announcement",
]);

const GENERIC_ERROR = "No se pudo guardar la publicación. Inténtalo de nuevo.";

function isPublishProfile(profile: Awaited<ReturnType<typeof getCurrentAppProfile>>) {
  return (
    profile?.status === "active" &&
    (profile.role === "staff" || profile.role === "admin")
  );
}

function readPreparePayload(data: unknown) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;

  const payload = data as Record<string, unknown>;
  const postId = payload.post_id;
  const status = payload.status;
  const rawPhotos = payload.photos;

  if (
    typeof postId !== "string" ||
    !UUID_PATTERN.test(postId) ||
    (status !== "published" && status !== "uploading") ||
    !Array.isArray(rawPhotos)
  ) {
    return null;
  }

  const photos = rawPhotos.map((value): UploadSlot | null => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;

    const photo = value as Record<string, unknown>;
    if (
      typeof photo.id !== "string" ||
      typeof photo.position !== "number" ||
      typeof photo.storage_path !== "string" ||
      typeof photo.mime_type !== "string"
    ) {
      return null;
    }

    return {
      id: photo.id,
      position: photo.position,
      path: photo.storage_path,
      token: "",
      mimeType: photo.mime_type,
    };
  });

  if (photos.some((photo) => photo === null)) return null;

  return {
    postId,
    status,
    photos: photos as UploadSlot[],
  };
}

function mapPostError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("consent")) {
    return "No se puede publicar fotos porque algún niño de la sala no tiene autorización para fotografías.";
  }
  if (normalized.includes("no active recipient") || normalized.includes("no active children")) {
    return "La sala no tiene niños activos para recibir la publicación.";
  }
  if (normalized.includes("room access") || normalized.includes("unauthorized")) {
    return "No tienes permiso para publicar en esa sala.";
  }
  if (normalized.includes("body cannot") || normalized.includes("blank")) {
    return "Escribe una descripción para la publicación.";
  }
  if (normalized.includes("type is required")) {
    return "Elige un tipo de publicación.";
  }
  if (normalized.includes("more than 6") || normalized.includes("photo")) {
    return "Revisa las fotos seleccionadas y vuelve a intentarlo.";
  }

  return GENERIC_ERROR;
}

function validatePhotoInput(photo: PostPhotoInput) {
  return (
    typeof photo === "object" &&
    photo !== null &&
    typeof photo.mimeType === "string" &&
    (POST_PHOTO_MIME_TYPES as readonly string[]).includes(photo.mimeType) &&
    Number.isInteger(photo.sizeBytes) &&
    photo.sizeBytes > 0 &&
    photo.sizeBytes <= MAX_POST_PHOTO_BYTES
  );
}

function validateInput(input: PreparePostInput) {
  if (!input || typeof input !== "object") return "La publicación no es válida.";
  if (!UUID_PATTERN.test(input.roomId)) return "Selecciona una sala válida.";
  if (!POST_TYPES.has(input.type)) return "Elige un tipo de publicación.";
  if (typeof input.body !== "string" || !input.body.trim()) {
    return "Escribe una descripción para la publicación.";
  }
  if (input.body.trim().length > 5000) {
    return "La descripción no puede superar los 5000 caracteres.";
  }
  if (!Array.isArray(input.photos) || input.photos.length > MAX_POST_PHOTOS) {
    return "Podés agregar hasta 6 fotos.";
  }
  if (input.photos.some((photo) => !validatePhotoInput(photo))) {
    return "Una o más fotos no son válidas. Usa imágenes de hasta 10 MB.";
  }

  return null;
}

export async function preparePost(input: PreparePostInput): Promise<PreparePostResult> {
  const validationError = validateInput(input);
  if (validationError) return { success: false, message: validationError };

  const profile = await getCurrentAppProfile();
  if (!isPublishProfile(profile)) {
    return { success: false, message: "No tienes permiso para crear publicaciones." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("prepare_post", {
    p_room_id: input.roomId,
    p_type: input.type,
    p_body: input.body.trim(),
    p_photos: input.photos.map((photo) => ({
      mime_type: photo.mimeType,
      size_bytes: photo.sizeBytes,
    })),
  });

  if (error) return { success: false, message: mapPostError(error.message) };

  const payload = readPreparePayload(data);
  if (!payload) return { success: false, message: GENERIC_ERROR };

  if (payload.status === "published") {
    revalidatePath("/staff");
    return { success: true, postId: payload.postId, status: "published" };
  }

  const uploads: UploadSlot[] = [];
  for (const slot of payload.photos) {
    const { data: signedUpload, error: signedUploadError } = await supabase.storage
      .from(POST_PHOTO_BUCKET)
      .createSignedUploadUrl(slot.path);

    if (signedUploadError || !signedUpload?.token) {
      await supabase.rpc("abort_post", { p_post_id: payload.postId });
      return { success: false, message: GENERIC_ERROR };
    }

    uploads.push({ ...slot, token: signedUpload.token });
  }

  if (uploads.length !== input.photos.length) {
    await supabase.rpc("abort_post", { p_post_id: payload.postId });
    return { success: false, message: GENERIC_ERROR };
  }

  return {
    success: true,
    postId: payload.postId,
    status: "uploading",
    uploads,
  };
}

export async function finalizePost(postId: string): Promise<PostActionResult> {
  if (!UUID_PATTERN.test(postId)) return { success: false, message: GENERIC_ERROR };

  const profile = await getCurrentAppProfile();
  if (!isPublishProfile(profile)) {
    return { success: false, message: "No tienes permiso para publicar." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("finalize_post", {
    p_post_id: postId,
  });

  if (error) return { success: false, message: mapPostError(error.message) };

  const payload = data as { post_id?: unknown } | null;
  if (!payload || payload.post_id !== postId) {
    return { success: false, message: GENERIC_ERROR };
  }

  revalidatePath("/staff");
  revalidatePath("/staff/crear-publicacion");
  return { success: true, postId };
}

export async function abortPost(postId: string): Promise<PostActionResult> {
  if (!UUID_PATTERN.test(postId)) return { success: false, message: GENERIC_ERROR };

  const profile = await getCurrentAppProfile();
  if (!isPublishProfile(profile)) {
    return { success: false, message: "No tienes permiso para cancelar esta publicación." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("abort_post", { p_post_id: postId });
  if (error) return { success: false, message: GENERIC_ERROR };

  return { success: true, postId };
}
