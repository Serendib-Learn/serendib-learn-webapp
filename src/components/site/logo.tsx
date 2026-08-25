import Link from "next/link";
import { cn } from "@/lib/cn";

export function Logo({
  className,
  tone = "dark",
}: {
  className?: string;
  tone?: "dark" | "light";
}) {
  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-2.5", className)}
      aria-label="Serendib Learn home"
    >
      <span className="relative grid size-9 place-items-center rounded-xl bg-jade-600 text-sand-50 shadow-card transition group-hover:bg-jade-500">
        {/* Stylised palm frond over a wave. */}
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M12 20V9" strokeLinecap="round" />
          <path d="M12 9c0-3.2 2.4-5.6 5.6-5.6C17.6 6.6 15.2 9 12 9Z" />
          <path d="M12 9C12 5.8 9.6 3.4 6.4 3.4 6.4 6.6 8.8 9 12 9Z" />
          <path d="M4 18.4c2.2-1.6 3.7-1.6 5.9 0 2.2 1.6 3.7 1.6 5.9 0" strokeLinecap="round" />
        </svg>
      </span>
      <span className="leading-none">
        <span
          className={cn(
            "block font-display text-lg font-semibold tracking-tight",
            tone === "dark" ? "text-ink-900" : "text-sand-50",
          )}
        >
          Serendib
        </span>
        <span
          className={cn(
            "block text-[0.7rem] font-medium tracking-[0.22em] uppercase",
            tone === "dark" ? "text-jade-600" : "text-jade-200",
          )}
        >
          Learn
        </span>
      </span>
    </Link>
  );
}
