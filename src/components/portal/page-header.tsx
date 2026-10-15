"use client";

import { usePathname } from "next/navigation";
import { sectionFor } from "./portal-nav";

/**
 * A portal page's heading, as on the original site: the section's icon in a
 * mist circle beside a serif title, and one line beneath. The icon comes from
 * the section the page belongs to.
 */
export function PageHeader({
  title,
  children,
  action,
}: {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const section = sectionFor(usePathname());
  const Icon = section?.Icon;

  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 max-w-2xl">
        <div className="mb-2 flex items-center gap-3">
          {Icon ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mist text-amber-spice">
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </div>
          ) : null}
          <h1 className="font-display text-2xl text-forest">{title}</h1>
        </div>
        {children ? <p className="text-[15px] leading-relaxed text-earth/70">{children}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
