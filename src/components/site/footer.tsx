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
      { href: "/portal/signup?role=tutor", label: "Teach with us" },
    ],
  },
  // GAMES-HIDDEN: games are parked for now — see src/lib/features.ts.
  // {
  //   title: "Play",
  //   links: [
  //     { href: "/games", label: "Games" },
  //     { href: "/games/languages", label: "Survival Sri Lanka" },
  //     { href: "/games/heritage", label: "Explore heritage" },
  //   ],
  // },
  {
    title: "Community",
    links: [
      { href: "/portal/community", label: "Member stories" },
      { href: "/portal", label: "Your portal" },
      { href: "/privacy", label: "Privacy policy" },
    ],
  },
];

// The accounts the original serendib.learn site linked to.
const socials = [
  {
    label: "Instagram",
    href: "https://instagram.com/serendib.learn",
    path: "M12 8.6a3.4 3.4 0 100 6.8 3.4 3.4 0 000-6.8Zm0-2.2c2 0 2.3 0 3.1.05.8.03 1.3.16 1.7.32.5.2.8.42 1.2.8.38.38.6.72.8 1.2.16.4.29.9.32 1.7.04.8.05 1.1.05 3.1s0 2.3-.05 3.1c-.03.8-.16 1.3-.32 1.7-.2.5-.42.8-.8 1.2-.38.38-.72.6-1.2.8-.4.16-.9.29-1.7.32-.8.04-1.1.05-3.1.05s-2.3 0-3.1-.05c-.8-.03-1.3-.16-1.7-.32-.5-.2-.8-.42-1.2-.8-.38-.38-.6-.72-.8-1.2-.16-.4-.29-.9-.32-1.7C4.4 14.3 4.4 14 4.4 12s0-2.3.05-3.1c.03-.8.16-1.3.32-1.7.2-.5.42-.8.8-1.2.38-.38.72-.6 1.2-.8.4-.16.9-.29 1.7-.32C9.7 6.4 10 6.4 12 6.4Zm5.3 1.4a.9.9 0 100 1.8.9.9 0 000-1.8Z",
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com/company/serendib-learn",
    path: "M4.98 3.5A2.5 2.5 0 1 1 5 8.5a2.5 2.5 0 0 1-.02-5zM3 9h4v12H3zM10 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05C21.4 8.65 22 11.1 22 14.2V21h-4v-6c0-1.43-.03-3.28-2-3.28-2 0-2.3 1.56-2.3 3.17V21h-4z",
  },
];

export const contactEmail = "serendib.learn@gmail.com";

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
          <p>
            © {new Date().getFullYear()} Serendib Learn ·{" "}
            <a href={`mailto:${contactEmail}`} className="transition hover:text-white">
              {contactEmail}
            </a>
          </p>
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
