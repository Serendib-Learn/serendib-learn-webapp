"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { AdminDashboard } from "@/components/portal/dashboard-admin";
import { StudentDashboard } from "@/components/portal/dashboard-student";
import { TutorDashboard } from "@/components/portal/dashboard-tutor";
import { portalSections } from "@/components/portal/portal-nav";
import { Loading } from "@/components/ui/primitives";

const eyebrow = { student: "Family portal", tutor: "Tutor portal", admin: "Team portal" } as const;

/** The original site's portal home — Welcome back, and a card per section — then the live dashboard. */
export default function PortalHomePage() {
  const { user } = useAuth();
  if (!user) return <Loading />;

  const cards = portalSections.filter(
    (section) => section.href !== "/portal" && section.roles.includes(user.role),
  );

  return (
    <>
      <p className="label-eyebrow mb-2 text-[12px] sm:mb-3 sm:text-[13px]">{eyebrow[user.role]}</p>
      <h1 className="mb-7 font-display text-[28px] text-forest sm:mb-10 sm:text-5xl">Welcome back</h1>

      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
        {cards.map(({ href, Icon, label, description }) => (
          <Link
            key={href}
            href={href}
            className="rounded-2xl border border-forest/10 bg-white p-5 transition-all hover:border-amber-spice/50 hover:shadow-sm sm:p-8"
          >
            <Icon className="mb-3 h-6 w-6 text-amber-spice sm:mb-4 sm:h-7 sm:w-7" strokeWidth={1.75} />
            <p className="mb-1.5 font-display text-lg text-forest sm:mb-2 sm:text-xl">{label}</p>
            <p className="text-[13px] leading-relaxed text-earth/60 sm:text-sm">{description}</p>
          </Link>
        ))}
      </div>

      {user.role === "admin" ? <AdminDashboard user={user} /> : null}
      {user.role === "tutor" ? <TutorDashboard user={user} /> : null}
      {user.role === "student" ? <StudentDashboard user={user} /> : null}

      <p className="mt-9 text-[13px] text-earth/40 sm:mt-12 sm:text-sm">
        This portal is in early access - thanks for being one of the first to try it.
      </p>
    </>
  );
}
