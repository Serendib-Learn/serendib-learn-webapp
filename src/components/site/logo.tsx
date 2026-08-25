import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

export function Logo({
  className,
  tone = "dark",
  tagline = false,
}: {
  className?: string;
  tone?: "dark" | "light";
  tagline?: boolean;
}) {
  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-2.5", className)}
      aria-label="serendib.learn home"
    >
      <span className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-full shadow-card">
        <Image src="/brand/serendib-icon.png" alt="" width={72} height={72} className="size-full object-cover" priority />
      </span>
      <span className="leading-none">
        <span
          className={cn(
            "block font-display text-lg tracking-tight",
            tone === "dark" ? "text-jade-700" : "text-sand-50",
          )}
        >
          serendib.learn
        </span>
        {tagline ? (
          <span
            className={cn(
              "mt-1 block text-[0.65rem] font-medium tracking-[0.22em] uppercase",
              tone === "dark" ? "text-jade-600" : "text-jade-200",
            )}
          >
            Keeping languages alive
          </span>
        ) : null}
      </span>
    </Link>
  );
}
