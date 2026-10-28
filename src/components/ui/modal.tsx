"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

/**
 * Open dialogs, innermost last — a confirmation opened from inside another
 * dialog (Manage chapters → Remove) sits on top, and Escape closes only it.
 */
const openDialogs: symbol[] = [];

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const self = useRef(Symbol("dialog"));

  useEffect(() => {
    if (!open) return;
    const me = self.current;
    openDialogs.push(me);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && openDialogs[openDialogs.length - 1] === me) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      openDialogs.splice(openDialogs.indexOf(me), 1);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  // Rendered on <body>, so a dialog opened from inside another (whose
  // animation transform would otherwise trap it) still covers the page.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 animate-fade bg-ink-950/45 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border border-forest/10 bg-white p-6 sm:max-w-lg sm:rounded-xl",
          "animate-rise",
          className,
        )}
      >
        <div className="mb-5 pr-8">
          <h2 className="text-xl">{title}</h2>
          {description ? (
            <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-5 right-5 grid size-8 place-items-center rounded-full text-ink-400 transition hover:bg-sand-100 hover:text-ink-700"
        >
          <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
          </svg>
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
