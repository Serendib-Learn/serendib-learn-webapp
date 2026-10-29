"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { photoUrlFor } from "@/lib/api/public";
import { roleLabels, useAuth } from "@/lib/auth";
import { useQuery } from "@/lib/hooks";
import { cn } from "@/lib/cn";
import { AraliyaFlower } from "@/components/site/araliya-flower";
import { Avatar, Loading } from "@/components/ui/primitives";
import { FeedbackPrompt } from "./feedback-prompt";
import { portalSections } from "./portal-nav";

/**
 * The portal frame, as on the original site: a forest-green bar with the
 * flower, a way back to the main site, the portal's sections as quiet sage
 * links, and who you are with a log out on the right — then the page, in a
 * single cream column.
 */
export function PortalShell({ children }: { children: React.ReactNode }) {
  const { user, loading, error } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const { data: threads } = useQuery(
    () => (user ? api.messages.threadsFor(user.id) : Promise.resolve([])),
    [user?.id],
  );
  const { data: pendingPosts } = useQuery(
    () => (user?.role === "admin" ? api.community.pending() : Promise.resolve([])),
    [user?.role],
  );
  const { data: waitingRequests } = useQuery(
    async () =>
      user?.role === "admin"
        ? (await api.requests.list()).filter((item) => item.status === "pending").length
        : 0,
    [user?.role],
  );

  useEffect(() => {
    // A failed session check is not a logout: stay put and say so below.
    if (!loading && !user && !error) router.replace("/portal/login");
  }, [loading, user, error, router]);

  // Only before we know who this is. `loading` is also true while the session
  // is re-checked after every write; blanking the page then would unmount it
  // and throw away whatever the person was in the middle of.
  if (loading && !user) {
    return (
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <Loading label="Opening your portal" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center sm:px-8">
        <h1 className="font-display text-2xl text-forest">
          {error ? "We could not reach Serendib just now" : "You need to be logged in"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-earth/60">
          {error ?? "Taking you to the login screen."}
        </p>
        {error ? (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 h-10 rounded-lg bg-forest px-5 text-sm font-medium text-cream hover:bg-fern"
          >
            Try again
          </button>
        ) : (
          <Link
            href="/portal/login"
            className="mt-6 inline-flex h-10 items-center rounded-lg bg-forest px-5 text-sm font-medium text-cream hover:bg-fern"
          >
            Log in
          </Link>
        )}
      </div>
    );
  }

  const unread = (threads ?? []).reduce((total, thread) => total + thread.unread, 0);
  const visible = portalSections.filter((section) => section.roles.includes(user.role));
  const badgeFor = (href: string) => {
    if (href === "/portal/messages" && unread > 0) return unread;
    const adminWaiting = (pendingPosts?.length ?? 0) + (waitingRequests ?? 0);
    if (href === "/portal/admin" && adminWaiting > 0) return adminWaiting;
    return null;
  };
  const isActive = (href: string) =>
    href === "/portal" ? pathname === "/portal" : pathname.startsWith(href);

  const logOut = async () => {
    await api.auth.signOut();
    router.push("/portal/login");
  };

  const links = (
    <>
      <Link href="/" className="flex items-center gap-1.5 whitespace-nowrap transition-colors hover:text-cream">
        <ArrowLeft className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
        Main site
      </Link>
      <span className="h-4 w-px shrink-0 bg-white/15" aria-hidden />
      {visible.map((section) => {
        const badge = badgeFor(section.href);
        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={isActive(section.href) ? "page" : undefined}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap transition-colors hover:text-cream",
              isActive(section.href) && "text-cream",
            )}
          >
            {section.label}
            {badge ? (
              <span className="grid h-4 min-w-4 place-items-center rounded-full bg-amber-spice px-1 text-[10px] font-semibold text-white">
                {badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-forest text-cream print:hidden">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/portal" className="flex shrink-0 items-center gap-2.5">
            <AraliyaFlower className="h-9 w-9 shrink-0" />
            <span className="font-display text-lg tracking-tight whitespace-nowrap">serendib.learn</span>
          </Link>

          <nav className="hidden items-center gap-5 text-[15px] text-sage xl:flex" aria-label="Portal">
            {links}
          </nav>

          <div className="flex shrink-0 items-center gap-3 text-sm sm:text-[15px]">
            <Link href="/portal/profile" className="flex items-center gap-2 text-sage hover:text-cream">
              <Avatar name={user.name} avatarId={user.avatarId} photoUrl={photoUrlFor(user)} size="sm" className="ring-1 ring-white/25" />
              <span className="hidden sm:inline">{roleLabels[user.role]}</span>
            </Link>
            <button type="button" onClick={() => void logOut()} className="text-sage transition-colors hover:text-cream">
              Log out
            </button>
          </div>
        </div>

        <nav
          className="mx-auto flex max-w-7xl items-center gap-5 overflow-x-auto px-5 pb-3 text-sm text-sage [scrollbar-width:none] xl:hidden [&::-webkit-scrollbar]:hidden"
          aria-label="Portal"
        >
          {links}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-9 sm:px-8 sm:py-14">
        <FeedbackPrompt user={user} />
        {children}
      </main>
    </div>
  );
}
