/**
 * The dashboard's own heading, under the Welcome back hub on the portal home.
 * The hub already greets the person, so this is a quiet section label with
 * the dashboard's one-line summary and any action beside it.
 */
export function GlanceHeader({
  children,
  action,
}: {
  /** Kept for the dashboards' call sites; the hub above says hello instead. */
  title?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <header className="mt-12 mb-6 flex flex-wrap items-end justify-between gap-4 border-t border-forest/10 pt-10">
      <div className="min-w-0 max-w-2xl">
        <p className="label-eyebrow mb-2">At a glance</p>
        {children ? <p className="text-[15px] leading-relaxed text-earth/70">{children}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
