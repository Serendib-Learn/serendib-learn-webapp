import { cn } from "@/lib/cn";

export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white ring-1 ring-ink-900/8 shadow-card",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

const toneStyles = {
  jade: "bg-jade-50 text-jade-700 ring-jade-200",
  saffron: "bg-saffron-50 text-saffron-600 ring-saffron-300",
  clay: "bg-clay-50 text-clay-600 ring-clay-100",
  ocean: "bg-ocean-100 text-ocean-600 ring-ocean-100",
  neutral: "bg-sand-100 text-ink-600 ring-ink-900/10",
} as const;

export type Tone = keyof typeof toneStyles;

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        toneStyles[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const avatarPalette = [
  "bg-jade-500",
  "bg-saffron-500",
  "bg-clay-500",
  "bg-ocean-500",
  "bg-ink-700",
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function paletteFor(name: string): string {
  let sum = 0;
  for (let i = 0; i < name.length; i += 1) sum += name.charCodeAt(i);
  return avatarPalette[sum % avatarPalette.length];
}

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dimensions = {
    sm: "size-8 text-xs",
    md: "size-10 text-sm",
    lg: "size-14 text-base",
  }[size];

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        paletteFor(name),
        dimensions,
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
    />
  );
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-10 text-sm text-ink-500">
      <Spinner />
      {label}…
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-ink-900/15 bg-sand-100/60 px-6 py-12 text-center">
      {icon ? <div className="mb-3 text-3xl">{icon}</div> : null}
      <p className="font-display text-lg text-ink-900">{title}</p>
      {children ? (
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">{children}</p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Alert({
  tone = "clay",
  children,
}: {
  tone?: "clay" | "jade" | "saffron";
  children: React.ReactNode;
}) {
  const styles = {
    clay: "bg-clay-50 text-clay-600 ring-clay-100",
    jade: "bg-jade-50 text-jade-700 ring-jade-200",
    saffron: "bg-saffron-50 text-saffron-600 ring-saffron-300",
  }[tone];

  return (
    <p
      role={tone === "clay" ? "alert" : undefined}
      className={cn("rounded-xl px-4 py-3 text-sm ring-1 ring-inset", styles)}
    >
      {children}
    </p>
  );
}

export function Progress({
  value,
  max = 100,
  tone = "jade",
  className,
}: {
  value: number;
  max?: number;
  tone?: "jade" | "saffron";
  className?: string;
}) {
  const pct = max === 0 ? 0 : Math.round((Math.min(value, max) / max) * 100);
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-ink-900/10", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500",
          tone === "jade" ? "bg-jade-500" : "bg-saffron-400",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl bg-white px-5 py-4 ring-1 ring-ink-900/8">
      <p className="text-xs font-medium uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-1.5 font-display text-2xl text-ink-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-400">{hint}</p> : null}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      {eyebrow ? (
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-jade-600">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-3xl leading-tight sm:text-4xl">{title}</h2>
      {children ? (
        <p className="mt-4 text-base leading-relaxed text-ink-500">{children}</p>
      ) : null}
    </div>
  );
}
