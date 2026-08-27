"use client";

import { useActionState, useEffect, useOptimistic, useRef, useState, useTransition } from "react";

import { addPostComment, togglePostReaction } from "@/app/posts/actions";
import {
  MAX_POST_COMMENT_LENGTH,
  POST_REACTION_OPTIONS,
  type FeedPost,
  type PostInteractionActionResult,
  type PostReactionCode,
} from "@/app/posts/types";
import { Icon } from "@/components/shared/Icon";
import type { Dictionary } from "@/utils/i18n/dictionary";
import { interpolate } from "@/utils/i18n/dictionary";

const INITIAL_COMMENT_STATE: PostInteractionActionResult = {
  success: false,
  message: "",
};

function formatCommentDate(value: string, locale: Dictionary["locale"]) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-AR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(value));
}

function applyReaction(post: FeedPost, reaction: PostReactionCode): FeedPost {
  const counts = { ...post.reactionCounts };
  const currentReaction = post.currentUserReaction;

  if (currentReaction === reaction) {
    counts[reaction] = Math.max(0, counts[reaction] - 1);
    return { ...post, reactionCounts: counts, currentUserReaction: null };
  }

  if (currentReaction) {
    counts[currentReaction] = Math.max(0, counts[currentReaction] - 1);
  }
  counts[reaction] += 1;

  return { ...post, reactionCounts: counts, currentUserReaction: reaction };
}

export function PostInteractions({
  post,
  dictionary,
}: {
  post: FeedPost;
  dictionary: Dictionary;
}) {
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [reactionError, setReactionError] = useState<string | null>(null);
  const [optimisticPost, setOptimisticPost] = useOptimistic(post, applyReaction);
  const [isReactionPending, startReactionTransition] = useTransition();
  const commentFormRef = useRef<HTMLFormElement>(null);
  const boundCommentAction = addPostComment.bind(null, post.id);
  const [commentState, commentFormAction, commentPending] = useActionState(
    boundCommentAction,
    INITIAL_COMMENT_STATE,
  );

  useEffect(() => {
    if (commentState.success) commentFormRef.current?.reset();
  }, [commentState]);

  function handleReaction(reaction: PostReactionCode) {
    if (isReactionPending) return;
    setReactionError(null);
    startReactionTransition(async () => {
      setOptimisticPost(reaction);
      const result = await togglePostReaction(post.id, reaction);
      if (!result.success) setReactionError(result.message);
    });
  }

  const commentCount = post.comments.length;

  return (
    <section className="mt-4 border-t border-line-soft pt-3" aria-label={dictionary.feed.reactionsLabel}>
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={dictionary.feed.reactionsLabel}>
          {POST_REACTION_OPTIONS.map(({ code, emoji }) => {
            const selected = optimisticPost.currentUserReaction === code;
            const count = optimisticPost.reactionCounts[code];

            return (
              <button
                key={code}
                type="button"
                onClick={() => handleReaction(code)}
                disabled={isReactionPending}
                aria-label={`${dictionary.feed.reactWith} ${emoji} (${count})`}
                aria-pressed={selected}
                title={`${dictionary.feed.reactWith} ${emoji}`}
                className={`inline-flex min-w-11 items-center justify-center gap-1 rounded-full border px-2.5 py-1.5 text-sm ${selected ? "border-coral-border bg-coral-faint text-coral-strong" : "border-line bg-surface-soft text-body hover:border-coral-border hover:bg-coral-faint"} disabled:cursor-wait disabled:opacity-60`}
              >
                <span aria-hidden="true">{emoji}</span>
                <span className="min-w-[1ch] text-[11px] font-extrabold tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setIsCommentsOpen((open) => !open)}
          aria-expanded={isCommentsOpen}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-extrabold text-muted hover:bg-surface-soft hover:text-coral-strong"
        >
          <Icon name="message" className="size-4" />
          {isCommentsOpen
            ? dictionary.feed.hideComments
            : interpolate(dictionary.feed.commentsCount, { count: commentCount })}
        </button>
      </div>

      {reactionError && (
        <p className="mt-2 text-xs font-bold text-danger" role="alert">
          {reactionError}
        </p>
      )}

      {isCommentsOpen && (
        <div className="motion-reveal mt-3 border-t border-line-soft pt-3" aria-label={dictionary.feed.commentsLabel}>
          {commentCount > 0 ? (
            <ul className="space-y-3">
              {post.comments.map((comment) => (
                <li key={comment.id} className="flex gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-avatar-blue text-xs font-extrabold text-avatar-blue-ink">
                    {comment.authorName.trim().charAt(0).toLocaleUpperCase(dictionary.locale)}
                  </span>
                  <div className="min-w-0 flex-1 rounded-2xl bg-surface-soft px-3 py-2">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <p className="text-xs font-extrabold text-ink">{comment.authorName}</p>
                      <time className="text-[11px] text-subtle" dateTime={comment.createdAt}>
                        {formatCommentDate(comment.createdAt, dictionary.locale)}
                      </time>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-body">{comment.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">{dictionary.feed.noComments}</p>
          )}

          <form
            ref={commentFormRef}
            action={commentFormAction}
            className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
            aria-busy={commentPending}
          >
            <div className="min-w-0 flex-1">
              <label className="sr-only" htmlFor={`comment-${post.id}`}>
                {dictionary.feed.commentPlaceholder}
              </label>
              <textarea
                id={`comment-${post.id}`}
                name="body"
                rows={2}
                maxLength={MAX_POST_COMMENT_LENGTH}
                required
                placeholder={dictionary.feed.commentPlaceholder}
                aria-invalid={!commentState.success && Boolean(commentState.message)}
                aria-describedby={!commentState.success && commentState.message ? `comment-error-${post.id}` : undefined}
                className="min-h-16 w-full resize-y rounded-2xl border border-line bg-surface-raised px-3 py-2.5 text-sm text-ink placeholder:text-placeholder"
              />
            </div>
            <button
              type="submit"
              disabled={commentPending}
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-coral px-4 py-2.5 text-sm font-extrabold text-theme-white-strong shadow-theme-sm disabled:cursor-wait disabled:opacity-60"
            >
              {commentPending ? dictionary.feed.commenting : dictionary.feed.addComment}
            </button>
          </form>
          {!commentState.success && commentState.message && (
            <p id={`comment-error-${post.id}`} className="mt-2 text-xs font-bold text-danger" role="alert">
              {commentState.message}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
