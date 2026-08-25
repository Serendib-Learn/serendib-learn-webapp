"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./logo";
import { Button, ButtonLink } from "@/components/ui/button";
import { Avatar } from "@/components/ui/primitives";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";

const navigation = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/tutors", label: "Tutors" },
  { href: "/games", label: "Games" },
  { href: "/portal/community", label: "Community" },
];

export function Header() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-jade-700">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Logo tone="light" />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {navigation.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-3.5 py-2 text-sm font-medium transition",
                  active ? "bg-white/10 text-sand-50" : "text-jade-100 hover:bg-white/5 hover:text-sand-50",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <Link
              href="/portal"
              className="flex items-center gap-2.5 rounded-full py-1 pr-4 pl-1 ring-1 ring-white/15 transition hover:bg-white/10"
            >
              <Avatar name={user.name} size="sm" />
              <span className="text-sm font-medium text-sand-100">Portal</span>
            </Link>
          ) : (
            <>
              <ButtonLink href="/portal/login" variant="ghost-light" size="sm">
                Log in
              </ButtonLink>
              <ButtonLink href="/portal/signup" size="sm">
                Start learning
              </ButtonLink>
            </>
          )}
        </div>

        <Button
          variant="ghost-light"
          size="sm"
          className="md:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            {menuOpen ? (
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            )}
          </svg>
          <span className="sr-only">Menu</span>
        </Button>
      </div>

      {menuOpen ? (
        <div id="mobile-menu" className="animate-fade border-t border-white/10 bg-jade-700 md:hidden">
          <nav className="mx-auto max-w-6xl px-5 py-4" aria-label="Mobile">
            <ul className="space-y-1">
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={closeMenu}
                    className="block rounded-xl px-4 py-3 text-base font-medium text-sand-100 transition hover:bg-white/10"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-4 grid gap-2 border-t border-white/10 pt-4">
              {user ? (
                <ButtonLink href="/portal" className="w-full" onClick={closeMenu}>
                  Go to your portal
                </ButtonLink>
              ) : (
                <>
                  <ButtonLink href="/portal/signup" className="w-full" onClick={closeMenu}>
                    Start learning
                  </ButtonLink>
                  <ButtonLink
                    href="/portal/login"
                    variant="secondary"
                    className="w-full"
                    onClick={closeMenu}
                  >
                    Log in
                  </ButtonLink>
                </>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
