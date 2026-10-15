"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useAction, useQuery } from "@/lib/hooks";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/portal/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import {
  Alert,
  Avatar,
  Badge,
  Card,
  EmptyState,
  Loading,
} from "@/components/ui/primitives";
import type { CommunityMember, CommunityPost, LanguageCode, PublicProfile, User } from "@/lib/types";

type Tab = "stories" | "partners" | "friends";

/** Who counts as vetted — mirrors server/src/lib/community.ts's isVetted. */
function isVetted(user: User): boolean {
  if (!user.verified) return false;
  if (user.role === "admin") return true;
  if (user.role === "tutor") return (user.tutorStatus ?? "approved") === "approved";
  return user.membership === "active";
}

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
    <>
      <PageHeader title="Community">
        A place to practise with people learning the same languages, and to share the wins,
        questions and homesick stories along the way.
      </PageHeader>

      <div className="mb-6 flex items-start gap-3 rounded-2xl bg-jade-50 px-5 py-4 ring-1 ring-jade-200">
        <span aria-hidden className="text-xl">🛡️</span>
        <p className="text-sm leading-relaxed text-jade-700">
          <span className="font-medium">Everyone here is vetted.</span> Every member has
          confirmed their email address and booked a paid lesson with one of our personally
          interviewed tutors, and every post is read by our team before it goes up. If anything
          ever feels off, tell us and we will deal with it.
        </p>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-full bg-white p-1 border border-forest/10 sm:w-fit">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "flex-1 shrink-0 rounded-full px-5 py-2 text-sm font-medium whitespace-nowrap transition sm:flex-none",
              tab === item.id ? "bg-ink-900 text-sand-50" : "text-ink-500 hover:text-ink-900",
            )}
          >
            {item.label}
            {item.badge ? (
              <span className="ml-2 rounded-full bg-saffron-400 px-1.5 text-[0.65rem] font-bold text-ink-900">
                {item.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "stories" ? <Stories user={user} /> : null}
      {tab === "partners" ? (
        isVetted(user) ? <PracticePartners me={user} /> : <NotYetVetted />
      ) : null}
      {tab === "friends" ? (
        isVetted(user) ? <Friends connections={connections.data ?? []} /> : <NotYetVetted />
      ) : null}
    </>
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
      <Button
        size="sm"
        variant="ghost"
        disabled={cancel.pending}
        onClick={() => void cancel.run(connection.id)}
        title="Cancel request"
      >
        Request sent · cancel
      </Button>
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
                    variant="ghost"
                    disabled={decline.pending}
                    onClick={() => void decline.run(person.connection!.id)}
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
                    variant="ghost"
                    className="text-clay-600 hover:bg-clay-50"
                    disabled={remove.pending}
                    onClick={() => {
                      if (window.confirm(`Remove ${person.name} as a practice partner?`)) {
                        void remove.run(person.connection!.id);
                      }
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
  const [composing, setComposing] = useState(false);

  if (feed.loading) return <Loading label="Loading the community" />;

  const posts = feed.data ?? [];
  const byId = new Map((people.data ?? []).map((person) => [person.id, person]));
  const canPost = user.role !== "student" || user.membership === "active";

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-ink-500">
          Introduce yourself, share a win, ask a question, or tell us about Sri Lanka. A moderator
          reads every post before it goes up, so it stays a community, not an advert board.
        </p>
        {canPost ? (
          <Button size="sm" onClick={() => setComposing(true)}>
            Write a post
          </Button>
        ) : null}
      </div>

      {!canPost ? (
        <div className="mb-6">
          <Alert tone="saffron">
            Posting opens up once you have booked your first lesson. Reading and replying are
            always open.
          </Alert>
        </div>
      ) : null}

      {posts.length === 0 ? (
        <EmptyState icon="🌴" title="Nothing published yet">
          Be the first — tell everyone what made you start learning.
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              author={byId.get(post.authorId)}
              me={user}
              people={byId}
            />
          ))}
        </div>
      )}

      {composing ? (
        <Composer author={user} onClose={() => setComposing(false)} />
      ) : null}
    </>
  );
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
    <Card className="p-6">
      <div className="flex items-center gap-3">
        <Avatar name={author?.name ?? "Member"} avatarId={author?.avatarId} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink-800">
            {author?.name ?? "Former member"}
          </p>
          <p className="text-xs text-ink-400">{relativeTime(post.createdAt)}</p>
        </div>
      </div>

      <h2 className="mt-4 text-xl leading-snug">{post.title}</h2>
      <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-ink-600">{post.body}</p>

      {post.tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <Badge key={tag}>#{tag}</Badge>
          ))}
        </div>
      ) : null}

      <div className="mt-5 flex items-center gap-1 border-t border-ink-900/8 pt-4">
        <Button
          variant="ghost"
          size="sm"
          disabled={like.pending}
          onClick={() => void like.run()}
          className={liked ? "text-clay-600" : undefined}
        >
          {liked ? "♥" : "♡"} {post.likedBy.length}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen((value) => !value)}>
          {open ? "Hide replies" : "Replies"}
        </Button>
      </div>

      {open ? (
        <div className="mt-4 space-y-4 border-t border-ink-900/8 pt-4">
          {replies.loading ? (
            <Loading label="Loading replies" />
          ) : (replies.data ?? []).length === 0 ? (
            <p className="text-sm text-ink-400">No replies yet.</p>
          ) : (
            <ul className="space-y-3">
              {(replies.data ?? []).map((item) => (
                <li key={item.id} className="flex gap-3">
                  <Avatar
                    name={people.get(item.authorId)?.name ?? "Member"}
                    avatarId={people.get(item.authorId)?.avatarId}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1 rounded-xl bg-sand-100 px-4 py-2.5">
                    <p className="text-xs font-medium text-ink-700">
                      {people.get(item.authorId)?.name ?? "Member"}
                      <span className="ml-2 font-normal text-ink-400">
                        {relativeTime(item.createdAt)}
                      </span>
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-600">{item.body}</p>
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
              const result = await reply.run();
              if (result) setDraft("");
            }}
          >
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Add a reply"
              aria-label="Reply"
            />
            <Button type="submit" size="sm" disabled={reply.pending || !draft.trim()}>
              Reply
            </Button>
          </form>
        </div>
      ) : null}
    </Card>
  );
}

function Composer({ author, onClose }: { author: User; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [sent, setSent] = useState(false);

  const create = useAction(() =>
    api.community.create({
      authorId: author.id,
      title,
      body,
      tags: tags
        .split(",")
        .map((tag) => tag.trim().replace(/^#/, "").toLowerCase())
        .filter(Boolean),
    }),
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={sent ? "Sent for review" : "Write a post"}
      description={
        sent
          ? undefined
          : "A moderator reads posts before they appear, usually within a day."
      }
    >
      {sent ? (
        <div className="space-y-5">
          <Alert tone="jade">
            Your post is in the moderation queue. You will get a note in your inbox when it
            goes live.
          </Alert>
          <Button className="w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="Title" htmlFor="post-title">
            <Input
              id="post-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="I ordered kottu entirely in Sinhala"
            />
          </Field>

          <Field label="Your post" htmlFor="post-body">
            <Textarea
              id="post-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="min-h-40"
              placeholder="What happened, what you were nervous about, and what you would tell someone starting out."
            />
          </Field>

          <Field
            label="Tags"
            htmlFor="post-tags"
            hint="Comma separated. Helps others find posts like yours."
          >
            <Input
              id="post-tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="sinhala, first-conversation, food"
            />
          </Field>

          {create.error ? <Alert>{create.error}</Alert> : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={create.pending || !title.trim() || !body.trim()}
              onClick={async () => {
                const result = await create.run();
                if (result) setSent(true);
              }}
            >
              {create.pending ? "Sending…" : "Submit for review"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
