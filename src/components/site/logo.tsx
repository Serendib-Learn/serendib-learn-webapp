import Link from "next/link";
import { AraliyaFlower } from "./araliya-flower";
import { cn } from "@/lib/cn";

/** The flower and the serif wordmark, as in the original site's header. */
export function Logo({ className, tone = "light" }: { className?: string; tone?: "dark" | "light" }) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2.5",
        tone === "light" ? "text-cream" : "text-forest",
        className,
      )}
      aria-label="serendib.learn home"
    >
      <AraliyaFlower className="h-8 w-8 shrink-0" />
      <span className="font-display text-lg tracking-tight">serendib.learn</span>
    </Link>
  );
}
