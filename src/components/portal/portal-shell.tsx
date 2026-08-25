"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { roleLabels, useAuth } from "@/lib/auth";
import { useQuery } from "@/lib/hooks";
import { cn } from "@/lib/cn";
import { Avatar, Badge, Loading } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import type { Role } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  description: string;
  roles: Role[];
  icon: React.ReactNode;
}

function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const navItems: NavItem[] = [
  {
    href: "/portal",
    label: "Overview",
    description: "Everything at a glance",
    roles: ["student", "tutor", "admin"],
    icon: <Icon path="M4 12l8-7 8 7M6 10.5V20h12v-9.5" />,
  },
  {
    href: "/portal/calendar",
    label: "Calendar",
    description: "Book and manage sessions",
    roles: ["student", "tutor", "admin"],
    icon: <Icon path="M7 3v3m10-3v3M4 8h16M5 5h14v15H5z" />,
  },
  {
    href: "/portal/learning-hub",
    label: "Learning hub",
    description: "Materials and resources",
    roles: ["student", "tutor", "admin"],
    icon: <Icon path="M4 5.5A1.5 1.5 0 015.5 4H11v16H5.5A1.5 1.5 0 014 18.5zM20 5.5A1.5 1.5 0 0018.5 4H13v16h5.5A1.5 1.5 0 0020 18.5z" />,
  },
  {
    href: "/portal/homework",
    label: "Homework",
    description: "Tasks, feedback and progress",
    roles: ["student", "tutor", "admin"],
    icon: <Icon path="M8 4h8l3 3v13H5V4h3zm0 0v3h8V4M8 12h8M8 16h5" />,
  },
  {
    href: "/portal/messages",
    label: "Messages",
    description: "Talk to your tutor",
    roles: ["student", "tutor", "admin"],
    icon: <Icon path="M4 5h16v11H9l-5 4V5z" />,
  },
  {
    href: "/portal/community",
    label: "Community",
    description: "Stories from members",
    roles: ["student", "tutor", "admin"],
    icon: <Icon path="M9 11a3 3 0 100-6 3 3 0 000 6zm8 0a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM3 20v-1.5C3 16 5.5 14.5 9 14.5s6 1.5 6 4V20M17 14.5c2.5.3 4 1.7 4 4V20" />,
  },
  {
    href: "/portal/admin",
    label: "Administration",
    description: "Users, moderation, waitlist",
    roles: ["admin"],
    icon: <Icon path="M12 3l7 3v5.5c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6l7-3z" />,
  },
];

export function PortalShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
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

  useEffect(() => {
    if (!loading && !user) router.replace("/portal/login");
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Loading label="Opening your portal" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center sm:px-8">
        <h1 className="text-2xl">You need to be logged in</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-500">
          Taking you to the login screen.
        </p>
        <ButtonLink href="/portal/login" className="mt-6">
          Log in
        </ButtonLink>
      </div>
    );
  }

  const unread = (threads ?? []).reduce((total, thread) => total + thread.unread, 0);
  const visible = navItems.filter((item) => item.roles.includes(user.role));

  const badgeFor = (href: string) => {
    if (href === "/portal/messages" && unread > 0) return unread;
    if (href === "/portal/admin" && (pendingPosts?.length ?? 0) > 0) return pendingPosts!.length;
    return null;
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[16rem_1fr] lg:py-10">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl bg-white p-5 ring-1 ring-ink-900/8">
          <div className="flex items-center gap-3">
            <Avatar name={user.name} />
            <div className="min-w-0">
              <p className="truncate font-display text-base font-semibold text-ink-900">
                {user.name}
              </p>
              <p className="truncate text-xs text-ink-400">{roleLabels[user.role]}</p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {user.languages.map((language) => (
              <Badge key={language} tone={language === "sinhala" ? "jade" : "clay"}>
                {language === "sinhala" ? "Sinhala" : "Tamil"}
              </Badge>
            ))}
            {user.membership === "active" ? <Badge tone="saffron">Member</Badge> : null}
          </div>

          <button
            type="button"
            onClick={async () => {
              await api.auth.signOut();
              router.push("/");
            }}
            className="mt-4 w-full rounded-xl px-3 py-2 text-left text-sm text-ink-500 transition hover:bg-sand-100 hover:text-ink-900"
          >
            Log out
          </button>
        </div>

        <nav aria-label="Portal" className="mt-4">
          <ul className="space-y-1">
            {visible.map((item) => {
              const active =
                item.href === "/portal"
                  ? pathname === "/portal"
                  : pathname.startsWith(item.href);
              const badge = badgeFor(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-start gap-3 rounded-xl px-3.5 py-3 transition",
                      active
                        ? "bg-ink-900 text-sand-50"
                        : "text-ink-600 hover:bg-white hover:text-ink-900",
                    )}
                  >
                    <span className={cn("mt-0.5", active ? "text-jade-200" : "text-ink-400")}>
                      {item.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-medium">{item.label}</span>
                        {badge ? (
                          <span className="grid size-5 place-items-center rounded-full bg-saffron-400 text-[0.65rem] font-bold text-ink-900">
                            {badge}
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 block text-xs leading-snug",
                          active ? "text-sand-200/65" : "text-ink-400",
                        )}
                      >
                        {item.description}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <div className="min-w-0">{children}</div>
    </div>
  );
}
