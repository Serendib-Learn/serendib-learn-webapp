"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./logo";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";

/**
 * The original site's navigation bar: forest green, the flower and wordmark
 * on the left, quiet sage links, and one amber call to action on the right.
 */
const links = [
  { href: "/#how", label: "About us" },
  { href: "/tutors", label: "Tutors" },
  { href: "/alphabet", label: "Alphabet" },
  // GAMES-HIDDEN: the original nav had "Play" here — see src/lib/features.ts.
  // { href: "/games", label: "Play" },
];

export function Header() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const portal = { href: user ? "/portal" : "/portal/login", label: "Portal" };

  return (
    <header className="sticky top-0 z-50 bg-forest print:hidden">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Logo />

        <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
          {[...links, portal].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm transition-colors hover:text-cream",
                pathname === link.href ? "text-cream" : "text-sage",
              )}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/#waitlist"
            className="rounded-md bg-amber-spice px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-light"
          >
            Join the waitlist
          </Link>
        </nav>

        <button
          className="p-2 text-cream md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label="Toggle menu"
          aria-expanded={open}
          aria-controls="mobile-menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open ? (
        <div id="mobile-menu" className="flex flex-col gap-4 border-t border-white/5 bg-forest px-6 pb-6 md:hidden">
          {[...links, portal].map((link) => (
            <Link key={link.href} href={link.href} onClick={close} className="py-2 text-sage hover:text-cream">
              {link.label}
            </Link>
          ))}
          <Link href="/portal/signup?role=tutor" onClick={close} className="py-2 text-sage hover:text-cream">
            Teach with us
          </Link>
          <Link
            href="/#waitlist"
            onClick={close}
            className="rounded-md bg-amber-spice px-4 py-3 text-center text-sm font-medium text-white hover:bg-amber-light"
          >
            Join the waitlist
          </Link>
        </div>
      ) : null}
    </header>
  );
}
