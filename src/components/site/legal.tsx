import Link from "next/link";
import { contactEmail } from "@/components/site/footer";

/** The layout shared by the policy pages: Terms, Refund Policy and Privacy. */
export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  /** "2 November 2026" — shown under the title. */
  updated: string;
  intro: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-3xl text-forest md:text-4xl">{title}</h1>
      <p className="mt-2 mb-8 text-xs text-earth/50">Last updated {updated}</p>
      <div className="mb-8 space-y-3 text-[15px] leading-relaxed text-earth/80">{intro}</div>
      {children}
      <nav className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-t border-forest/10 pt-6 text-sm">
        <Link href="/terms" className="text-amber-spice hover:underline">
          Terms and Conditions
        </Link>
        <Link href="/refunds" className="text-amber-spice hover:underline">
          Cancellation and Refund Policy
        </Link>
        <Link href="/privacy" className="text-amber-spice hover:underline">
          Privacy Policy
        </Link>
      </nav>
    </main>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-8 scroll-mt-24">
      <h2 className="mb-2 font-display text-lg font-semibold text-forest">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-earth/80 [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

export function ContactEmail() {
  return (
    <a href={`mailto:${contactEmail}`} className="text-amber-spice underline">
      {contactEmail}
    </a>
  );
}
