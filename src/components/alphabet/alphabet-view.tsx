"use client";

import { useState, useSyncExternalStore } from "react";
import { alphabetSheets, type AlphabetSheet, type Letter } from "@/data/alphabet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

function subscribeToVoices(onChange: () => void) {
  if (typeof speechSynthesis === "undefined") return () => {};
  speechSynthesis.addEventListener("voiceschanged", onChange);
  return () => speechSynthesis.removeEventListener("voiceschanged", onChange);
}

/** The browser's voice for this language, if it has one. Most phones do; many desktops do not. */
function useVoice(langs: string[]): SpeechSynthesisVoice | null {
  const name = useSyncExternalStore(
    subscribeToVoices,
    () => {
      if (typeof speechSynthesis === "undefined") return "";
      const voices = speechSynthesis.getVoices();
      for (const lang of langs) {
        const match = voices.find((voice) => voice.lang.toLowerCase().startsWith(lang.toLowerCase()));
        if (match) return match.name;
      }
      return "";
    },
    () => "",
  );
  if (!name || typeof speechSynthesis === "undefined") return null;
  return speechSynthesis.getVoices().find((voice) => voice.name === name) ?? null;
}

function speak(text: string, voice: SpeechSynthesisVoice) {
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = 0.8;
  speechSynthesis.speak(utterance);
}

export function AlphabetView({ initial }: { initial: "sinhala" | "tamil" }) {
  const [language, setLanguage] = useState(initial);
  const sheet = alphabetSheets.find((item) => item.language === language)!;
  const voice = useVoice(sheet.voiceLangs);

  return (
    <>
      <section className="bg-weave border-b border-ink-900/8 print:border-0 print:bg-none">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16 print:py-4">
          <Badge tone="jade" className="print:hidden">Free · printable</Badge>
          <h1 className="mt-5 text-4xl leading-[1.1] sm:text-5xl print:mt-0 print:text-3xl">
            The {sheet.name} alphabet{" "}
            <span className={cn("block text-3xl text-jade-700 sm:text-4xl print:inline print:text-2xl", language === "sinhala" ? "text-sinhala" : "text-tamil")}>
              {sheet.native}
            </span>
          </h1>
          <p className="mt-5 max-w-3xl leading-relaxed text-ink-600 print:mt-2 print:text-sm">{sheet.intro}</p>

          <div className="mt-7 flex flex-wrap items-center gap-3 print:hidden">
            <div className="flex gap-1 rounded-full bg-white p-1 ring-1 ring-ink-900/8">
              {alphabetSheets.map((item) => (
                <button
                  key={item.language}
                  type="button"
                  onClick={() => setLanguage(item.language)}
                  aria-pressed={item.language === language}
                  className={cn(
                    "rounded-full px-5 py-2 text-sm font-medium transition",
                    item.language === language ? "bg-ink-900 text-sand-50" : "text-ink-500 hover:text-ink-900",
                  )}
                >
                  {item.name}
                </button>
              ))}
            </div>
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              Print this sheet
            </Button>
            <span className="text-xs text-ink-400">
              {voice
                ? "Tap 🔊 on any letter to hear it."
                : `Your browser has no ${sheet.name} voice, so there is no audio here — your tutor will say them with you.`}
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-14 px-5 py-14 sm:px-8 print:space-y-6 print:py-2">
        {sheet.groups.map((group) => (
          <section key={group.title} className="print:break-inside-avoid-page">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <h2 className="text-2xl print:text-lg">{group.title}</h2>
              {group.native ? <span className="text-sm text-ink-400">{group.native}</span> : null}
            </div>
            {group.intro ? <p className="mt-1.5 max-w-3xl text-sm text-ink-500">{group.intro}</p> : null}
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 print:mt-2 print:grid-cols-3 print:gap-1.5">
              {group.letters.map((letter) => (
                <LetterCard key={letter.letter} letter={letter} sheet={sheet} voice={voice} />
              ))}
            </div>
          </section>
        ))}

        <section className="print:break-inside-avoid-page">
          <h2 className="text-2xl print:text-lg">Vowel signs</h2>
          <p className="mt-1.5 max-w-3xl text-sm text-ink-500">{sheet.vowelSigns.intro}</p>
          <div className="mt-5 flex flex-wrap gap-2 print:mt-2">
            {sheet.vowelSigns.signs.map((sign) => (
              <div key={sign.form} className="min-w-16 rounded-xl bg-white px-3 py-2 text-center ring-1 ring-ink-900/8">
                <p className={cn("text-2xl text-ink-900", language === "sinhala" ? "text-sinhala" : "text-tamil")}>{sign.form}</p>
                <p className="text-xs text-ink-500">{sign.roman}</p>
              </div>
            ))}
          </div>
        </section>

        <p className="max-w-3xl rounded-2xl bg-sand-100 px-5 py-4 text-xs leading-relaxed text-ink-500 print:hidden">
          This sheet was drafted with AI as a first pass and is being checked by our tutors.
          Sound hints compare to English where there is a close match; IPA is given for anyone who
          reads it. Spotted something off? Tell your tutor, or write to us at
          serendib.learn@gmail.com.
        </p>
      </div>
    </>
  );
}

function LetterCard({
  letter,
  sheet,
  voice,
}: {
  letter: Letter;
  sheet: AlphabetSheet;
  voice: SpeechSynthesisVoice | null;
}) {
  const scriptClass = sheet.language === "sinhala" ? "text-sinhala" : "text-tamil";
  return (
    <div className="flex gap-4 rounded-2xl bg-white p-4 ring-1 ring-ink-900/8 print:gap-2 print:rounded-lg print:p-2">
      <div className="w-16 shrink-0 text-center print:w-10">
        <p className={cn("text-4xl leading-tight text-ink-900 print:text-2xl", scriptClass)}>{letter.letter}</p>
        <p className="font-medium text-jade-700 print:text-xs">{letter.roman}</p>
      </div>
      <div className="min-w-0 flex-1 text-sm print:text-[0.65rem]">
        <p className="leading-snug text-ink-700">{letter.sound}</p>
        <p className="mt-0.5 font-mono text-xs text-ink-400 print:text-[0.6rem]">/{letter.ipa}/</p>
        {letter.example ? (
          <p className="mt-2 leading-snug print:mt-1">
            <span className={cn("text-base text-ink-900 print:text-xs", scriptClass)}>{letter.example.word}</span>{" "}
            <span className="text-ink-500">
              {letter.example.roman} · {letter.example.meaning}
            </span>
          </p>
        ) : null}
      </div>
      {voice ? (
        <button
          type="button"
          aria-label={`Hear ${letter.letter}${letter.example ? ` and ${letter.example.word}` : ""}`}
          onClick={() => speak(letter.example ? `${letter.letter}. ${letter.example.word}` : letter.letter, voice)}
          className="self-start rounded-full p-1.5 text-ink-400 transition hover:bg-sand-100 hover:text-ink-800 print:hidden"
        >
          🔊
        </button>
      ) : null}
    </div>
  );
}
