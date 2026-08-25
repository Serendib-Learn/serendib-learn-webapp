"use client";

import Link from "next/link";
import { PageHeader } from "./page-header";
import { api } from "@/lib/api";
import { useQuery } from "@/lib/hooks";
import { formatDate, money, relativeTime } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, EmptyState, Loading, Stat } from "@/components/ui/primitives";
import type { User } from "@/lib/types";

export function AdminDashboard({ user }: { user: User }) {
  const users = useQuery(() => api.users.list(), []);
  const pending = useQuery(() => api.community.pending(), []);
  const waitlist = useQuery(() => api.waitlist.list(), []);

  const everyone = users.data ?? [];
  const bookings = useQuery(
    () => Promise.all(everyone.map((person) => api.bookings.forUser(person.id))),
    [everyone.length],
  );

  if (users.loading) return <Loading label="Loading the site" />;

  const students = everyone.filter((person) => person.role === "student");
  const tutors = everyone.filter((person) => person.role === "tutor");

  // Bookings are fetched per user, so the same booking appears twice.
  const uniqueBookings = new Map(
    (bookings.data ?? []).flat().map((booking) => [booking.id, booking]),
  );
  const allBookings = Array.from(uniqueBookings.values());
  const revenue = allBookings
    .filter((booking) => booking.paidAt)
    .reduce((sum, booking) => sum + booking.priceUsd, 0);

  return (
    <>
      <PageHeader
        title="Site administration"
        action={
          <ButtonLink href="/portal/admin" size="sm">
            Open full admin
          </ButtonLink>
        }
      >
        Logged in as {user.name}. Everything below is live against the demo data store.
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Students" value={students.length} />
        <Stat label="Tutors" value={tutors.length} />
        <Stat
          label="Awaiting moderation"
          value={(pending.data ?? []).length}
          hint={(pending.data ?? []).length > 0 ? "Community queue" : "Queue clear"}
        />
        <Stat
          label="Paid bookings"
          value={money(revenue)}
          hint={`${allBookings.filter((booking) => booking.paidAt).length} sessions`}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl">Moderation queue</h2>
            <Link href="/portal/admin" className="text-sm text-jade-700 hover:text-jade-600">
              Review all →
            </Link>
          </div>

          {(pending.data ?? []).length === 0 ? (
            <EmptyState icon="🧹" title="Queue is clear">
              Nothing waiting for approval.
            </EmptyState>
          ) : (
            <div className="space-y-3">
              {(pending.data ?? []).map((post) => {
                const author = everyone.find((person) => person.id === post.authorId);
                return (
                  <Card key={post.id} className="p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="saffron">Pending</Badge>
                      <span className="text-xs text-ink-400">
                        {author?.name} · {relativeTime(post.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2 font-display text-base text-ink-900">{post.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-500">
                      {post.body}
                    </p>
                    <ButtonLink href="/portal/admin" size="sm" variant="secondary" className="mt-4">
                      Review it
                    </ButtonLink>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl">Recent waitlist</h2>
            <Link href="/portal/admin" className="text-sm text-jade-700 hover:text-jade-600">
              Full list →
            </Link>
          </div>

          {(waitlist.data ?? []).length === 0 ? (
            <EmptyState icon="📋" title="No waitlist entries">
              Signups from the home page land here.
            </EmptyState>
          ) : (
            <div className="space-y-3">
              {(waitlist.data ?? []).slice(0, 4).map((entry) => (
                <Card key={entry.id} className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-ink-800">{entry.name}</p>
                    <span className="text-xs text-ink-400">{formatDate(entry.createdAt)}</span>
                  </div>
                  <p className="text-xs text-ink-400">{entry.email}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge tone={entry.language === "tamil" ? "clay" : "jade"}>
                      {entry.language === "either" ? "Either language" : entry.language}
                    </Badge>
                    <Badge>{entry.level}</Badge>
                  </div>
                  <p className="mt-2.5 text-sm leading-relaxed text-ink-500">
                    &ldquo;{entry.reason}&rdquo;
                  </p>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
