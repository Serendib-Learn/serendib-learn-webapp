import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * The original site's portal login card: a back link, the forest "S" circle,
 * a serif title, and a narrow white card on cream. Every sign-in screen
 * (log in, sign up, verify, forgot and reset password) uses it. `wide` is for
 * sign-up, which asks for more than a code.
 */
export function AuthCard({
  title,
  intro,
  children,
  footer,
  aside,
  wide = false,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  aside?: React.ReactNode;
  wide?: boolean;
}) {
  const width = wide ? "max-w-lg" : "max-w-sm";
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4 py-12">
      <div className={cn("mb-3 w-full", width)}>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-earth/55 transition-colors hover:text-forest"
        >
          ← Back to serendib.learn
        </Link>
      </div>
      <div className={cn("w-full rounded-xl border border-forest/10 bg-white p-8", width)}>
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-forest">
            <span className="font-display text-lg text-amber-spice">S</span>
          </div>
          <h1 className="font-display text-xl text-forest">{title}</h1>
          <p className="mt-1 text-xs text-earth/60">{intro}</p>
        </div>
        {children}
        {footer ? <div className="mt-6 space-y-1 text-center text-[11px] text-earth/50">{footer}</div> : null}
      </div>
      {aside ? <div className={cn("mt-4 w-full", width)}>{aside}</div> : null}
    </div>
  );
}

export function AuthFooterLink({ label, href, cta }: { label: string; href: string; cta: string }) {
  return (
    <p>
      {label}{" "}
      <Link href={href} className="text-amber-spice underline">
        {cta}
      </Link>
    </p>
  );
}
