"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useAction, useQuery } from "@/lib/hooks";
import { cn } from "@/lib/cn";
import { formatDate, relativeTime } from "@/lib/format";
import { PageHeader } from "@/components/portal/page-header";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/field";
import {
  Alert,
  Avatar,
  Badge,
  Card,
  EmptyState,
  Loading,
} from "@/components/ui/primitives";
import type { CommunityPost, Role, User } from "@/lib/types";

type Tab = "people" | "moderation" | "waitlist";

const tabs: { id: Tab; label: string }[] = [
  { id: "people", label: "People" },
  { id: "moderation", label: "Moderation" },
  { id: "waitlist", label: "Waitlist" },
];

export default function AdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("people");
  const pending = useQuery(() => api.community.pending(), []);

  if (!user) return <Loading />;

  if (user.role !== "admin") {
    return (
      <>
        <PageHeader title="Administration" />
        <Alert>This area is for administrators.</Alert>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Administration">
        Accounts, the moderation queue and everyone waiting for a tutor.
      </PageHeader>

      <div className="mb-6 flex gap-1 rounded-full bg-white p-1 ring-1 ring-ink-900/8 sm:w-fit">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "flex-1 rounded-full px-5 py-2 text-sm font-medium transition sm:flex-none",
              tab === item.id ? "bg-ink-900 text-sand-50" : "text-ink-500 hover:text-ink-900",
            )}
          >
            {item.label}
            {item.id === "moderation" && (pending.data ?? []).length > 0 ? (
              <span className="ml-2 rounded-full bg-saffron-400 px-1.5 text-[0.65rem] font-bold text-ink-900">
                {(pending.data ?? []).length}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "people" ? <People me={user} /> : null}
      {tab === "moderation" ? <Moderation /> : null}
      {tab === "waitlist" ? <Waitlist /> : null}
    </>
  );
}

function People({ me }: { me: User }) {
  const users = useQuery(() => api.users.list(), []);
  const setRole = useAction((id: string, role: Role) => api.users.setRole(id, role));
  const setMembership = useAction((id: string, membership: User["membership"]) =>
    api.users.setMembership(id, membership),
  );
  const remove = useAction((id: string) => api.users.remove(id));

  if (users.loading) return <Loading label="Loading accounts" />;

  const everyone = (users.data ?? [])
    .slice()
    .sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));

  return (
    <div className="space-y-3">
      {everyone.map((person) => (
        <Card key={person.id} className="flex flex-wrap items-center gap-4 p-5">
          <Avatar name={person.name} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-ink-800">{person.name}</p>
              {!person.verified ? <Badge tone="saffron">Unverified</Badge> : null}
              {person.membership === "active" ? <Badge tone="jade">Member</Badge> : null}
              {person.id === me.id ? <Badge tone="ocean">You</Badge> : null}
            </div>
            <p className="truncate text-xs text-ink-400">
              {person.email} · joined {formatDate(person.createdAt)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              aria-label={`Role for ${person.name}`}
              className="h-9 w-auto py-0 text-sm"
              value={person.role}
              disabled={person.id === me.id || setRole.pending}
              onChange={(event) => void setRole.run(person.id, event.target.value as Role)}
            >
              <option value="student">Student</option>
              <option value="tutor">Tutor</option>
              <option value="admin">Admin</option>
            </Select>

            <Button
              variant="secondary"
              size="sm"
              disabled={setMembership.pending}
              onClick={() =>
                void setMembership.run(
                  person.id,
                  person.membership === "active" ? "none" : "active",
                )
              }
            >
              {person.membership === "active" ? "Revoke member" : "Make member"}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-clay-600 hover:bg-clay-50"
              disabled={person.id === me.id || remove.pending}
              onClick={() => {
                if (window.confirm(`Delete ${person.name}'s account?`)) {
                  void remove.run(person.id);
                }
              }}
            >
              Delete
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Moderation() {
  const pending = useQuery(() => api.community.pending(), []);
  const feed = useQuery(() => api.community.feed(), []);
  const people = useQuery(() => api.users.list(), []);

  if (pending.loading) return <Loading label="Loading the queue" />;

  const byId = new Map((people.data ?? []).map((person) => [person.id, person]));
  const queue = pending.data ?? [];

  return (
    <>
      {queue.length === 0 ? (
        <EmptyState icon="🧹" title="Queue is clear">
          New posts land here for review before they go live.
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {queue.map((post) => (
            <ModerationRow key={post.id} post={post} author={byId.get(post.authorId)} />
          ))}
        </div>
      )}

      {(feed.data ?? []).length > 0 ? (
        <section className="mt-10">
          <h2 className="text-xl">Published</h2>
          <ul className="mt-4 divide-y divide-ink-900/8 rounded-2xl bg-white px-5 ring-1 ring-ink-900/8">
            {(feed.data ?? []).map((post) => (
              <li key={post.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-800">{post.title}</p>
                  <p className="text-xs text-ink-400">
                    {byId.get(post.authorId)?.name ?? "Former member"} ·{" "}
                    {relativeTime(post.createdAt)}
                  </p>
                </div>
                <TakeDown postId={post.id} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function ModerationRow({ post, author }: { post: CommunityPost; author?: User }) {
  const [note, setNote] = useState("");
  const moderate = useAction((status: "approved" | "rejected") =>
    api.community.moderate(post.id, status, note.trim() || undefined),
  );

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="saffron">Pending</Badge>
        <span className="text-xs text-ink-400">
          {author?.name ?? "Former member"} · {relativeTime(post.createdAt)}
        </span>
      </div>

      <h3 className="mt-3 text-lg leading-snug">{post.title}</h3>
      <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-ink-600">{post.body}</p>

      {post.tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <Badge key={tag}>#{tag}</Badge>
          ))}
        </div>
      ) : null}

      <Textarea
        className="mt-4 min-h-20"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Optional note to the author, sent with a rejection."
        aria-label="Moderation note"
      />

      {moderate.error ? (
        <div className="mt-3">
          <Alert>{moderate.error}</Alert>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={moderate.pending}
          onClick={() => void moderate.run("approved")}
        >
          Approve
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={moderate.pending}
          onClick={() => void moderate.run("rejected")}
        >
          Reject
        </Button>
      </div>
    </Card>
  );
}

function TakeDown({ postId }: { postId: string }) {
  const moderate = useAction(() =>
    api.community.moderate(postId, "rejected", "Taken down by a moderator."),
  );

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-clay-600 hover:bg-clay-50"
      disabled={moderate.pending}
      onClick={() => void moderate.run()}
    >
      Take down
    </Button>
  );
}

function Waitlist() {
  const waitlist = useQuery(() => api.waitlist.list(), []);

  if (waitlist.loading) return <Loading label="Loading the waitlist" />;

  const entries = waitlist.data ?? [];

  if (entries.length === 0) {
    return (
      <EmptyState icon="📋" title="Nobody waiting">
        Signups from the home page form appear here.
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {entries.map((entry) => (
        <Card key={entry.id} className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium text-ink-800">{entry.name}</p>
            <span className="text-xs text-ink-400">{formatDate(entry.createdAt)}</span>
          </div>
          <a
            href={`mailto:${entry.email}`}
            className="text-xs text-jade-700 hover:text-jade-600"
          >
            {entry.email}
          </a>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge tone={entry.language === "tamil" ? "clay" : "jade"}>
              {entry.language === "either" ? "Either language" : entry.language}
            </Badge>
            <Badge>{entry.level}</Badge>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-ink-500">
            &ldquo;{entry.reason}&rdquo;
          </p>
        </Card>
      ))}
    </div>
  );
}
