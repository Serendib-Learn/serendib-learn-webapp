import { cn } from "@/lib/cn";

// The original site's inputs: a thin forest border, an amber focus ring.
const control =
  "w-full rounded-lg border border-forest/15 bg-white px-3 py-2 text-sm text-earth transition placeholder:text-earth/40 focus:border-forest/25 focus:ring-2 focus:ring-amber-spice/40 focus:outline-none disabled:bg-cream disabled:text-ink-400";

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-xs text-earth/70">
        {label}
      </label>
      {children}
      {hint ? <p className="text-[11px] leading-relaxed text-earth/50">{hint}</p> : null}
    </div>
  );
}

export function Input({
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, className)} {...rest} />;
}

export function Textarea({
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, "min-h-28 resize-y", className)} {...rest} />;
}

export function Select({
  className,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(control, "appearance-none pr-10", className)} {...rest}>
      {children}
    </select>
  );
}

export function Checkbox({
  label,
  className,
  ...rest
}: { label: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border border-forest/10 bg-white px-3 py-2.5 transition hover:bg-mist/50 has-checked:border-forest/25 has-checked:bg-mist",
        className,
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 accent-jade-500"
        {...rest}
      />
      <span className="text-sm leading-snug text-ink-700">{label}</span>
    </label>
  );
}

export function Radio({
  label,
  className,
  ...rest
}: { label: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border border-forest/10 bg-white px-3 py-2.5 transition hover:bg-mist/50 has-checked:border-forest/25 has-checked:bg-mist",
        className,
      )}
    >
      <input type="radio" className="mt-0.5 size-4 shrink-0 accent-jade-500" {...rest} />
      <span className="text-sm leading-snug text-ink-700">{label}</span>
    </label>
  );
}
