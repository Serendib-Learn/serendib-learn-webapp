import Link from "next/link";
import { AraliyaFlower } from "./araliya-flower";

/** The accounts the original serendib.learn site linked to. */
export const contactEmail = "serendib.learn@gmail.com";

/** The original site's footer: wordmark, the flower, the socials, one quiet line beneath. */
export function Footer() {
  return (
    <footer className="mt-auto bg-forest px-4 py-12 sm:px-6 sm:py-14 print:hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-6 text-center md:grid-cols-3 md:gap-8 md:text-left">
        <div>
          <p className="font-display text-xl text-cream">serendib.learn</p>
          <p className="mt-1 text-sm text-sage">Keeping languages alive.</p>
        </div>
        <div className="order-first flex justify-center md:order-none">
          <AraliyaFlower className="h-10 w-10" />
        </div>
        <div className="flex justify-center gap-4 md:justify-end">
          <a
            href="https://instagram.com/serendib.learn"
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram"
            className="text-sage hover:text-cream"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
            </svg>
          </a>
          <a
            href="https://linkedin.com/company/serendib-learn"
            target="_blank"
            rel="noreferrer"
            aria-label="LinkedIn"
            className="text-sage hover:text-cream"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4.98 3.5A2.5 2.5 0 1 1 5 8.5a2.5 2.5 0 0 1-.02-5zM3 9h4v12H3zM10 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05C21.4 8.65 22 11.1 22 14.2V21h-4v-6c0-1.43-.03-3.28-2-3.28-2 0-2.3 1.56-2.3 3.17V21h-4z" />
            </svg>
          </a>
        </div>
      </div>
      <div className="mx-auto mt-10 flex max-w-6xl flex-col items-center justify-center gap-2 border-t border-white/10 pt-6 text-center text-xs text-sage sm:flex-row sm:gap-4">
        <span>
          © {new Date().getFullYear()} Serendib ·{" "}
          <a href={`mailto:${contactEmail}`} className="transition-colors hover:text-cream">
            {contactEmail}
          </a>
        </span>
        <span className="hidden sm:inline">·</span>
        <Link href="/privacy" className="transition-colors hover:text-cream">
          Privacy Policy
        </Link>
        <span className="hidden sm:inline">·</span>
        <Link href="/portal/signup?role=tutor" className="transition-colors hover:text-cream">
          Teach with us
        </Link>
      </div>
    </footer>
  );
}
