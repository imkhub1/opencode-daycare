"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { deletePost } from "@/app/posts/actions";
import type { PostActionResult } from "@/app/posts/types";
import { Icon } from "@/components/shared/Icon";
import type { Dictionary } from "@/utils/i18n/dictionary";

const INITIAL_STATE: PostActionResult = { success: false, message: "" };

export function DeletePostButton({ postId, dictionary }: { postId: string; dictionary: Dictionary }) {
  const router = useRouter();
  const action = deletePost.bind(null, postId);
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);

  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);

  return (
    <form
      action={formAction}
      className="flex shrink-0 items-center gap-2"
      onSubmit={(event) => {
        if (!pending && !window.confirm(dictionary.common.deletePostConfirmation)) event.preventDefault();
      }}
    >
      <button
        type="submit"
        disabled={pending}
        aria-label={dictionary.common.deletePost}
        title={dictionary.common.deletePost}
        className="flex size-9 items-center justify-center rounded-xl text-subtle transition hover:bg-coral-faint hover:text-coral-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral disabled:cursor-wait disabled:opacity-50"
      >
        <Icon name="trash" className="size-[17px]" />
      </button>
      {!state.success && "message" in state && state.message && (
        <p role="alert" className="text-xs font-bold text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}
