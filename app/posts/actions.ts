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
import { getServerDictionary } from "@/utils/i18n/server";
import { getDictionary, DEFAULT_LOCALE } from "@/utils/i18n/dictionary";

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

function mapPostError(message: string, dictionary = getDictionary(DEFAULT_LOCALE)) {
  const normalized = message.toLowerCase();

  if (normalized.includes("consent")) {
    return dictionary.actions.posts.photoConsent;
  }
  if (normalized.includes("no active recipient") || normalized.includes("no active children")) {
    return dictionary.actions.posts.noActiveRecipients;
  }
  if (normalized.includes("room access") || normalized.includes("unauthorized")) {
    return dictionary.actions.posts.roomAccess;
  }
  if (normalized.includes("body cannot") || normalized.includes("blank")) {
    return dictionary.actions.posts.bodyRequired;
  }
  if (normalized.includes("type is required")) {
    return dictionary.actions.posts.typeRequired;
  }
  if (normalized.includes("more than 6") || normalized.includes("photo")) {
    return dictionary.actions.posts.photosInvalid;
  }

  return dictionary.actions.posts.generic;
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

function validateInput(input: PreparePostInput, dictionary = getDictionary(DEFAULT_LOCALE)) {
  if (!input || typeof input !== "object") return dictionary.actions.posts.invalidPost;
  if (!UUID_PATTERN.test(input.roomId)) return dictionary.actions.posts.roomRequired;
  if (!POST_TYPES.has(input.type)) return dictionary.actions.posts.typeRequired;
  if (typeof input.body !== "string" || !input.body.trim()) {
    return dictionary.actions.posts.bodyRequired;
  }
  if (input.body.trim().length > 5000) {
    return dictionary.actions.posts.descriptionTooLong;
  }
  if (!Array.isArray(input.photos) || input.photos.length > MAX_POST_PHOTOS) {
    return dictionary.actions.posts.maxPhotos;
  }
  if (input.photos.some((photo) => !validatePhotoInput(photo))) {
    return dictionary.actions.posts.invalidPhotos;
  }

  return null;
}

export async function preparePost(input: PreparePostInput): Promise<PreparePostResult> {
  const dictionary = await getServerDictionary();
  const genericError = dictionary.actions.posts.generic;
  const validationError = validateInput(input, dictionary);
  if (validationError) return { success: false, message: validationError };

  const profile = await getCurrentAppProfile();
  if (!isPublishProfile(profile)) {
    return { success: false, message: dictionary.actions.posts.createPermission };
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

  if (error) return { success: false, message: mapPostError(error.message, dictionary) };

  const payload = readPreparePayload(data);
  if (!payload) return { success: false, message: genericError };

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
      return { success: false, message: genericError };
    }

    uploads.push({ ...slot, token: signedUpload.token });
  }

  if (uploads.length !== input.photos.length) {
    await supabase.rpc("abort_post", { p_post_id: payload.postId });
    return { success: false, message: genericError };
  }

  return {
    success: true,
    postId: payload.postId,
    status: "uploading",
    uploads,
  };
}

export async function finalizePost(postId: string): Promise<PostActionResult> {
  const dictionary = await getServerDictionary();
  const genericError = dictionary.actions.posts.generic;
  if (!UUID_PATTERN.test(postId)) return { success: false, message: genericError };

  const profile = await getCurrentAppProfile();
  if (!isPublishProfile(profile)) {
    return { success: false, message: dictionary.actions.posts.publishPermission };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("finalize_post", {
    p_post_id: postId,
  });

  if (error) return { success: false, message: mapPostError(error.message, dictionary) };

  const payload = data as { post_id?: unknown } | null;
  if (!payload || payload.post_id !== postId) {
    return { success: false, message: genericError };
  }

  revalidatePath("/staff");
  revalidatePath("/staff/crear-publicacion");
  return { success: true, postId };
}

export async function abortPost(postId: string): Promise<PostActionResult> {
  const dictionary = await getServerDictionary();
  const genericError = dictionary.actions.posts.generic;
  if (!UUID_PATTERN.test(postId)) return { success: false, message: genericError };

  const profile = await getCurrentAppProfile();
  if (!isPublishProfile(profile)) {
    return { success: false, message: dictionary.actions.posts.abortPermission };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("abort_post", { p_post_id: postId });
  if (error) return { success: false, message: genericError };

  return { success: true, postId };
}

export async function deletePost(
  postId: string,
  _previousState: PostActionResult,
): Promise<PostActionResult> {
  const dictionary = await getServerDictionary();
  const deleteError = dictionary.actions.posts.delete;
  void _previousState;

  if (!UUID_PATTERN.test(postId)) return { success: false, message: deleteError };

  const supabase = await createClient();
  const { data: postPhotoRows, error: photoError } = await supabase
    .from("post_photos")
    .select("storage_path")
    .eq("post_id", postId);

  if (photoError) {
    return { success: false, message: deleteError };
  }

  const photoPaths = (postPhotoRows ?? []).map((photo) => photo.storage_path);

  if (photoPaths.some((path) => typeof path !== "string" || path.length === 0)) {
    return { success: false, message: deleteError };
  }

  if (photoPaths.length > 0) {
    const { data: removedPhotos, error: storageError } = await supabase.storage
      .from(POST_PHOTO_BUCKET)
      .remove(photoPaths);

    if (
      storageError ||
      !removedPhotos ||
      removedPhotos.length !== photoPaths.length ||
      new Set(removedPhotos.map((photo) => photo.name)).size !== photoPaths.length ||
      photoPaths.some((path) => !removedPhotos.some((photo) => photo.name === path))
    ) {
      return { success: false, message: deleteError };
    }
  }

  const { data, error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { success: false, message: dictionary.actions.posts.deletePermission };
  }

  revalidatePath("/staff");
  revalidatePath("/family");
  return { success: true, postId };
}
