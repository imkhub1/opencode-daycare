"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type MouseEvent } from "react";

import type { PostPhoto } from "@/app/posts/types";
import { useLocale } from "@/components/shared/LocaleProvider";

export function PostPhotoGallery({ photos }: { photos: PostPhoto[] }) {
  const { dictionary } = useLocale();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isOpen = selectedIndex !== null;
  const selectedPhoto = selectedIndex === null ? null : photos[selectedIndex];

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = requestAnimationFrame(() => closeButtonRef.current?.focus());

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedIndex(null);
        requestAnimationFrame(() => triggerRef.current?.focus());
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        if (photos.length < 2) return;
        event.preventDefault();
        const direction = event.key === "ArrowLeft" ? -1 : 1;
        setSelectedIndex((current) =>
          current === null ? null : (current + direction + photos.length) % photos.length,
        );
        return;
      }

      if (event.key === "Tab" && dialogRef.current) {
        const focusableElements = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
          ),
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, photos.length]);

  function openPhoto(index: number, event: MouseEvent<HTMLButtonElement>) {
    triggerRef.current = event.currentTarget;
    setSelectedIndex(index);
  }

  function closePhoto() {
    setSelectedIndex(null);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function movePhoto(direction: -1 | 1) {
    setSelectedIndex((current) =>
      current === null ? null : (current + direction + photos.length) % photos.length,
    );
  }

  return (
    <>
      <div className={`mt-4 grid gap-2 ${photos.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            onClick={(event) => openPhoto(index, event)}
            aria-label={dictionary.feed.photoOfPublicationNumber.replace("{number}", `${index + 1} / ${photos.length}`)}
            className="group relative h-40 w-full overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
          >
            <Image
              src={photo.url}
              alt={photos.length > 1 ? dictionary.feed.photoOfPublicationNumber.replace("{number}", String(index + 1)) : dictionary.feed.photoOfPublication}
              fill
              sizes="(max-width: 640px) 100vw, 320px"
              loading={index === 0 ? "eager" : "lazy"}
              className="object-cover transition duration-300 group-hover:scale-105"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-[#3f362e]/0 text-sm font-extrabold text-white opacity-0 transition group-hover:bg-[#3f362e]/25 group-hover:opacity-100 group-focus-visible:bg-[#3f362e]/25 group-focus-visible:opacity-100">
              {dictionary.feed.viewPhoto}
            </span>
          </button>
        ))}
      </div>

      {selectedPhoto && selectedIndex !== null && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#211b17]/90 p-4 sm:p-8"
          onClick={(event) => {
            if (event.target === event.currentTarget) closePhoto();
          }}
          role="presentation"
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={dictionary.feed.photoCounter.replace("{current}", String(selectedIndex + 1)).replace("{total}", String(photos.length))}
            className="relative flex h-full w-full items-center justify-center"
          >
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closePhoto}
              aria-label={dictionary.common.close}
              className="absolute right-0 top-0 z-10 flex size-11 items-center justify-center rounded-full bg-white/15 text-3xl leading-none text-white transition hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <span aria-hidden="true">×</span>
            </button>

            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => movePhoto(-1)}
                  aria-label={dictionary.feed.previousPhoto}
                  className="absolute left-0 z-10 flex size-11 items-center justify-center rounded-full bg-white/15 text-3xl leading-none text-white transition hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <span aria-hidden="true">‹</span>
                </button>
                <button
                  type="button"
                  onClick={() => movePhoto(1)}
                  aria-label={dictionary.feed.nextPhoto}
                  className="absolute right-0 z-10 flex size-11 items-center justify-center rounded-full bg-white/15 text-3xl leading-none text-white transition hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <span aria-hidden="true">›</span>
                </button>
              </>
            )}

            <div className="relative h-[78vh] w-[90vw] max-w-[1100px]">
              <Image
                src={selectedPhoto.url}
                alt={photos.length > 1 ? dictionary.feed.photoOfPublicationNumber.replace("{number}", String(selectedIndex + 1)) : dictionary.feed.photoOfPublication}
                fill
                sizes="90vw"
                loading="eager"
                className="object-contain"
              />
            </div>
            <p className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white">
              {dictionary.feed.photoCounter.replace("{current}", String(selectedIndex + 1)).replace("{total}", String(photos.length))}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
