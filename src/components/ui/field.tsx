import { cn } from "@/lib/cn";

const control =
  "w-full rounded-xl bg-white px-4 py-2.5 text-[0.95rem] text-ink-900 ring-1 ring-inset ring-ink-900/12 transition placeholder:text-ink-300 hover:ring-ink-900/20 focus:ring-2 focus:ring-jade-500 disabled:bg-sand-100 disabled:text-ink-400";

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
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink-700">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs leading-relaxed text-ink-400">{hint}</p> : null}
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
        "flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 ring-1 ring-inset ring-ink-900/10 transition hover:bg-sand-100 has-checked:bg-jade-50 has-checked:ring-jade-200",
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
        "flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 ring-1 ring-inset ring-ink-900/10 transition hover:bg-sand-100 has-checked:bg-jade-50 has-checked:ring-jade-200",
        className,
      )}
    >
      <input type="radio" className="mt-0.5 size-4 shrink-0 accent-jade-500" {...rest} />
      <span className="text-sm leading-snug text-ink-700">{label}</span>
    </label>
  );
}
