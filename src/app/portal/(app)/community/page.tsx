"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useAction, useQuery } from "@/lib/hooks";
import { relativeTime } from "@/lib/format";
import { PageHeader } from "@/components/portal/page-header";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import {
  Alert,
  Avatar,
  Badge,
  Card,
  EmptyState,
  Loading,
} from "@/components/ui/primitives";
import type { CommunityPost, PublicProfile, User } from "@/lib/types";

export default function CommunityPage() {
  const { user } = useAuth();
  const feed = useQuery(() => api.community.feed(), []);
  const people = useQuery(() => api.users.directory(), []);
  const [composing, setComposing] = useState(false);

  if (!user || feed.loading) return <Loading label="Loading the community" />;

  const posts = feed.data ?? [];
  const byId = new Map((people.data ?? []).map((person) => [person.id, person]));
  const canPost = user.role !== "student" || user.membership === "active";

  return (
    <>
      <PageHeader
        title="Community"
        action={
          canPost ? (
            <Button size="sm" onClick={() => setComposing(true)}>
              Write a post
            </Button>
          ) : undefined
        }
      >
        Wins, questions and homesick stories from people learning the same two languages.
        Posts are read by a moderator before they go up.
      </PageHeader>

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
        <Avatar name={author?.name ?? "Member"} size="sm" />
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
                  <Avatar name={people.get(item.authorId)?.name ?? "Member"} size="sm" />
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
