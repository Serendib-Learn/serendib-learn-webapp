import Link from "next/link";
import { Card } from "@/components/ui/primitives";

export function AuthCard({
  title,
  intro,
  children,
  footer,
  aside,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="bg-weave min-h-[calc(100vh-4rem)]">
      <div className="mx-auto grid max-w-5xl gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1fr_20rem] lg:items-start">
        <Card className="animate-rise p-8 sm:p-10">
          <h1 className="text-3xl">{title}</h1>
          <p className="mt-3 leading-relaxed text-ink-500">{intro}</p>
          <div className="mt-8">{children}</div>
          {footer ? (
            <div className="mt-8 border-t border-ink-900/8 pt-6 text-sm text-ink-500">{footer}</div>
          ) : null}
        </Card>

        {aside ? <div className="lg:pt-4">{aside}</div> : null}
      </div>
    </div>
  );
}

export function AuthFooterLink({
  label,
  href,
  cta,
}: {
  label: string;
  href: string;
  cta: string;
}) {
  return (
    <p>
      {label}{" "}
      <Link
        href={href}
        className="font-medium text-jade-700 underline decoration-jade-300 underline-offset-4"
      >
        {cta}
      </Link>
    </p>
  );
}
