"use client";

import { characters, getCharacter } from "../../../shared/avatars";
import { CharacterArt } from "@/components/ui/characters";
import { cn } from "@/lib/cn";
import type { LanguageCode } from "@/lib/types";

/**
 * Pick a character to represent you. Choosing one also shows its name in
 * Sinhala and Tamil with a pronunciation guide — the first words of the
 * course, before the first lesson. `languages` puts the one being learnt
 * first; both are always shown.
 */
export function CharacterPicker({
  value,
  onChange,
  languages = ["sinhala", "tamil"],
}: {
  value?: string;
  onChange: (id: string | undefined) => void;
  languages?: LanguageCode[];
}) {
  const chosen = getCharacter(value);
  const order: LanguageCode[] =
    languages[0] === "tamil" ? ["tamil", "sinhala"] : ["sinhala", "tamil"];

  return (
    <div>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
        {characters.map((character) => {
          const active = character.id === value;
          return (
            <button
              key={character.id}
              type="button"
              aria-pressed={active}
              aria-label={character.english}
              title={character.english}
              onClick={() => onChange(active ? undefined : character.id)}
              className={cn(
                "group flex flex-col items-center gap-1.5 rounded-2xl p-2 transition",
                active ? "bg-jade-50 ring-2 ring-jade-500" : "ring-1 ring-ink-900/8 hover:bg-sand-100",
              )}
            >
              <CharacterArt id={character.id} className="size-12 transition group-hover:scale-105" />
              <span className="text-center text-[0.7rem] leading-tight text-ink-500">{character.english}</span>
            </button>
          );
        })}
      </div>

      {chosen ? (
        <div className="mt-3 flex items-start gap-4 rounded-2xl bg-sand-100/70 p-4 ring-1 ring-ink-900/6">
          <CharacterArt id={chosen.id} className="size-14 shrink-0" />
          <div className="min-w-0 text-sm">
            <p className="font-medium text-ink-800">{chosen.english}</p>
            <dl className="mt-1.5 grid gap-1 sm:grid-cols-2 sm:gap-4">
              {order.map((language) => {
                const word = chosen[language];
                return (
                  <div key={language}>
                    <dt className="text-[0.65rem] font-semibold tracking-[0.16em] text-ink-400 uppercase">
                      {language === "sinhala" ? "Sinhala" : "Tamil"}
                    </dt>
                    <dd>
                      <span
                        className={cn(
                          "block text-lg text-ink-900",
                          language === "sinhala" ? "text-sinhala" : "text-tamil",
                        )}
                      >
                        {word.script}
                      </span>
                      <span className="block text-ink-500">
                        {word.roman} · say{" "}
                        <span className="font-medium whitespace-nowrap text-ink-700">{word.say}</span>
                      </span>
                    </dd>
                  </div>
                );
              })}
            </dl>
            <p className="mt-2 text-xs leading-relaxed text-ink-500">{chosen.note}</p>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-xs text-ink-400">
          Optional — without one, your initials are shown instead.
        </p>
      )}
    </div>
  );
}
