"use client";

import { ArrowRight, ChevronLeft, ChevronRight, MailCheck, MessageSquareText, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { useAction } from "@/lib/hooks";
import {
  categoriesFor,
  searchTopics,
  type HelpAudience,
  type HelpCategory,
  type HelpTopic,
} from "@/lib/help-guide";
import { AraliyaFlower } from "@/components/site/araliya-flower";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/primitives";
import { turnstileAvailable, TurnstileWidget } from "@/components/ui/turnstile-widget";

type View =
  | { kind: "home" }
  | { kind: "category"; category: HelpCategory }
  | { kind: "topic"; topic: HelpTopic; from: View }
  | { kind: "ask"; from: View }
  | { kind: "sent"; email: string };

/**
 * The "Help" button on every page: guided answers for whoever is looking
 * (visitor, student, tutor or admin — see `lib/help-guide.ts`), a search
 * over them, and "Ask us" for anything they don't cover, which goes to
 * Admin → Questions and is answered by email.
 */
export function HelpWidget() {
  const { user } = useAuth();
  const audience: HelpAudience = user?.role ?? "visitor";
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>({ kind: "home" });
  const [query, setQuery] = useState("");
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Each new screen starts at the top.
  useEffect(() => {
    panel.current?.scrollTo({ top: 0 });
  }, [view]);

  const go = (next: View) => setView(next);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full bg-forest py-2 pr-4 pl-2 text-sm border border-cream/30 font-medium text-cream shadow-lifted transition hover:bg-fern print:hidden",
          open && "bg-fern",
        )}
        aria-expanded={open}
        aria-controls="help-panel"
      >
        <AraliyaFlower className="size-6" />
        Help
      </button>

      {open ? (
        <div
          id="help-panel"
          role="dialog"
          aria-label="Help"
          className="fixed bottom-18 left-4 z-50 flex max-h-[min(36rem,calc(100vh-6rem))] w-[min(24rem,calc(100vw-2rem))] animate-rise flex-col overflow-hidden rounded-2xl bg-white shadow-lifted ring-1 ring-ink-900/10 print:hidden"
        >
          <div className="flex items-center gap-2 border-b border-ink-900/8 bg-forest px-4 py-3 text-cream">
            {view.kind !== "home" ? (
              <button
                type="button"
                onClick={() =>
                  go(view.kind === "topic" || view.kind === "ask" ? view.from : { kind: "home" })
                }
                className="-ml-1 rounded-md p-1 hover:bg-white/10"
                aria-label="Back"
              >
                <ChevronLeft className="size-4.5" aria-hidden />
              </button>
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {view.kind === "home"
                  ? `How can we help${user ? `, ${user.name.split(" ")[0]}` : ""}?`
                  : view.kind === "category"
                    ? view.category.title
                    : view.kind === "topic"
                      ? "Help"
                      : "Ask us"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 hover:bg-white/10"
              aria-label="Close help"
            >
              <X className="size-4.5" aria-hidden />
            </button>
          </div>

          <div ref={panel} className="flex-1 overflow-y-auto p-4">
            {view.kind === "home" ? (
              <Home
                audience={audience}
                query={query}
                setQuery={setQuery}
                onCategory={(category) => go({ kind: "category", category })}
                onTopic={(topic) => go({ kind: "topic", topic, from: view })}
                onAsk={() => go({ kind: "ask", from: view })}
              />
            ) : null}

            {view.kind === "category" ? (
              <TopicList
                topics={view.category.topics}
                onTopic={(topic) => go({ kind: "topic", topic, from: view })}
                onAsk={() => go({ kind: "ask", from: view })}
              />
            ) : null}

            {view.kind === "topic" ? (
              <TopicView
                topic={view.topic}
                onNavigate={() => setOpen(false)}
                onAsk={() => go({ kind: "ask", from: view })}
              />
            ) : null}

            {view.kind === "ask" ? (
              <AskForm
                initialQuestion={query}
                onSent={(email) => {
                  setQuery("");
                  go({ kind: "sent", email });
                }}
              />
            ) : null}

            {view.kind === "sent" ? (
              <div className="py-6 text-center">
                <MailCheck className="mx-auto size-8 text-jade-600" aria-hidden />
                <p className="mt-3 font-medium text-ink-900">Thanks, we&rsquo;ve got it</p>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink-600">
                  Someone from the team will reply to {view.email}, usually within a day. Check
                  your spam folder if you don&rsquo;t see it.
                </p>
                <Button variant="secondary" size="sm" className="mt-5" onClick={() => go({ kind: "home" })}>
                  Back to help
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

function Home({
  audience,
  query,
  setQuery,
  onCategory,
  onTopic,
  onAsk,
}: {
  audience: HelpAudience;
  query: string;
  setQuery: (value: string) => void;
  onCategory: (category: HelpCategory) => void;
  onTopic: (topic: HelpTopic) => void;
  onAsk: () => void;
}) {
  const searching = query.trim().length > 1;
  const results = searching ? searchTopics(audience, query) : [];

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
        <Input
          type="search"
          aria-label="Search help"
          placeholder="Search, e.g. reschedule, refund, homework"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="pl-9"
        />
      </div>

      {searching ? (
        results.length > 0 ? (
          <TopicList topics={results} onTopic={onTopic} onAsk={onAsk} />
        ) : (
          <div className="rounded-xl bg-sand-100/70 p-4 text-sm text-ink-600">
            <p>Nothing matches &ldquo;{query.trim()}&rdquo;.</p>
            <Button size="sm" className="mt-3" onClick={onAsk}>
              Ask us instead
            </Button>
          </div>
        )
      ) : (
        <>
          <ul className="space-y-1.5">
            {categoriesFor(audience).map((category) => (
              <li key={category.id}>
                <button
                  type="button"
                  onClick={() => onCategory(category)}
                  className="flex w-full items-center gap-3 rounded-xl border border-forest/10 px-3 py-2.5 text-left text-sm text-ink-800 transition hover:border-amber-spice/50 hover:bg-sand-50"
                >
                  <span className="flex-1 font-medium">{category.title}</span>
                  <ChevronRight className="size-4 text-ink-400" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          <AskPrompt onAsk={onAsk} />
        </>
      )}
    </div>
  );
}

function TopicList({
  topics,
  onTopic,
  onAsk,
}: {
  topics: HelpTopic[];
  onTopic: (topic: HelpTopic) => void;
  onAsk: () => void;
}) {
  return (
    <div className="space-y-4">
      <ul className="divide-y divide-ink-900/6 overflow-hidden rounded-xl border border-forest/10">
        {topics.map((topic) => (
          <li key={topic.id}>
            <button
              type="button"
              onClick={() => onTopic(topic)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-ink-800 transition hover:bg-sand-50"
            >
              <span className="flex-1">{topic.title}</span>
              <ChevronRight className="size-4 shrink-0 text-ink-400" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <AskPrompt onAsk={onAsk} />
    </div>
  );
}

function TopicView({
  topic,
  onNavigate,
  onAsk,
}: {
  topic: HelpTopic;
  onNavigate: () => void;
  onAsk: () => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg text-forest">{topic.title}</h2>
      <ol className="space-y-2.5">
        {topic.steps.map((step, index) => (
          <li key={index} className="flex gap-3 text-sm leading-relaxed text-ink-700">
            {topic.steps.length > 1 ? (
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-forest/8 text-[0.7rem] font-semibold text-forest">
                {index + 1}
              </span>
            ) : null}
            <span>{step}</span>
          </li>
        ))}
      </ol>
      {topic.link ? (
        <Link
          href={topic.link.href}
          onClick={onNavigate}
          className="inline-flex items-center gap-1.5 rounded-md bg-forest px-4 py-2 text-sm font-medium text-cream transition hover:bg-fern"
        >
          Go to {topic.link.label}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      ) : null}
      <div className="border-t border-ink-900/8 pt-3">
        <AskPrompt onAsk={onAsk} label="Didn't answer it?" />
      </div>
    </div>
  );
}

function AskPrompt({ onAsk, label = "Can't find what you need?" }: { onAsk: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onAsk}
      className="flex w-full items-center gap-3 rounded-xl bg-sand-100/70 px-3 py-2.5 text-left text-sm transition hover:bg-sand-100"
    >
      <MessageSquareText className="size-4.5 shrink-0 text-amber-spice" aria-hidden />
      <span className="flex-1">
        <span className="block text-ink-500">{label}</span>
        <span className="font-medium text-ink-900">Ask us and we&rsquo;ll reply by email</span>
      </span>
      <ChevronRight className="size-4 text-ink-400" aria-hidden />
    </button>
  );
}

function AskForm({ initialQuestion, onSent }: { initialQuestion: string; onSent: (email: string) => void }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [question, setQuestion] = useState(initialQuestion.trim());
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const { run, pending, error } = useAction(api.help.ask);
  // Signed-in people have already shown they're human.
  const needsCaptcha = turnstileAvailable && !user;

  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const sent = await run({
          name,
          email,
          question,
          page: pathname,
          turnstileToken: turnstileToken ?? undefined,
        });
        if (sent) onSent(sent.email);
      }}
    >
      <p className="text-sm leading-relaxed text-ink-600">
        Tell us what you&rsquo;re trying to do. Someone from the team will reply by email.
      </p>
      <Field label="Your name" htmlFor="help-name">
        <Input
          id="help-name"
          required
          maxLength={100}
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>
      <Field label="Email" htmlFor="help-email" hint="We send our reply here.">
        <Input
          id="help-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>
      <Field label="Your question" htmlFor="help-question">
        <Textarea
          id="help-question"
          required
          minLength={10}
          maxLength={3000}
          className="min-h-24"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="I'm trying to…"
        />
      </Field>
      {needsCaptcha ? <TurnstileWidget onToken={setTurnstileToken} /> : null}
      {error ? <Alert>{error}</Alert> : null}
      <Button
        type="submit"
        variant="forest"
        className="w-full"
        disabled={pending || (needsCaptcha && !turnstileToken)}
      >
        {pending ? "Sending…" : "Send question"}
      </Button>
    </form>
  );
}
