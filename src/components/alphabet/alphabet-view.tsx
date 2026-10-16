"use client";

import { Mic, Square, Volume2 } from "lucide-react";
import { useRef, useState, useSyncExternalStore } from "react";
import { alphabetSheets, audioKey, type AlphabetSheet, type Letter } from "@/data/alphabet";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@/lib/hooks";
import type { LanguageCode } from "@/lib/types";

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

/** Marks with no sound of their own: no audio is generated or recorded for them. */
const SILENT = new Set(["ஃ", "்", "ං", "්"]);

type Recorded = Map<string, string>;

/**
 * Where a letter or word can be heard, best first: a tutor's recording, then
 * (Tamil only) the generated file from scripts/generate-alphabet-audio.mjs.
 */
function audioSource(language: LanguageCode, text: string, recorded: Recorded): string | null {
  const key = audioKey(text);
  const version = recorded.get(`${language}:${key}`);
  if (version) return api.alphabetAudio.url(language, key, version);
  if (language === "tamil" && !SILENT.has(text)) return `/audio/alphabet/tamil/${key}.mp3`;
  return null;
}

/** Plays each source in turn (the letter, then its example word). */
function playInOrder(sources: string[]) {
  const [first, ...rest] = sources;
  if (!first) return;
  const audio = new Audio(first);
  audio.onended = () => playInOrder(rest);
  void audio.play().catch(() => undefined);
}

function speak(text: string, voice: SpeechSynthesisVoice) {
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = 0.8;
  speechSynthesis.speak(utterance);
}

/**
 * Records one letter or word (up to 8 seconds) and saves it straight away,
 * replacing any earlier recording. Tutors and admins only.
 */
function RecordChip({
  language,
  text,
  label,
  done,
  onSaved,
}: {
  language: LanguageCode;
  text: string;
  label: string;
  done: boolean;
  onSaved: () => void;
}) {
  const [state, setState] = useState<"idle" | "recording" | "saving" | "error">("idle");
  const recorder = useRef<MediaRecorder | null>(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const media = new MediaRecorder(stream, { audioBitsPerSecond: 48_000 });
      const chunks: Blob[] = [];
      media.ondataavailable = (event) => event.data.size > 0 && chunks.push(event.data);
      media.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setState("saving");
        try {
          await api.alphabetAudio.record(language, audioKey(text), new Blob(chunks, { type: media.mimeType }));
          setState("idle");
          onSaved();
        } catch {
          setState("error");
        }
      };
      recorder.current = media;
      media.start();
      setState("recording");
      setTimeout(() => media.state === "recording" && media.stop(), 8000);
    } catch {
      setState("error");
    }
  };

  return (
    <button
      type="button"
      onClick={() => (state === "recording" ? recorder.current?.stop() : void start())}
      disabled={state === "saving"}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] transition-colors print:hidden",
        state === "recording"
          ? "border-clay-500 bg-clay-500 text-white"
          : done
            ? "border-fern/30 bg-mist text-fern"
            : "border-forest/15 text-earth/60 hover:border-amber-spice/50",
      )}
      title={done ? "Recorded — click to record again" : "Record this"}
    >
      {state === "recording" ? <Square className="h-2.5 w-2.5" /> : <Mic className="h-2.5 w-2.5" />}
      {state === "recording" ? "Stop" : state === "saving" ? "Saving…" : state === "error" ? "Try again" : `${done ? "✓ " : ""}${label}`}
    </button>
  );
}

export function AlphabetView({ initial }: { initial: "sinhala" | "tamil" }) {
  const [language, setLanguage] = useState(initial);
  const sheet = alphabetSheets.find((item) => item.language === language)!;
  const voice = useVoice(sheet.voiceLangs);
  const { user } = useAuth();
  const canRecord = !!user && (user.role === "admin" || (user.role === "tutor" && (user.tutorStatus ?? "approved") === "approved"));
  const [recording, setRecording] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const recordings = useQuery(() => api.alphabetAudio.list().catch(() => []), [refresh]);
  const recorded: Recorded = new Map(
    (recordings.data ?? []).map((item) => [`${item.language}:${item.key}`, item.createdAt]),
  );
  const audio = { recorded, voice, recording, onSaved: () => setRefresh((value) => value + 1) };

  return (
    <>
      <section className="bg-weave border-b border-ink-900/8 print:border-0 print:bg-none">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16 print:py-4">
          <p className="label-eyebrow print:hidden">Free · printable</p>
          <h1 className="mt-5 text-4xl leading-[1.1] sm:text-5xl print:mt-0 print:text-3xl">
            The {sheet.name} alphabet{" "}
            <span className={cn("block text-3xl text-jade-700 sm:text-4xl print:inline print:text-2xl", language === "sinhala" ? "text-sinhala" : "text-tamil")}>
              {sheet.native}
            </span>
          </h1>
          <p className="mt-5 max-w-3xl leading-relaxed text-ink-600 print:mt-2 print:text-sm">{sheet.intro}</p>

          <div className="mt-7 flex flex-wrap items-center gap-3 print:hidden">
            <div className="flex gap-1 rounded-full bg-white p-1 border border-forest/10">
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
              {language === "tamil"
                ? "Tap 🔊 on any letter to hear it."
                : "Tap 🔊 to hear a letter. Sinhala audio is recorded by our tutors, letter by letter — the rest are on their way."}
            </span>
            {canRecord ? (
              <Button
                variant={recording ? "forest" : "secondary"}
                size="sm"
                onClick={() => setRecording((value) => !value)}
              >
                <Mic className="h-3.5 w-3.5" />
                {recording ? "Done recording" : "Record pronunciations"}
              </Button>
            ) : null}
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
                <LetterCard key={letter.letter} letter={letter} sheet={sheet} {...audio} />
              ))}
            </div>
          </section>
        ))}

        <section className="print:break-inside-avoid-page">
          <h2 className="text-2xl print:text-lg">Vowel signs</h2>
          <p className="mt-1.5 max-w-3xl text-sm text-ink-500">{sheet.vowelSigns.intro}</p>
          <div className="mt-5 flex flex-wrap gap-2 print:mt-2">
            {sheet.vowelSigns.signs.map((sign) => {
              const source = audioSource(language, sign.form, recorded);
              return (
                <div key={sign.form} className="min-w-16 rounded-xl border border-forest/10 bg-white px-3 py-2 text-center">
                  <button
                    type="button"
                    disabled={!source}
                    onClick={() => source && playInOrder([source])}
                    className="w-full disabled:cursor-default"
                    aria-label={source ? `Hear ${sign.form}` : sign.form}
                  >
                    <p className={cn("text-2xl text-ink-900", language === "sinhala" ? "text-sinhala" : "text-tamil")}>{sign.form}</p>
                    <p className="text-xs text-ink-500">
                      {sign.roman}
                      {source ? <Volume2 className="ml-1 inline h-3 w-3 text-amber-spice print:hidden" /> : null}
                    </p>
                  </button>
                  {recording ? (
                    <div className="mt-1.5">
                      <RecordChip
                        language={language}
                        text={sign.form}
                        label="Rec"
                        done={recorded.has(`${language}:${audioKey(sign.form)}`)}
                        onSaved={audio.onSaved}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
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

interface AudioProps {
  recorded: Recorded;
  voice: SpeechSynthesisVoice | null;
  recording: boolean;
  onSaved: () => void;
}

function LetterCard({
  letter,
  sheet,
  recorded,
  voice,
  recording,
  onSaved,
}: { letter: Letter; sheet: AlphabetSheet } & AudioProps) {
  const scriptClass = sheet.language === "sinhala" ? "text-sinhala" : "text-tamil";
  const sayable = !SILENT.has(letter.letter);
  const sources = [
    sayable ? audioSource(sheet.language, letter.letter, recorded) : null,
    letter.example ? audioSource(sheet.language, letter.example.word, recorded) : null,
  ].filter((source): source is string => !!source);
  const fallback = sources.length === 0 && voice;

  return (
    <div className="flex gap-4 rounded-2xl border border-forest/10 bg-white p-4 print:gap-2 print:rounded-lg print:p-2">
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
        {recording ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {sayable ? (
              <RecordChip
                language={sheet.language}
                text={letter.letter}
                label="Letter"
                done={recorded.has(`${sheet.language}:${audioKey(letter.letter)}`)}
                onSaved={onSaved}
              />
            ) : null}
            {letter.example ? (
              <RecordChip
                language={sheet.language}
                text={letter.example.word}
                label="Word"
                done={recorded.has(`${sheet.language}:${audioKey(letter.example.word)}`)}
                onSaved={onSaved}
              />
            ) : null}
          </div>
        ) : null}
      </div>
      {sources.length > 0 || fallback ? (
        <button
          type="button"
          aria-label={`Hear ${letter.letter}${letter.example ? ` and ${letter.example.word}` : ""}`}
          onClick={() =>
            sources.length > 0
              ? playInOrder(sources)
              : voice && speak(letter.example ? `${letter.letter}. ${letter.example.word}` : letter.letter, voice)
          }
          className="self-start rounded-full p-1.5 text-amber-spice transition hover:bg-mist print:hidden"
        >
          <Volume2 className="h-4 w-4" strokeWidth={1.75} />
        </button>
      ) : null}
    </div>
  );
}
