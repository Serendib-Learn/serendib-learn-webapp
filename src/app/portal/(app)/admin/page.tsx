"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api } from "@/lib/api";
import { profilePhotoUrl, photoUrlFor } from "@/lib/api/public";
import { useAuth } from "@/lib/auth";
import { useAction, useQuery } from "@/lib/hooks";
import { cn } from "@/lib/cn";
import { formatDate, formatDateTime, relativeTime } from "@/lib/format";
import { AdminRequests } from "@/components/portal/admin-requests";
import { FeedbackList } from "@/components/portal/feedback-list";
import { GoogleMailConnect } from "@/components/portal/google-mail-connect";
import { GoogleSystemCalendarConnect } from "@/components/portal/google-system-calendar-connect";
import { PageHeader } from "@/components/portal/page-header";
import { ProfileEditor } from "@/components/portal/profile-editor";
import { Modal } from "@/components/ui/modal";
import { useConfirm } from "@/components/ui/confirm";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import {
  Alert,
  Avatar,
  Badge,
  Card,
  EmptyState,
  Loading,
} from "@/components/ui/primitives";
import type { CommunityPost, LanguageCode, Role, User } from "@/lib/types";

type Tab = "people" | "requests" | "tutors" | "feedback" | "moderation" | "waitlist" | "mail" | "audit";

const tabs: { id: Tab; label: string }[] = [
  { id: "people", label: "People" },
  { id: "requests", label: "Requests" },
  { id: "tutors", label: "Tutor applications" },
  { id: "feedback", label: "Feedback" },
  { id: "moderation", label: "Moderation" },
  { id: "waitlist", label: "Waitlist" },
  { id: "mail", label: "Google" },
  { id: "audit", label: "Audit log" },
];

const googleConnectMessages = {
  connected: { tone: "jade" as const, text: "Connected." },
  error: { tone: "clay" as const, text: "Could not connect. Try again." },
  cancelled: { tone: "saffron" as const, text: "Connection was cancelled." },
};

function GoogleConnectBanner() {
  const params = useSearchParams();
  const outcome = params.get("google") as keyof typeof googleConnectMessages | null;
  const message = outcome ? googleConnectMessages[outcome] : null;
  if (!message) return null;

  return (
    <div className="mb-6">
      <Alert tone={message.tone}>{message.text}</Alert>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AdminArea />
    </Suspense>
  );
}

function AdminArea() {
  const { user } = useAuth();
  const params = useSearchParams();
  // ?tab=google (from the dashboard's "Finish connecting Google"), and the
  // return from Google's consent screen, both land on the Google tab.
  const [tab, setTab] = useState<Tab>(
    params.get("tab") === "google" || params.get("google")
      ? "mail"
      : params.get("tab") === "requests"
        ? "requests"
        : "people",
  );
  const pending = useQuery(() => api.community.pending(), []);
  const requests = useQuery(() => api.requests.list(), []);
  const waitingRequests = (requests.data ?? []).filter((item) => item.status === "pending");
  const accounts = useQuery(() => api.users.list(), []);
  const applications = (accounts.data ?? []).filter(
    (person) => person.role === "tutor" && person.tutorStatus === "pending",
  );

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

      <Suspense fallback={null}>
        <GoogleConnectBanner />
      </Suspense>

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
            {item.id === "tutors" && applications.length > 0 ? (
              <span className="ml-2 rounded-full bg-saffron-400 px-1.5 text-[0.65rem] font-bold text-ink-900">
                {applications.length}
              </span>
            ) : null}
            {item.id === "requests" && waitingRequests.length > 0 ? (
              <span className="ml-2 rounded-full bg-saffron-400 px-1.5 text-[0.65rem] font-bold text-ink-900">
                {waitingRequests.length}
              </span>
            ) : null}
            {item.id === "moderation" && (pending.data ?? []).length > 0 ? (
              <span className="ml-2 rounded-full bg-saffron-400 px-1.5 text-[0.65rem] font-bold text-ink-900">
                {(pending.data ?? []).length}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "people" ? <People me={user} /> : null}
      {tab === "requests" ? <AdminRequests /> : null}
      {tab === "tutors" ? <TutorApplications /> : null}
      {tab === "feedback" ? <AllFeedback /> : null}
      {tab === "moderation" ? <Moderation /> : null}
      {tab === "waitlist" ? <Waitlist /> : null}
      {tab === "mail" ? (
        <div className="space-y-6">
          <GoogleSystemCalendarConnect />
          <GoogleMailConnect />
        </div>
      ) : null}
      {tab === "audit" ? <AuditLog /> : null}
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
  const markVerified = useAction((id: string) => api.users.markVerified(id));
  const { confirm, dialog } = useConfirm();

  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [addingEmail, setAddingEmail] = useState<User | null>(null);

  if (users.loading) return <Loading label="Loading accounts" />;

  const everyone = (users.data ?? [])
    .slice()
    .sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));

  return (
    <div className="space-y-3">
      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="font-medium text-ink-800">Add someone yourself</p>
          <p className="text-xs leading-relaxed text-ink-500">
            Bring an existing tutor onto the site, or add another administrator. They get an
            email with a link to choose their own password. A tutor can be listed on the
            tutors page before you have their email; invite them once you do.
          </p>
        </div>
        <Button size="sm" onClick={() => setInviting(true)}>
          Invite someone
        </Button>
      </Card>

      {inviting ? <InviteDialog onClose={() => setInviting(false)} /> : null}
      {editing ? <EditProfileDialog user={editing} onClose={() => setEditing(null)} /> : null}
      {addingEmail ? (
        <AddEmailDialog user={addingEmail} onClose={() => setAddingEmail(null)} />
      ) : null}

      {everyone.map((person) => (
        <Card key={person.id} className="flex flex-wrap items-center gap-4 p-5">
          <Avatar
            name={person.name}
            avatarId={person.avatarId}
            photoUrl={person.photoId ? profilePhotoUrl(person.id, person.photoId) : undefined}
          />

          <div className="min-w-[14rem] flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-ink-800">{person.name}</p>
              {!person.email ? (
                <Badge tone="saffron">No email yet</Badge>
              ) : !person.verified ? (
                <Badge tone="saffron">Unverified</Badge>
              ) : null}
              {person.superAdmin ? <Badge tone="ocean">Super admin</Badge> : null}
              {person.role === "tutor" && person.tutorStatus === "pending" ? (
                <Badge tone="saffron">Awaiting approval</Badge>
              ) : null}
              {person.role === "tutor" && person.tutorStatus === "rejected" ? (
                <Badge tone="clay">Not approved</Badge>
              ) : null}
              {person.membership === "active" ? <Badge tone="jade">Member</Badge> : null}
              {person.id === me.id ? <Badge tone="ocean">You</Badge> : null}
            </div>
            <p className="truncate text-xs text-ink-400">
              {person.email || "Listed on the tutors page, not invited yet"} · added{" "}
              {formatDate(person.createdAt)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {/* A fixed width, so every row's role picker lines up. */}
            <div className="w-32 shrink-0">
              <Select
                aria-label={`Role for ${person.name}`}
                className="h-9 py-0 text-sm"
                value={person.role}
                disabled={person.id === me.id || person.superAdmin || setRole.pending}
                onChange={(event) => void setRole.run(person.id, event.target.value as Role)}
              >
                <option value="student">Student</option>
                <option value="tutor">Tutor</option>
                <option value="admin">Admin</option>
              </Select>
            </div>

            {!person.email ? (
              <Button size="sm" onClick={() => setAddingEmail(person)}>
                Add email &amp; invite
              </Button>
            ) : null}

            {person.email && !person.verified ? (
              <Button
                size="sm"
                variant="secondary"
                disabled={markVerified.pending}
                title="When their code never arrived and you know the address is theirs"
                onClick={async () => {
                  const yes = await confirm({
                    title: `Confirm ${person.name}'s email?`,
                    message: `Marks ${person.email} as theirs, so they can log in without the code. Only do this if you know the address is theirs.`,
                    confirmLabel: "Mark verified",
                    tone: "neutral",
                  });
                  if (yes) void markVerified.run(person.id);
                }}
              >
                Mark verified
              </Button>
            ) : null}

            {person.role === "tutor" ? (
              <Button variant="secondary" size="sm" onClick={() => setEditing(person)}>
                Edit profile
              </Button>
            ) : null}

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
              variant="danger-ghost"
              size="sm"
              disabled={person.id === me.id || person.superAdmin || remove.pending}
              onClick={async () => {
                const yes = await confirm({
                  title: `Delete ${person.name}'s account?`,
                  message: `${person.name} is signed out and can no longer log in. Their bookings, messages and posts stay on record. This cannot be undone.`,
                  confirmLabel: "Delete account",
                });
                if (yes) void remove.run(person.id);
              }}
            >
              Delete
            </Button>
          </div>
        </Card>
      ))}
      {dialog}
    </div>
  );
}

function EditProfileDialog({ user, onClose }: { user: User; onClose: () => void }) {
  return (
    <Modal
      open
      onClose={onClose}
      title={`${user.name}'s profile`}
      description="What students see on the tutors page. The tutor can edit this themselves too."
      className="sm:max-w-2xl"
    >
      <ProfileEditor user={user} />
    </Modal>
  );
}

function AddEmailDialog({ user, onClose }: { user: User; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<User | null>(null);
  const add = useAction(() => api.users.addEmail(user.id, email.trim()));

  return (
    <Modal
      open
      onClose={onClose}
      title={sent ? "Invitation sent" : `Invite ${user.name}`}
      description={
        sent
          ? undefined
          : "Adds their email address and sends a link to set a password, valid for seven days. Once they have an account, students can book them."
      }
    >
      {sent ? (
        <div className="space-y-5">
          <Alert tone="jade">
            {sent.name} can now sign in and be booked. The invitation is on its way to{" "}
            {sent.email} — ask them to set their hours under Calendar → My hours.
          </Alert>
          <Button className="w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const result = await add.run();
            if (result) setSent(result);
          }}
        >
          <Field label="Email" htmlFor="add-email">
            <Input
              id="add-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          {add.error ? <Alert>{add.error}</Alert> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={add.pending || !email.trim()}>
              {add.pending ? "Sending…" : "Add and send invite"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function InviteDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("tutor");
  const [languages, setLanguages] = useState<LanguageCode[]>(["sinhala"]);
  const [sent, setSent] = useState<User | null>(null);
  const invite = useAction(() =>
    api.users.invite({ name, email: email.trim() || undefined, role, languages }),
  );
  // A tutor can be listed now and invited once we have their address.
  const listOnly = role === "tutor" && !email.trim();

  return (
    <Modal
      open
      onClose={onClose}
      title={sent ? (sent.email ? "Invitation sent" : "Tutor listed") : "Invite someone"}
      description={
        sent
          ? undefined
          : "Creates the account now. The email they get has a link to set a password, valid for seven days."
      }
    >
      {sent ? (
        <div className="space-y-5">
          <Alert tone="jade">
            {sent.email ? (
              <>
                {sent.name}&rsquo;s account is ready and the email is on its way to {sent.email}.
                {sent.role === "tutor"
                  ? " They are approved already — ask them to fill in their profile and hours."
                  : ""}
              </>
            ) : (
              <>
                {sent.name} is on the tutors page. Fill in their profile and photo with
                &ldquo;Edit profile&rdquo;, and use &ldquo;Add email &amp; invite&rdquo; once
                you have their address — students can book them from then on.
              </>
            )}
          </Alert>
          <Button className="w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="Name" htmlFor="invite-name">
            <Input id="invite-name" value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field
            label="Email"
            htmlFor="invite-email"
            hint={role === "tutor" ? "Optional for a tutor — leave it blank to list them now and invite them later." : undefined}
          >
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field label="Role" htmlFor="invite-role">
            <Select
              id="invite-role"
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
            >
              <option value="tutor">Tutor</option>
              <option value="student">Student</option>
              <option value="admin">Administrator</option>
            </Select>
          </Field>
          <div className="grid gap-2 sm:grid-cols-2">
            {(["sinhala", "tamil"] as LanguageCode[]).map((language) => (
              <Checkbox
                key={language}
                label={language === "sinhala" ? "Sinhala" : "Tamil"}
                checked={languages.includes(language)}
                onChange={() =>
                  setLanguages((current) =>
                    current.includes(language)
                      ? current.filter((value) => value !== language)
                      : [...current, language],
                  )
                }
              />
            ))}
          </div>

          {invite.error ? <Alert>{invite.error}</Alert> : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={
                invite.pending ||
                !name.trim() ||
                (!email.trim() && role !== "tutor") ||
                languages.length === 0
              }
              onClick={async () => {
                const result = await invite.run();
                if (result) setSent(result);
              }}
            >
              {invite.pending ? "Saving…" : listOnly ? "List tutor" : "Create and send invite"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function TutorApplications() {
  const users = useQuery(() => api.users.list(), []);

  if (users.loading) return <Loading label="Loading applications" />;

  const tutors = (users.data ?? []).filter((person) => person.role === "tutor");
  const pending = tutors.filter((person) => person.tutorStatus === "pending");
  const rejected = tutors.filter((person) => person.tutorStatus === "rejected");

  return (
    <>
      {pending.length === 0 ? (
        <EmptyState icon="🧑‍🏫" title="No applications waiting">
          Anyone who signs up to teach lands here. Students cannot find or book them until you
          approve.
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {pending.map((tutor) => (
            <TutorApplicationRow key={tutor.id} tutor={tutor} />
          ))}
        </div>
      )}

      {rejected.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-xl">Not approved</h2>
          <div className="mt-4 space-y-4">
            {rejected.map((tutor) => (
              <TutorApplicationRow key={tutor.id} tutor={tutor} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

function TutorApplicationRow({ tutor }: { tutor: User }) {
  const [note, setNote] = useState("");
  const decide = useAction((status: "approved" | "rejected") =>
    api.users.setTutorStatus(tutor.id, status, note.trim() || undefined),
  );
  const { confirm, dialog } = useConfirm();

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Avatar name={tutor.name} avatarId={tutor.avatarId} photoUrl={photoUrlFor(tutor)} />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink-800">{tutor.name}</p>
          <p className="truncate text-xs text-ink-400">
            {tutor.email} · applied {relativeTime(tutor.createdAt)}
            {tutor.verified ? "" : " · email not confirmed yet"}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {tutor.languages.map((language) => (
            <Badge key={language} tone={language === "sinhala" ? "jade" : "clay"}>
              {language === "sinhala" ? "Sinhala" : "Tamil"}
            </Badge>
          ))}
        </div>
      </div>

      {tutor.headline ? (
        <p className="mt-4 font-display text-lg leading-snug text-ink-800">
          &ldquo;{tutor.headline}&rdquo;
        </p>
      ) : null}
      <p className="mt-2 text-xs text-ink-500">
        {[tutor.homeTown, tutor.yearsTeaching !== undefined ? `${tutor.yearsTeaching} years teaching` : null]
          .filter(Boolean)
          .join(" · ") || "No details yet"}
      </p>
      {tutor.bio ? (
        <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-ink-600">{tutor.bio}</p>
      ) : null}

      <Textarea
        className="mt-4 min-h-20"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Optional note, emailed to them if you decline."
        aria-label={`Note for ${tutor.name}`}
      />

      {decide.error ? (
        <div className="mt-3">
          <Alert>{decide.error}</Alert>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" disabled={decide.pending} onClick={() => void decide.run("approved")}>
          Approve
        </Button>
        {tutor.tutorStatus !== "rejected" ? (
          <Button
            size="sm"
            variant="danger-ghost"
            disabled={decide.pending}
            onClick={async () => {
              const yes = await confirm({
                title: `Decline ${tutor.name}'s application?`,
                message: note.trim()
                  ? "They are emailed your note, and stay off the tutors page."
                  : "They are emailed that we can't take their application forward, and stay off the tutors page. Add a note above to say more.",
                confirmLabel: "Decline application",
              });
              if (yes) void decide.run("rejected");
            }}
          >
            Decline
          </Button>
        ) : null}
      </div>
      {dialog}
    </Card>
  );
}

function AllFeedback() {
  const feedback = useQuery(() => api.feedback.all(), []);
  const people = useQuery(() => api.users.directory(), []);

  if (feedback.loading) return <Loading label="Loading feedback" />;
  const items = feedback.data ?? [];
  if (items.length === 0) {
    return (
      <EmptyState icon="⭐" title="No feedback yet">
        Students are asked for a rating — or a voice note — as soon as each lesson ends.
      </EmptyState>
    );
  }

  const average = items.reduce((sum, item) => sum + item.rating, 0) / items.length;
  return (
    <Card className="p-6">
      <p className="text-sm text-ink-500">
        Average <span className="font-medium text-ink-800">{average.toFixed(1)} ★</span> across{" "}
        {items.length} lessons.
      </p>
      <div className="mt-4">
        <FeedbackList
          items={items}
          people={new Map((people.data ?? []).map((person) => [person.id, person]))}
          show="both"
        />
      </div>
    </Card>
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
          <ul className="mt-4 divide-y divide-ink-900/8 rounded-2xl bg-white px-5 border border-forest/10">
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
  const { confirm, dialog } = useConfirm();

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
          variant="danger-ghost"
          disabled={moderate.pending}
          onClick={async () => {
            const yes = await confirm({
              title: "Reject this post?",
              message: "It won't appear in the community. The author sees it was not approved, with your note if you wrote one.",
              confirmLabel: "Reject post",
            });
            if (yes) void moderate.run("rejected");
          }}
        >
          Reject
        </Button>
      </div>
      {dialog}
    </Card>
  );
}

function TakeDown({ postId }: { postId: string }) {
  const moderate = useAction(() =>
    api.community.moderate(postId, "rejected", "Taken down by a moderator."),
  );

  const { confirm, dialog } = useConfirm();

  return (
    <>
      <Button
        variant="danger-ghost"
        size="sm"
        disabled={moderate.pending}
        onClick={async () => {
          const yes = await confirm({
            title: "Take this post down?",
            message: "It disappears from the community straight away, and its author sees it was taken down by a moderator.",
            confirmLabel: "Take down",
          });
          if (yes) void moderate.run();
        }}
      >
        Take down
      </Button>
      {dialog}
    </>
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

const actionLabel: Record<string, string> = {
  role_change: "Changed role",
  membership_change: "Changed membership",
  account_deleted: "Deleted account",
  post_moderated: "Moderated post",
  account_invited: "Invited",
  tutor_listed: "Listed tutor",
  email_verified: "Confirmed email",
  request_approved: "Approved request",
  request_declined: "Declined request",
  tutor_review: "Reviewed tutor",
};

function AuditLog() {
  const entries = useQuery(() => api.users.auditLog(), []);

  if (entries.loading) return <Loading label="Loading the audit log" />;

  const rows = entries.data ?? [];

  if (rows.length === 0) {
    return (
      <EmptyState icon="🗒️" title="Nothing logged yet">
        Role changes, membership changes, deletions, and moderation decisions will show up
        here as they happen.
      </EmptyState>
    );
  }

  return (
    <ul className="divide-y divide-ink-900/8 rounded-2xl bg-white px-5 border border-forest/10">
      {rows.map((entry) => (
        <li key={entry.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={entry.action === "account_deleted" ? "clay" : "jade"}>
                {actionLabel[entry.action] ?? entry.action}
              </Badge>
              <span className="text-sm font-medium text-ink-800">{entry.targetLabel}</span>
            </div>
            {entry.detail ? (
              <p className="mt-1 text-xs text-ink-500">{entry.detail}</p>
            ) : null}
          </div>
          <div className="shrink-0 text-right text-xs text-ink-400">
            <p>{entry.actorName}</p>
            <p>{formatDateTime(entry.createdAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
