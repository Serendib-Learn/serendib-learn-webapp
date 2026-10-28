"use client";

import { ImageIcon, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useAction, useQuery } from "@/lib/hooks";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Button, ButtonLink } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Input, Select } from "@/components/ui/field";
import {
  Alert,
  Avatar,
  Badge,
  Card,
  EmptyState,
  Loading,
} from "@/components/ui/primitives";
import type {
  CommunityMember,
  CommunityPost,
  LanguageCode,
  PostKind,
  PublicProfile,
  User,
} from "@/lib/types";

type Tab = "stories" | "partners" | "friends";

const KINDS: { value: PostKind; label: string }[] = [
  { value: "story", label: "Story" },
  { value: "review", label: "Review" },
  { value: "idea", label: "Idea" },
  { value: "photo", label: "Photo" },
];

/** Who counts as vetted — mirrors server/src/lib/community.ts's isVetted. */
function isVetted(user: User): boolean {
  if (!user.verified) return false;
  if (user.role === "admin") return true;
  if (user.role === "tutor") return (user.tutorStatus ?? "approved") === "approved";
  return user.membership === "active";
}

/**
 * The original site's community page — "Stories worth keeping", a share card,
 * kind filters and the posts — with this version's practice partners and
 * friends alongside.
 */
export default function CommunityPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("stories");
  const connections = useQuery(
    () => (user && isVetted(user) ? api.community.connections() : Promise.resolve([])),
    [user?.id],
  );

  if (!user) return <Loading label="Loading the community" />;

  const incoming = (connections.data ?? []).filter(
    (item) => item.connection?.status === "pending" && item.connection.direction === "incoming",
  ).length;
  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "stories", label: "Stories" },
    { id: "partners", label: "Practice partners" },
    { id: "friends", label: "Friends", badge: incoming },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <p className="label-eyebrow mb-2 text-[12px] sm:mb-3 sm:text-[13px]">Community</p>
      <h1 className="mb-3 font-display text-[28px] text-forest sm:mb-4 sm:text-5xl">Stories worth keeping</h1>
      <p className="mb-5 max-w-xl text-[14px] leading-relaxed text-earth/65 sm:text-base">
        A shared space for Serendib families, students and tutors - share a story, a review, a
        photo or an idea. Every post is read by us before it goes up, so this stays a warm, ad-free
        place.
      </p>
      <p className="mb-7 max-w-xl text-[13px] leading-relaxed text-fern sm:mb-10">
        Everyone here is vetted: every member has confirmed their email and booked a paid lesson
        with one of our personally interviewed tutors. Find people to practise with under Practice
        partners.
      </p>

      <div className="mb-7 flex flex-wrap gap-2 border-b border-forest/10 pb-4">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "flex items-center gap-1.5 px-1 pb-1 text-sm transition-colors",
              tab === item.id ? "border-b-2 border-amber-spice text-forest" : "text-earth/55 hover:text-forest",
            )}
          >
            {item.label}
            {item.badge ? (
              <span className="grid h-4 min-w-4 place-items-center rounded-full bg-amber-spice px-1 text-[10px] font-semibold text-white">
                {item.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "stories" ? <Stories user={user} /> : null}
      {tab === "partners" ? (isVetted(user) ? <PracticePartners me={user} /> : <NotYetVetted />) : null}
      {tab === "friends" ? (isVetted(user) ? <Friends connections={connections.data ?? []} /> : <NotYetVetted />) : null}

      {user.role === "admin" ? (
        <p className="mt-10 text-[12px] text-earth/35">
          <Link href="/portal/admin" className="transition-colors hover:text-earth/60">
            Moderator access
          </Link>
        </p>
      ) : null}
    </div>
  );
}

function NotYetVetted() {
  return (
    <EmptyState
      icon="🤝"
      title="Practice partners open after your first lesson"
      action={<ButtonLink href="/portal/calendar">Book a lesson</ButtonLink>}
    >
      We vet everyone you can meet here: practice partners are members who have booked a paid
      lesson with one of our tutors. Book yours and the directory opens up.
    </EmptyState>
  );
}

function ConnectButton({ person }: { person: CommunityMember }) {
  const connect = useAction(() => api.community.connect(person.id));
  const accept = useAction((id: string) => api.community.accept(id));
  const cancel = useAction((id: string) => api.community.disconnect(id));
  const { confirm, dialog } = useConfirm();
  const connection = person.connection;

  if (connection?.status === "accepted") {
    return (
      <ButtonLink href={`/portal/messages?with=${person.id}`} size="sm" variant="secondary">
        Message
      </ButtonLink>
    );
  }
  if (connection?.status === "pending" && connection.direction === "incoming") {
    return (
      <Button size="sm" disabled={accept.pending} onClick={() => void accept.run(connection.id)}>
        Accept request
      </Button>
    );
  }
  if (connection?.status === "pending") {
    return (
      <>
        <Button
          size="sm"
          variant="danger-ghost"
          disabled={cancel.pending}
          onClick={async () => {
            const yes = await confirm({
              title: "Cancel your friend request?",
              message: `${person.name} won't see it any more. You can send another later.`,
              confirmLabel: "Cancel request",
            });
            if (yes) void cancel.run(connection.id);
          }}
          title="Cancel request"
        >
          Request sent · cancel
        </Button>
        {dialog}
      </>
    );
  }
  return (
    <div className="text-right">
      <Button size="sm" disabled={connect.pending} onClick={() => void connect.run()}>
        Add friend
      </Button>
      {connect.error ? <p className="mt-1 text-xs text-clay-600">{connect.error}</p> : null}
    </div>
  );
}

function MemberCard({ person, children }: { person: CommunityMember; children?: React.ReactNode }) {
  return (
    <Card className="flex flex-wrap items-center gap-4 p-5">
      <Avatar name={person.name} avatarId={person.avatarId} size="lg" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-ink-800">{person.name}</p>
          <Badge tone="jade">Vetted</Badge>
        </div>
        {person.headline ? <p className="mt-0.5 text-sm text-ink-600">{person.headline}</p> : null}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {person.languages.map((language) => (
            <Badge key={language} tone={language === "sinhala" ? "jade" : "clay"}>
              Learning {language === "sinhala" ? "Sinhala" : "Tamil"}
            </Badge>
          ))}
          {person.homeTown ? <span className="text-xs text-ink-400">{person.homeTown}</span> : null}
        </div>
      </div>
      {children ?? <ConnectButton person={person} />}
    </Card>
  );
}

function PracticePartners({ me }: { me: User }) {
  const [language, setLanguage] = useState<LanguageCode | "">(me.languages.length === 1 ? me.languages[0] : "");
  const members = useQuery(() => api.community.members(language || undefined), [language]);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-ink-500">
          Fellow learners you can practise with between lessons. Add someone as a friend; once
          they accept, you can message each other and arrange a time.
        </p>
        <div className="w-52">
          <Select
            aria-label="Language"
            className="h-10 py-0 text-sm"
            value={language}
            onChange={(event) => setLanguage(event.target.value as LanguageCode | "")}
          >
            <option value="">Both languages</option>
            <option value="sinhala">Learning Sinhala</option>
            <option value="tamil">Learning Tamil</option>
          </Select>
        </div>
      </div>

      {members.loading ? (
        <Loading label="Finding practice partners" />
      ) : members.error ? (
        <Alert>{members.error}</Alert>
      ) : (members.data ?? []).length === 0 ? (
        <EmptyState icon="🌱" title="No one here yet">
          As more members book their first lesson they appear here. Try the other language, or
          check back soon.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {(members.data ?? []).map((person) => (
            <MemberCard key={person.id} person={person} />
          ))}
        </div>
      )}
      <p className="mt-6 text-xs text-ink-400">
        Rather not be listed? Turn off “Show me in practice partners” on your profile.
      </p>
    </>
  );
}

function Friends({ connections }: { connections: CommunityMember[] }) {
  const decline = useAction((id: string) => api.community.decline(id));
  const remove = useAction((id: string) => api.community.disconnect(id));
  const { confirm, dialog } = useConfirm();

  const incoming = connections.filter(
    (item) => item.connection?.status === "pending" && item.connection.direction === "incoming",
  );
  const friends = connections.filter((item) => item.connection?.status === "accepted");
  const outgoing = connections.filter(
    (item) => item.connection?.status === "pending" && item.connection.direction === "outgoing",
  );

  if (connections.length === 0) {
    return (
      <EmptyState icon="🤝" title="No practice partners yet">
        Find someone learning the same language under Practice partners and add them as a
        friend.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-8">
      {dialog}
      {incoming.length > 0 ? (
        <section>
          <h2 className="mb-3 text-lg">Requests for you</h2>
          <div className="space-y-3">
            {incoming.map((person) => (
              <MemberCard key={person.id} person={person}>
                <div className="flex gap-2">
                  <ConnectButton person={person} />
                  <Button
                    size="sm"
                    variant="danger-ghost"
                    disabled={decline.pending}
                    onClick={async () => {
                      const yes = await confirm({
                        title: `Decline ${person.name}'s request?`,
                        message: "They aren't told; the request just goes away.",
                        confirmLabel: "Decline request",
                      });
                      if (yes) void decline.run(person.connection!.id);
                    }}
                  >
                    Decline
                  </Button>
                </div>
              </MemberCard>
            ))}
          </div>
        </section>
      ) : null}

      {friends.length > 0 ? (
        <section>
          <h2 className="mb-3 text-lg">Your practice partners</h2>
          <div className="space-y-3">
            {friends.map((person) => (
              <MemberCard key={person.id} person={person}>
                <div className="flex gap-2">
                  <ConnectButton person={person} />
                  <Button
                    size="sm"
                    variant="danger-ghost"
                    disabled={remove.pending}
                    onClick={async () => {
                      const yes = await confirm({
                        title: `Remove ${person.name} as a practice partner?`,
                        message: "You stop being friends, so you can no longer message each other. Either of you can send a new request later.",
                        confirmLabel: "Remove partner",
                      });
                      if (yes) void remove.run(person.connection!.id);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </MemberCard>
            ))}
          </div>
        </section>
      ) : null}

      {outgoing.length > 0 ? (
        <section>
          <h2 className="mb-3 text-lg">Waiting for a reply</h2>
          <div className="space-y-3">
            {outgoing.map((person) => (
              <MemberCard key={person.id} person={person} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Stories({ user }: { user: User }) {
  const feed = useQuery(() => api.community.feed(), []);
  const people = useQuery(() => api.users.directory(), []);
  const [filter, setFilter] = useState<PostKind | "all">("all");

  const posts = feed.data ?? [];
  const shown = filter === "all" ? posts : posts.filter((post) => (post.kind ?? "story") === filter);
  const byId = new Map((people.data ?? []).map((person) => [person.id, person]));
  const canPost = user.role !== "student" || user.membership === "active";

  return (
    <>
      {canPost ? (
        <Composer author={user} />
      ) : (
        <Alert tone="saffron">
          Sharing opens up once you have booked your first lesson. Reading and replying are always
          open.
        </Alert>
      )}

      <div className="my-7 flex flex-wrap gap-2 sm:my-10">
        {[{ value: "all" as const, label: "Everything" }, ...KINDS].map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-[13px] transition-colors",
              filter === option.value
                ? "border-forest bg-forest text-cream"
                : "border-forest/15 text-earth/70 hover:border-amber-spice/50",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {feed.loading ? null : shown.length === 0 ? (
        <p className="text-sm text-earth/50">Nothing here yet - be the first to share something.</p>
      ) : (
        <div className="space-y-5 sm:space-y-7">
          {shown.map((post) => (
            <PostCard key={post.id} post={post} author={byId.get(post.authorId)} me={user} people={byId} />
          ))}
        </div>
      )}
    </>
  );
}

function PostImage({ id, alt }: { id: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let url: string | null = null;
    let live = true;
    api.community.image(id).then(
      (blob) => {
        if (!live) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      },
      () => undefined,
    );
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);
  if (!src) return <div className="mb-4 h-48 animate-pulse rounded-xl bg-mist" />;
  // eslint-disable-next-line @next/next/no-img-element -- a private blob URL; next/image cannot optimise it.
  return <img src={src} alt={alt} className="mb-4 max-h-[420px] w-full rounded-xl object-cover" />;
}

function PostCard({
  post,
  author,
  me,
  people,
}: {
  post: CommunityPost;
  author?: PublicProfile;
  me: User;
  people: Map<string, PublicProfile>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const replies = useQuery(
    () => (open ? api.community.repliesFor(post.id) : Promise.resolve([])),
    [post.id, open],
  );
  const like = useAction(() => api.community.toggleLike(post.id, me.id));
  const reply = useAction(() => api.community.reply(post.id, me.id, draft));
  const liked = post.likedBy.includes(me.id);

  return (
    <article className="animate-fade-up rounded-2xl border border-forest/10 bg-white p-5 sm:p-8">
      <div className="mb-3 flex items-center gap-3">
        <span className="rounded-full bg-mist px-2.5 py-1 text-[11px] text-forest capitalize">{post.kind ?? "story"}</span>
        <span className="text-[12px] text-earth/45">
          {new Date(post.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      </div>
      {post.title ? <h2 className="mb-3 font-display text-xl text-forest sm:text-2xl">{post.title}</h2> : null}
      {post.imageId ? <PostImage id={post.imageId} alt={post.title || "Community photo"} /> : null}
      <div className="space-y-3 text-[14px] leading-relaxed whitespace-pre-line text-earth/80 sm:text-[15px]">{post.body}</div>
      {post.tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <Badge key={tag}>#{tag}</Badge>
          ))}
        </div>
      ) : null}
      <p className="mt-4 flex items-center gap-2 text-[13px] text-earth/50">
        <Avatar name={author?.name ?? "Member"} avatarId={author?.avatarId} size="sm" />- {author?.name ?? "Former member"}
      </p>

      <div className="mt-4 flex items-center gap-4 border-t border-forest/8 pt-3 text-[13px]">
        <button
          type="button"
          disabled={like.pending}
          onClick={() => void like.run()}
          className={cn("transition-colors", liked ? "text-amber-spice" : "text-earth/55 hover:text-forest")}
        >
          {liked ? "♥" : "♡"} {post.likedBy.length}
        </button>
        <button type="button" onClick={() => setOpen((value) => !value)} className="text-earth/55 hover:text-forest">
          {open ? "Hide replies" : "Replies"}
        </button>
      </div>

      {open ? (
        <div className="mt-4 space-y-4">
          {replies.loading ? (
            <Loading label="Loading replies" />
          ) : (replies.data ?? []).length === 0 ? (
            <p className="text-sm text-earth/45">No replies yet.</p>
          ) : (
            <ul className="space-y-3">
              {(replies.data ?? []).map((item) => (
                <li key={item.id} className="flex gap-3">
                  <Avatar name={people.get(item.authorId)?.name ?? "Member"} avatarId={people.get(item.authorId)?.avatarId} size="sm" />
                  <div className="min-w-0 flex-1 rounded-xl bg-cream px-4 py-2.5">
                    <p className="text-xs font-medium text-forest">
                      {people.get(item.authorId)?.name ?? "Member"}
                      <span className="ml-2 font-normal text-earth/45">{relativeTime(item.createdAt)}</span>
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-earth/80">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <form
            className="flex items-center gap-2"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!draft.trim()) return;
              if (await reply.run()) setDraft("");
            }}
          >
            <Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Add a reply" aria-label="Reply" />
            <Button type="submit" size="sm" variant="forest" disabled={reply.pending || !draft.trim()}>
              Reply
            </Button>
          </form>
        </div>
      ) : null}
    </article>
  );
}

/** The original site's "Share something" card, opening into the form. */
function Composer({ author }: { author: User }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<PostKind>("story");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [done, setDone] = useState(false);

  const send = useAction(async () => {
    const image = file ? await api.community.uploadImage(file) : null;
    return api.community.create({
      authorId: author.id,
      kind,
      title: title.trim(),
      body: body.trim(),
      tags: [],
      imageId: image?.id,
    });
  });

  return (
    <div className="rounded-2xl border border-dashed border-forest/20 bg-white/70 p-5 sm:p-7">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center gap-2.5 text-left" aria-expanded={open}>
        <MessageCircle className="h-5 w-5 text-amber-spice" strokeWidth={1.75} />
        <span className="font-display text-lg text-forest sm:text-xl">Share something</span>
      </button>
      <p className="mt-2 text-[13px] text-earth/55">A story, a review, a photo from home, or an idea for the community.</p>

      {done ? (
        <p className="mt-4 text-[13px] text-forest">Thank you for sharing - we&apos;ll read it and post it shortly.</p>
      ) : null}

      {open && !done ? (
        <form
          className="mt-5 space-y-3.5"
          onSubmit={async (event) => {
            event.preventDefault();
            if (await send.run()) {
              setDone(true);
              setTitle("");
              setBody("");
              setFile(null);
            }
          }}
        >
          <div className="flex flex-wrap gap-2">
            {KINDS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setKind(option.value)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[13px] transition-colors",
                  kind === option.value ? "border-forest/25 bg-mist text-forest" : "border-forest/15 text-earth/60",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Title (optional)"
            maxLength={120}
            className="w-full rounded-xl border border-forest/15 bg-white px-4 py-2.5 text-[14px] outline-none focus:border-amber-spice"
          />
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Write your message…"
            rows={5}
            maxLength={4000}
            className="w-full rounded-xl border border-forest/15 bg-white px-4 py-3 text-[14px] leading-relaxed outline-none focus:border-amber-spice"
          />
          <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-earth/60">
            <ImageIcon className="h-4 w-4" strokeWidth={1.75} />
            <span>{file ? file.name : "Add a photo (optional)"}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          {send.error ? <p className="text-[13px] text-clay-600">{send.error}</p> : null}
          <button
            type="submit"
            disabled={send.pending || !body.trim()}
            className="inline-flex h-10 items-center rounded-lg bg-forest px-5 text-sm font-medium text-cream transition-colors hover:bg-fern disabled:opacity-60"
          >
            {send.pending ? "Sending…" : "Share it"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
