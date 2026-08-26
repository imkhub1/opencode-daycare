import { createClient } from "@/utils/supabase/server";
import { getCurrentAppProfile, type AppProfile } from "@/utils/supabase/profile";
import { getServerDictionary } from "@/utils/i18n/server";
import {
  POST_PHOTO_BUCKET,
  POST_TYPE_OPTIONS,
  type FeedPost,
  type FeedRecipient,
  type PostPhoto,
  type PostRoom,
  type PostType,
} from "@/app/posts/types";

const POST_TYPES = new Set<PostType>(POST_TYPE_OPTIONS.map((option) => option.value));

function isPublishProfile(
  profile: AppProfile | null,
): profile is AppProfile & { role: "staff" | "admin"; status: "active" } {
  return (
    profile?.status === "active" &&
    (profile.role === "staff" || profile.role === "admin")
  );
}

export async function getPostRooms(
  profile: AppProfile | null = null,
): Promise<PostRoom[]> {
  const dictionary = await getServerDictionary();
  const currentProfile = profile ?? (await getCurrentAppProfile());
  if (!isPublishProfile(currentProfile)) return [];

  const supabase = await createClient();
  const { data: roomRows, error: roomError } = await supabase
    .from("rooms")
    .select("id, name")
    .order("name");

  if (roomError) throw new Error(dictionary.actions.posts.loadRooms);

  const rooms = (roomRows ?? []) as PostRoom[];
  if (currentProfile.role === "admin") return rooms;

  const { data: assignments, error: assignmentError } = await supabase
    .from("room_staff")
    .select("room_id")
    .eq("user_id", currentProfile.id);

  if (assignmentError) throw new Error(dictionary.actions.posts.loadAssignedRooms);

  const assignedRoomIds = new Set(
    ((assignments ?? []) as { room_id: string }[]).map((assignment) => assignment.room_id),
  );
  return rooms.filter((room) => assignedRoomIds.has(room.id));
}

function parseRecipient(value: unknown): FeedRecipient | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const recipient = value as Record<string, unknown>;
  if (typeof recipient.id !== "string" || typeof recipient.full_name !== "string") return null;
  return { id: recipient.id, fullName: recipient.full_name };
}

function parsePhoto(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const photo = value as Record<string, unknown>;
  if (
    typeof photo.id !== "string" ||
    typeof photo.storage_path !== "string" ||
    typeof photo.position !== "number" ||
    typeof photo.mime_type !== "string"
  ) {
    return null;
  }

  return {
    id: photo.id,
    storagePath: photo.storage_path,
    position: photo.position,
    mimeType: photo.mime_type,
  };
}

function parseFeedPost(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const post = value as Record<string, unknown>;
  const recipients = Array.isArray(post.recipient_children)
    ? post.recipient_children.map(parseRecipient).filter((item): item is FeedRecipient => item !== null)
    : [];
  const photos = Array.isArray(post.photos)
    ? post.photos.map(parsePhoto).filter((item): item is NonNullable<ReturnType<typeof parsePhoto>> => item !== null)
    : [];

  if (
    typeof post.id !== "string" ||
    typeof post.author_id !== "string" ||
    typeof post.author_name !== "string" ||
    typeof post.room_id !== "string" ||
    typeof post.room_name !== "string" ||
    typeof post.type !== "string" ||
    !POST_TYPES.has(post.type as PostType) ||
    typeof post.body !== "string" ||
    typeof post.published_at !== "string" ||
    typeof post.created_at !== "string"
  ) {
    return null;
  }

  return {
    id: post.id,
    authorId: post.author_id,
    authorName: post.author_name,
    roomId: post.room_id,
    roomName: post.room_name,
    type: post.type as PostType,
    body: post.body,
    publishedAt: post.published_at,
    createdAt: post.created_at,
    recipientChildren: recipients,
    photos,
  };
}

export async function getFeedPosts(): Promise<FeedPost[]> {
  const dictionary = await getServerDictionary();
  const profile = await getCurrentAppProfile();
  if (!profile?.status || !profile.role) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_feed_posts", {
    p_room_id: null,
    p_limit: 50,
    p_offset: 0,
  });

  if (error) throw new Error(dictionary.actions.posts.loadFeed);

  const rawPosts = Array.isArray(data) ? data : [];
  const parsedPosts = rawPosts
    .map(parseFeedPost)
    .filter(
      (post): post is NonNullable<ReturnType<typeof parseFeedPost>> => post !== null,
    );

  return Promise.all(
    parsedPosts.map(async (post) => {
      const signedPhotos = await Promise.all(
        post.photos.map(async (photo): Promise<PostPhoto | null> => {
          const { data: signedUrl, error: signedUrlError } = await supabase.storage
            .from(POST_PHOTO_BUCKET)
            .createSignedUrl(photo.storagePath, 60 * 60);

          if (signedUrlError || !signedUrl?.signedUrl) return null;
          return {
            id: photo.id,
            url: signedUrl.signedUrl,
            position: photo.position,
            mimeType: photo.mimeType,
          };
        }),
      );

      return {
        ...post,
        photos: signedPhotos.filter((photo): photo is PostPhoto => photo !== null),
      };
    }),
  );
}
