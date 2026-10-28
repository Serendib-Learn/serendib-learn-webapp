"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/portal/page-header";
import {
  AlphabetEditor,
  HolidaysEditor,
  PhraseListsEditor,
  StagesEditor,
} from "@/components/portal/content-editor";
import { Alert, Loading } from "@/components/ui/primitives";

type Tab = "phrases" | "alphabet" | "holidays" | "stages";

/**
 * The course's teaching content, edited in place. Everything here lives in
 * the database and every page reads it through /api/content — this page is
 * the only way it changes. Tutors edit phrase lists and the alphabet;
 * administrators also add and remove them, and look after holidays and the
 * stage descriptions.
 */
export default function ContentPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("phrases");
  if (!user) return <Loading />;

  if (user.role === "student") {
    return (
      <>
        <PageHeader title="Course content" />
        <Alert>This area is for tutors and administrators.</Alert>
      </>
    );
  }

  const isAdmin = user.role === "admin";
  const tabs: { id: Tab; label: string; adminOnly?: boolean }[] = [
    { id: "phrases", label: "Phrase lists" },
    { id: "alphabet", label: "Alphabet sheets" },
    { id: "holidays", label: "Holidays", adminOnly: true },
    { id: "stages", label: "Course stages", adminOnly: true },
  ];

  return (
    <>
      <PageHeader title="Course content">
        The phrase lists, alphabet sheets and calendar holidays every page uses. Change them here and
        the learning hub, the alphabet sheet and the calendar update within a minute.
      </PageHeader>

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-full border border-forest/10 bg-white p-1 sm:w-fit">
        {tabs
          .filter((item) => isAdmin || !item.adminOnly)
          .map((item) => (
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
            </button>
          ))}
      </div>

      {tab === "phrases" ? <PhraseListsEditor isAdmin={isAdmin} /> : null}
      {tab === "alphabet" ? <AlphabetEditor /> : null}
      {tab === "holidays" && isAdmin ? <HolidaysEditor /> : null}
      {tab === "stages" && isAdmin ? <StagesEditor /> : null}
    </>
  );
}
