"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";

import {
  abortPost,
  finalizePost,
  preparePost,
} from "@/app/posts/actions";
import {
  MAX_POST_PHOTOS,
  MAX_POST_PHOTO_BYTES,
  POST_PHOTO_BUCKET,
  POST_PHOTO_MIME_TYPES,
  POST_TYPE_OPTIONS,
  type PostRoom,
  type PostType,
} from "@/app/posts/types";
import { createClient } from "@/utils/supabase/client";
import { Icon } from "@/components/open-daycare";
import { useLocale } from "@/components/shared/LocaleProvider";
import { interpolate } from "@/utils/i18n/dictionary";

type LocalPhoto = {
  id: string;
  file: File;
  previewUrl: string;
};

type FormErrors = {
  room?: string;
  type?: string;
  description?: string;
  photos?: string;
};

export function CreatePost({
  rooms,
  variant = "modal",
  onCancel,
  onSuccess,
}: {
  rooms: PostRoom[];
  variant?: "modal" | "page";
  onCancel?: () => void;
  onSuccess?: () => void;
}) {
  const { dictionary } = useLocale();
  const router = useRouter();
  const [roomId, setRoomId] = useState(rooms.length === 1 ? rooms[0].id : "");
  const [type, setType] = useState<PostType | null>(null);
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const roomRef = useRef<HTMLSelectElement>(null);
  const typeRef = useRef<HTMLButtonElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<LocalPhoto[]>([]);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    return () => {
      photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    };
  }, []);

  useEffect(() => {
    if (variant !== "modal") return;

    const timer = requestAnimationFrame(() => {
      if (dialogRef.current) {
        const firstFocusable = dialogRef.current.querySelector<HTMLElement>(
          'button:not([disabled]), select:not([disabled]), textarea:not([disabled]), input:not([disabled])'
        );
        firstFocusable?.focus();
      }
    });

    return () => {
      cancelAnimationFrame(timer);
    };
  }, [variant]);

  useEffect(() => {
    if (variant !== "modal") return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        if (onCancel) onCancel();
        else router.push("/staff");
        return;
      }

      if (event.key === "Tab" && dialogRef.current) {
        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSubmitting, onCancel, router, variant]);

  function resetForm() {
    photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    photosRef.current = [];
    setRoomId(rooms.length === 1 ? rooms[0].id : "");
    setType(null);
    setDescription("");
    setPhotos([]);
    setErrors({});
    setSubmitError(null);
    setIsDragging(false);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function closeForm() {
    if (isSubmitting) return;
    resetForm();
    if (onCancel) onCancel();
    else router.push("/staff");
  }

  function addFiles(files: File[]) {
    const validFiles: File[] = [];
    const messages: string[] = [];

    files.forEach((file) => {
      if (!(POST_PHOTO_MIME_TYPES as readonly string[]).includes(file.type)) {
        messages.push(interpolate(dictionary.posts.compatibleImage, { name: file.name }));
      } else if (file.size > MAX_POST_PHOTO_BYTES) {
        messages.push(interpolate(dictionary.posts.photoTooLarge, { name: file.name }));
      } else {
        validFiles.push(file);
      }
    });

    const availableSlots = MAX_POST_PHOTOS - photos.length;
    if (validFiles.length > availableSlots) messages.push(dictionary.posts.maxPhotos);

    const newPhotos = validFiles
      .slice(0, Math.max(availableSlots, 0))
      .map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      }));

    setPhotos((current) => [...current, ...newPhotos]);
    setErrors((current) => ({ ...current, photos: messages.join(" ") || undefined }));
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  }

  function removePhoto(id: string) {
    const photo = photos.find((item) => item.id === id);
    if (photo) URL.revokeObjectURL(photo.previewUrl);
    setPhotos((current) => current.filter((item) => item.id !== id));
    setErrors((current) => ({ ...current, photos: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FormErrors = {};

    if (!roomId) nextErrors.room = dictionary.posts.roomRequired;
    if (!type) nextErrors.type = dictionary.posts.typeRequired;
    if (!description.trim()) nextErrors.description = dictionary.posts.descriptionRequired;

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      if (nextErrors.room) roomRef.current?.focus();
      else if (nextErrors.type) typeRef.current?.focus();
      else descriptionRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setUploadProgress(0);

    const prepared = await preparePost({
      roomId,
      type: type!,
      body: description,
      photos: photos.map((photo) => ({
        mimeType: photo.file.type,
        sizeBytes: photo.file.size,
      })),
    });

    if (!prepared.success) {
      setSubmitError(prepared.message);
      setIsSubmitting(false);
      return;
    }

    if (prepared.status === "uploading") {
      const uploads = prepared.uploads ?? [];
      const supabase = createClient();

      for (const [index, slot] of uploads.entries()) {
        const photo = photos[index];
        if (!photo) {
          await abortPost(prepared.postId);
          setSubmitError(dictionary.posts.noPhotosPrepared);
          setIsSubmitting(false);
          return;
        }

        const { error } = await supabase.storage
          .from(POST_PHOTO_BUCKET)
          .uploadToSignedUrl(slot.path, slot.token, photo.file, {
            contentType: photo.file.type,
            upsert: false,
          });

        if (error) {
          await abortPost(prepared.postId);
          setSubmitError(dictionary.posts.photoUploadFailed);
          setIsSubmitting(false);
          return;
        }

        setUploadProgress(index + 1);
      }

      const finalized = await finalizePost(prepared.postId);
      if (!finalized.success) {
        await abortPost(prepared.postId);
        setSubmitError(finalized.message);
        setIsSubmitting(false);
        return;
      }
    }

    setIsSubmitting(false);
    resetForm();
    if (onSuccess) onSuccess();
    else router.push("/staff");
  }

  const content = (
    <form onSubmit={handleSubmit} noValidate>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-canvas px-5 py-5 sm:px-[26px]">
        <button className="text-sm font-bold text-muted" type="button" onClick={closeForm} disabled={isSubmitting}>
          {dictionary.posts.cancel}
        </button>
        <h1 id="create-post-title" className="font-display text-lg font-semibold text-ink">{dictionary.posts.title}</h1>
        <button className="text-sm font-extrabold text-coral-deep disabled:opacity-50" type="submit" disabled={isSubmitting}>
          {isSubmitting ? dictionary.posts.saving : dictionary.posts.publish}
        </button>
      </header>

      <div className="p-5 sm:p-[26px]">
        {submitError && (
          <p className="mb-5 rounded-xl border border-coral-border bg-coral-faint px-3.5 py-3 text-sm font-bold text-coral-strong" role="alert">
            {submitError}
          </p>
        )}

        <fieldset className="mb-[22px]">
          <legend className="mb-2.5 text-xs font-extrabold tracking-[0.7px] text-muted">{dictionary.posts.to}</legend>
          {rooms.length === 1 ? (
            <p className="inline-flex items-center rounded-full border-1.5 border-ink bg-ink px-4 py-2 text-sm font-bold text-canvas">
              {interpolate(dictionary.posts.wholeRoom, { room: rooms[0].name })}
            </p>
          ) : (
            <>
              <label className="sr-only" htmlFor="post-room">{dictionary.posts.selectRoom}</label>
              <select
                ref={roomRef}
                id="post-room"
                value={roomId}
                onChange={(event) => {
                  setRoomId(event.target.value);
                  setErrors((current) => ({ ...current, room: undefined }));
                }}
                aria-invalid={!!errors.room}
                aria-describedby={errors.room ? "post-room-error" : undefined}
                className="w-full rounded-[14px] border-1.5 border-line bg-surface-raised px-4 py-3 text-sm font-bold text-ink"
                disabled={isSubmitting}
              >
                <option value="">{dictionary.posts.selectRoom}</option>
                {rooms.map((room) => <option key={room.id} value={room.id}>{interpolate(dictionary.posts.wholeRoom, { room: room.name })}</option>)}
              </select>
            </>
          )}
          {errors.room && <p id="post-room-error" className="mt-2 text-sm font-bold text-coral-strong">{errors.room}</p>}
        </fieldset>

        <fieldset className="mb-[22px]">
          <legend className="mb-2.5 text-xs font-extrabold tracking-[0.7px] text-muted">{dictionary.posts.type}</legend>
          <div className="flex flex-wrap gap-2">
            {POST_TYPE_OPTIONS.map((item, index) => (
              <button
                key={item.value}
                ref={index === 0 ? typeRef : undefined}
                type="button"
                aria-pressed={type === item.value}
                aria-describedby={errors.type ? "post-type-error" : undefined}
                onClick={() => {
                  setType(item.value);
                  setErrors((current) => ({ ...current, type: undefined }));
                }}
                className={`rounded-full px-4 py-2 text-[13.5px] font-extrabold ${type === item.value ? item.selected : item.unselected}`}
                disabled={isSubmitting}
              >
                {dictionary.postTypes[item.value]}
              </button>
            ))}
          </div>
          {errors.type && <p id="post-type-error" className="mt-2 text-sm font-bold text-coral-strong">{errors.type}</p>}
        </fieldset>

        <div className="mb-[22px]">
          <label htmlFor="post-description" className="mb-2.5 block text-xs font-extrabold tracking-[0.7px] text-muted">{dictionary.posts.description}</label>
          <textarea
            ref={descriptionRef}
            id="post-description"
            value={description}
            maxLength={5000}
            onChange={(event) => {
              setDescription(event.target.value);
              setErrors((current) => ({ ...current, description: undefined }));
            }}
            placeholder={dictionary.posts.descriptionPlaceholder}
            aria-invalid={!!errors.description}
            aria-describedby={errors.description ? "post-description-error" : undefined}
            className="min-h-[120px] w-full resize-y rounded-[14px] border-1.5 border-line bg-surface-raised px-4 py-3.5 text-[15px] leading-relaxed text-ink placeholder:text-placeholder"
            disabled={isSubmitting}
          />
          {errors.description && <p id="post-description-error" className="mt-2 text-sm font-bold text-coral-strong">{errors.description}</p>}
        </div>

        <div>
          <label htmlFor="post-photos" className="mb-2.5 block text-xs font-extrabold tracking-[0.7px] text-muted">{dictionary.posts.photos}</label>
          <input
            ref={fileInputRef}
            className="sr-only"
            id="post-photos"
            type="file"
            accept={POST_PHOTO_MIME_TYPES.join(",")}
            multiple
            onChange={(event) => {
              addFiles(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
            aria-invalid={!!errors.photos}
            aria-describedby={errors.photos ? "post-photos-error" : undefined}
            disabled={isSubmitting}
          />
          <div className="flex flex-wrap gap-3">
            {photos.map((photo) => (
              <div key={photo.id} className="relative size-24 overflow-hidden rounded-[14px] border border-line bg-surface-soft">
                <Image className="object-cover" src={photo.previewUrl} alt={photo.file.name} fill sizes="96px" unoptimized />
                <button
                  type="button"
                  onClick={() => removePhoto(photo.id)}
                  aria-label={interpolate(dictionary.posts.removePhoto, { name: photo.file.name })}
                  className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-overlay/80 text-lg leading-none text-theme-white-strong"
                  disabled={isSubmitting}
                >
                  <span aria-hidden="true">×</span>
                </button>
              </div>
            ))}
            {photos.length < MAX_POST_PHOTOS && (
              <div
                onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
                onDragLeave={(event) => {
                  const relatedTarget = event.relatedTarget;
                  if (!(relatedTarget instanceof Node) || !event.currentTarget.contains(relatedTarget)) {
                    setIsDragging(false);
                  }
                }}
                onDrop={handleDrop}
                className={`flex size-24 flex-col items-center justify-center gap-1.5 rounded-[14px] border-2 border-dashed bg-surface-soft ${isDragging ? "border-coral text-coral" : "border-line-strong text-placeholder"}`}
              >
                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex size-full cursor-pointer flex-col items-center justify-center gap-1.5" disabled={isSubmitting}>
                  <Icon name="plus" className="size-[22px] text-coral-strong" />
                  <span className="text-xs">{dictionary.posts.add}</span>
                </button>
              </div>
            )}
          </div>
          {errors.photos && <p id="post-photos-error" className="mt-2 text-sm font-bold text-coral-strong">{errors.photos}</p>}
          {isSubmitting && photos.length > 0 && (
            <p className="mt-2 text-sm font-bold text-muted" aria-live="polite">
              {interpolate(dictionary.posts.uploadingPhoto, {
                current: Math.min(uploadProgress + 1, photos.length),
                total: photos.length,
              })}
            </p>
          )}
          <p className="mt-2 text-xs text-muted">{dictionary.posts.photoLimits}</p>
        </div>
      </div>
    </form>
  );

  if (variant === "page") {
    return <section className="w-full max-w-[580px] overflow-hidden rounded-[24px] border border-line bg-canvas shadow-theme-md">{content}</section>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-overlay/45 p-0 sm:items-center sm:p-6" onClick={(event) => { if (event.target === event.currentTarget) closeForm(); }} role="presentation">
      <section ref={dialogRef} aria-labelledby="create-post-title" aria-modal="true" className="max-h-[calc(100dvh-1rem)] w-full max-w-[580px] overflow-y-auto rounded-t-[24px] border border-line bg-canvas shadow-theme-lg sm:max-h-[calc(100dvh-3rem)] sm:rounded-[24px]" role="dialog">
        {content}
      </section>
    </div>
  );
}
