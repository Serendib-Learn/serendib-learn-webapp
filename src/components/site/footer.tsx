import Link from "next/link";
import { Logo } from "./logo";

const columns = [
  {
    title: "Learn",
    links: [
      { href: "/how-it-works", label: "How it works" },
      { href: "/tutors", label: "Meet the tutors" },
      { href: "/portal/learning-hub", label: "Learning hub" },
      { href: "/portal/calendar", label: "Book a session" },
    ],
  },
  {
    title: "Play",
    links: [
      { href: "/games", label: "Games" },
      { href: "/games/languages", label: "Survival Sri Lanka" },
      { href: "/games/heritage", label: "Explore heritage" },
    ],
  },
  {
    title: "Community",
    links: [
      { href: "/portal/community", label: "Member stories" },
      { href: "/portal", label: "Your portal" },
      { href: "/privacy", label: "Privacy policy" },
    ],
  },
];

const socials = [
  {
    label: "Instagram",
    href: "https://instagram.com/serendiblearn",
    path: "M12 8.6a3.4 3.4 0 100 6.8 3.4 3.4 0 000-6.8Zm0-2.2c2 0 2.3 0 3.1.05.8.03 1.3.16 1.7.32.5.2.8.42 1.2.8.38.38.6.72.8 1.2.16.4.29.9.32 1.7.04.8.05 1.1.05 3.1s0 2.3-.05 3.1c-.03.8-.16 1.3-.32 1.7-.2.5-.42.8-.8 1.2-.38.38-.72.6-1.2.8-.4.16-.9.29-1.7.32-.8.04-1.1.05-3.1.05s-2.3 0-3.1-.05c-.8-.03-1.3-.16-1.7-.32-.5-.2-.8-.42-1.2-.8-.38-.38-.6-.72-.8-1.2-.16-.4-.29-.9-.32-1.7C4.4 14.3 4.4 14 4.4 12s0-2.3.05-3.1c.03-.8.16-1.3.32-1.7.2-.5.42-.8.8-1.2.38-.38.72-.6 1.2-.8.4-.16.9-.29 1.7-.32C9.7 6.4 10 6.4 12 6.4Zm5.3 1.4a.9.9 0 100 1.8.9.9 0 000-1.8Z",
  },
  {
    label: "YouTube",
    href: "https://youtube.com/@serendiblearn",
    path: "M21.2 8.2c-.2-1-.9-1.7-1.8-1.9C17.7 6 12 6 12 6s-5.7 0-7.4.3c-.9.2-1.6.9-1.8 1.9C2.5 9.9 2.5 12 2.5 12s0 2.1.3 3.8c.2 1 .9 1.7 1.8 1.9 1.7.3 7.4.3 7.4.3s5.7 0 7.4-.3c.9-.2 1.6-.9 1.8-1.9.3-1.7.3-3.8.3-3.8s0-2.1-.3-3.8ZM10.2 15.1V8.9l5.3 3.1-5.3 3.1Z",
  },
  {
    label: "Facebook",
    href: "https://facebook.com/serendiblearn",
    path: "M13.3 21v-7.5h2.5l.4-2.9h-2.9V8.7c0-.8.2-1.4 1.4-1.4h1.6V4.7c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.1H7.7v2.9h2.5V21h3.1Z",
  },
  {
    label: "TikTok",
    href: "https://tiktok.com/@serendiblearn",
    path: "M14.2 3h2.5c.2 1.5 1.1 2.8 2.8 3.1v2.5c-1.1 0-2.1-.3-3-.9v5.7a5.1 5.1 0 11-5.1-5.1c.3 0 .5 0 .8.1v2.6a2.5 2.5 0 101.9 2.4V3Z",
  },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-jade-700 text-sand-100">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo tone="light" tagline />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-sand-200/70">
              Sinhala and Tamil, taught live by Sri Lankans. Built for people with a
              reason to learn — a family, a move, a place they want to belong to.
            </p>
            <div className="mt-6 flex gap-2">
              {socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={social.label}
                  className="grid size-9 place-items-center rounded-full bg-white/8 text-sand-100 transition hover:bg-saffron-500 hover:text-white"
                >
                  <svg viewBox="0 0 24 24" className="size-4.5" fill="currentColor">
                    <path d={social.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-jade-200">
                {column.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-sand-200/75 transition hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-sand-200/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Serendib Learn. Made between Colombo and everywhere else.</p>
          <p className="flex items-center gap-1.5">
            <span className="text-sinhala">ආයුබෝවන්</span>
            <span aria-hidden>·</span>
            <span className="text-tamil">வணக்கம்</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
