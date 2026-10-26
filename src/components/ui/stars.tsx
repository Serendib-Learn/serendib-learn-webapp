"use client";

import { cn } from "@/lib/cn";

/** A 1–5 star picker. `label` names what is being rated, for screen readers. */
export function Stars({
  value,
  onChange,
  label = "Rating",
  size = "lg",
}: {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  size?: "md" | "lg";
}) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
          onClick={() => onChange(star)}
          className={cn(
            "leading-none transition hover:scale-110",
            size === "lg" ? "text-3xl" : "text-2xl",
            star <= value ? "text-saffron-400" : "text-ink-900/15",
          )}
        >
          ★
        </button>
      ))}
    </div>
  );
}

/** Read-only stars, e.g. "★★★★☆". */
export function StarsShown({ value, className }: { value: number; className?: string }) {
  const whole = Math.round(value);
  return (
    <span className={cn("text-saffron-500", className)} aria-label={`${value} out of 5`}>
      {"★".repeat(whole)}
      <span className="text-ink-900/15">{"★".repeat(5 - whole)}</span>
    </span>
  );
}
