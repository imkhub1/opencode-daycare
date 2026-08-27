export type PostType =
  | "meal"
  | "nap"
  | "activity"
  | "achievement"
  | "mood"
  | "photo"
  | "announcement";

export const POST_TYPE_OPTIONS: {
  value: PostType;
  label: string;
  selected: string;
  unselected: string;
}[] = [
  { value: "meal", label: "Comida", selected: "bg-[#9a7b1e] text-white", unselected: "bg-[#f5ecd3] text-[#80651b]" },
  { value: "nap", label: "Siesta", selected: "bg-[#7b5fc0] text-white", unselected: "bg-[#e7dcf6] text-[#7b5fc0]" },
  { value: "activity", label: "Actividad", selected: "bg-[#2e89a6] text-white", unselected: "bg-[#c7e7f1] text-[#2e89a6]" },
  { value: "achievement", label: "Logro", selected: "bg-[#3e9b6c] text-white", unselected: "bg-[#cfebd8] text-[#3e9b6c]" },
  { value: "mood", label: "Ánimo", selected: "bg-[#c56486] text-white", unselected: "bg-[#f9d2de] text-[#c56486]" },
  { value: "photo", label: "Foto", selected: "bg-[#d9684a] text-white", unselected: "bg-[#fbd8cc] text-[#d9684a]" },
  { value: "announcement", label: "Anuncio", selected: "bg-[#4e72c8] text-white", unselected: "bg-[#ccd8f4] text-[#4e72c8]" },
];

export const POST_TYPE_LABELS: Record<PostType, string> = Object.fromEntries(
  POST_TYPE_OPTIONS.map((option) => [option.value, option.label]),
) as Record<PostType, string>;

export const POST_PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const POST_PHOTO_BUCKET = "post-photos";
export const MAX_POST_PHOTOS = 6;
export const MAX_POST_PHOTO_BYTES = 10 * 1024 * 1024;
export const MAX_POST_COMMENT_LENGTH = 1000;

export const POST_REACTION_OPTIONS = [
  { code: "like" },
] as const;

export type PostReactionCode = (typeof POST_REACTION_OPTIONS)[number]["code"];

export type PostReactionCounts = Record<PostReactionCode, number>;

export type PostRoom = {
  id: string;
  name: string;
};

export type PostPhoto = {
  id: string;
  url: string;
  position: number;
  mimeType: string;
};

export type FeedRecipient = {
  id: string;
  fullName: string;
};

export type PostComment = {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export type FeedPost = {
  id: string;
  authorId: string;
  authorName: string;
  roomId: string;
  roomName: string;
  type: PostType;
  body: string;
  publishedAt: string;
  createdAt: string;
  recipientChildren: FeedRecipient[];
  photos: PostPhoto[];
  reactionCounts: PostReactionCounts;
  currentUserReaction: PostReactionCode | null;
  comments: PostComment[];
};

export type PostPhotoInput = {
  mimeType: string;
  sizeBytes: number;
};

export type PreparePostInput = {
  roomId: string;
  type: PostType;
  body: string;
  photos: PostPhotoInput[];
};

export type UploadSlot = {
  id: string;
  position: number;
  path: string;
  token: string;
  mimeType: string;
};

export type PreparePostResult =
  | {
      success: true;
      postId: string;
      status: "published" | "uploading";
      uploads?: UploadSlot[];
    }
  | {
      success: false;
      message: string;
    };

export type PostActionResult =
  | {
      success: true;
      postId: string;
    }
  | {
      success: false;
      message: string;
    };

export type PostInteractionActionResult =
  | {
      success: true;
    }
  | {
      success: false;
      message: string;
    };
