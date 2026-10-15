"use client";

import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import {
  LEARNING_COOKIE,
  parseLearningLanguage,
  type LearningLanguage,
} from "@/lib/learning-language";

const CHANGED = "sl-learning-changed";

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  return () => window.removeEventListener(CHANGED, onChange);
}

function readCookie(): LearningLanguage {
  const match = document.cookie.match(new RegExp(`(?:^|; )${LEARNING_COOKIE}=([^;]*)`));
  return parseLearningLanguage(match?.[1]);
}

/** Saves the choice for a year and tells every mounted toggle. */
function saveLearningLanguage(value: LearningLanguage) {
  document.cookie = `${LEARNING_COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  window.dispatchEvent(new Event(CHANGED));
}

export function useLearningLanguage(): LearningLanguage {
  return useSyncExternalStore(subscribe, readCookie, () => "both");
}

const options: { value: LearningLanguage; label: string; short: string; className?: string }[] = [
  { value: "sinhala", label: "Sinhala", short: "සිං", className: "text-sinhala" },
  { value: "tamil", label: "Tamil", short: "த", className: "text-tamil" },
  { value: "both", label: "Both", short: "Both" },
];

/**
 * "I'm learning: Sinhala / Tamil / Both". Saving it refreshes the server-
 * rendered page so the tutor list and the rest follow straight away.
 */
export function LanguageToggle({ variant = "compact" }: { variant?: "compact" | "full" }) {
  const router = useRouter();
  const current = useLearningLanguage();

  const choose = (value: LearningLanguage) => {
    saveLearningLanguage(value);
    router.refresh();
  };

  return (
    <div
      role="radiogroup"
      aria-label="I'm learning"
      title="Which language are you here for?"
      className={cn(
        "flex items-center gap-0.5 rounded-full p-0.5 ring-1",
        variant === "compact" ? "ring-white/15" : "w-full ring-white/20",
      )}
    >
      {variant === "full" ? (
        <span className="px-3 text-xs font-medium text-sage">I&rsquo;m learning</span>
      ) : null}
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={current === option.value}
          aria-label={option.label}
          onClick={() => choose(option.value)}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium transition",
            variant === "full" && "flex-1 py-2 text-sm",
            current === option.value
              ? "bg-cream text-forest"
              : "text-sage hover:text-cream",
          )}
        >
          <span className={option.className}>{variant === "full" ? option.label : option.short}</span>
        </button>
      ))}
    </div>
  );
}
