"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "./button";
import { Modal } from "./modal";

export interface ConfirmOptions {
  title: string;
  /** What will happen, in a sentence or two. */
  message: string;
  /** The button that goes ahead, e.g. "Delete account". */
  confirmLabel: string;
  /** Red for anything that deletes, removes or cancels (the default). */
  tone?: "danger" | "neutral";
}

/**
 * Asks before anything destructive happens. Every delete, remove, cancel and
 * disconnect in the portal goes through this, so they all look and read the
 * same: a red button, and a second, explicit yes.
 *
 *   const { confirm, dialog } = useConfirm();
 *   if (await confirm({ title, message, confirmLabel: "Delete" })) remove();
 *   return <>{…}{dialog}</>;
 */
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(answer: boolean) => void>(() => {});

  const confirm = useCallback(
    (next: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setOptions(next);
      }),
    [],
  );

  const answer = (value: boolean) => {
    resolver.current(value);
    setOptions(null);
  };

  const dialog = options ? (
    <Modal open onClose={() => answer(false)} title={options.title} description={options.message}>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={() => answer(false)}>
          Keep it
        </Button>
        <Button
          type="button"
          variant={options.tone === "neutral" ? "forest" : "danger"}
          autoFocus
          onClick={() => answer(true)}
        >
          {options.confirmLabel}
        </Button>
      </div>
    </Modal>
  ) : null;

  return { confirm, dialog };
}
