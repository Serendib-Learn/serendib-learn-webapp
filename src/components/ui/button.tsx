import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "forest" | "secondary" | "ghost" | "ghost-light" | "danger" | "saffron";
type Size = "sm" | "md" | "lg";

// The original site's buttons: squared-off (rounded-md), flat, amber or forest.
const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-amber-spice text-white hover:bg-amber-light",
  forest: "bg-forest text-cream hover:bg-fern",
  secondary: "bg-white text-forest border border-forest/15 hover:border-amber-spice/50",
  saffron: "bg-amber-spice text-white hover:bg-amber-light",
  ghost: "text-ink-700 hover:bg-forest/6",
  "ghost-light": "text-sage hover:text-cream",
  danger: "bg-clay-500 text-white hover:bg-clay-600",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-7 text-base",
};

function classes(variant: Variant, size: Size, className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

/**
 * For the rare case that needs button styling on something that is not a
 * `<button>` or a Next `Link` — a full-page-navigation `<a>`, for instance,
 * where the browser has to actually leave the app (an OAuth consent screen).
 */
export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return classes(variant, size, className);
}

interface Shared {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: Shared & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={classes(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  href,
  ...rest
}: Shared & React.ComponentProps<typeof Link>) {
  return (
    <Link href={href} className={classes(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
