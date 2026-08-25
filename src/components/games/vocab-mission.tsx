"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, Card, Progress } from "@/components/ui/primitives";
import { allChapters, romanOf, scriptOf, type Chapter, type Phrase } from "@/data/vocabulary";
import type { LanguageCode } from "@/lib/types";

type Stage = "setup" | "study" | "quiz" | "results";

interface Question {
  phrase: Phrase;
  options: Phrase[];
}

const languageLabel: Record<LanguageCode, string> = {
  sinhala: "Sinhala",
  tamil: "Tamil",
};

function shuffle<T>(items: T[]): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Distractors come from the same chapter first, then the wider phase. */
function buildQuestions(chapter: Chapter, language: LanguageCode): Question[] {
  const pool = allChapters
    .flatMap((candidate) => candidate.phrases)
    .filter((phrase) => !chapter.phrases.includes(phrase));

  return shuffle(chapter.phrases).map((phrase) => {
    const sameChapter = chapter.phrases.filter(
      (candidate) => romanOf(candidate, language) !== romanOf(phrase, language),
    );
    const distractors = shuffle(sameChapter).slice(0, 3);

    while (distractors.length < 3 && pool.length > 0) {
      const candidate = pool[Math.floor(Math.random() * pool.length)];
      const clash = distractors.some(
        (existing) => romanOf(existing, language) === romanOf(candidate, language),
      );
      if (!clash && romanOf(candidate, language) !== romanOf(phrase, language)) {
        distractors.push(candidate);
      }
    }

    return { phrase, options: shuffle([phrase, ...distractors]) };
  });
}

function ScriptToggle({
  language,
  onChange,
}: {
  language: LanguageCode;
  onChange: (next: LanguageCode) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Language"
      className="inline-flex rounded-full bg-sand-100 p-1 ring-1 ring-inset ring-ink-900/8"
    >
      {(["sinhala", "tamil"] as LanguageCode[]).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={language === option}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium transition",
            language === option
              ? "bg-white text-ink-900 shadow-card"
              : "text-ink-500 hover:text-ink-800",
          )}
        >
          {languageLabel[option]}
        </button>
      ))}
    </div>
  );
}

export function VocabMission({ chapter }: { chapter: Chapter }) {
  const { user } = useAuth();
  const [language, setLanguage] = useState<LanguageCode>("sinhala");
  const [stage, setStage] = useState<Stage>("setup");

  const [cardIndex, setCardIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [picked, setPicked] = useState<Phrase | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [saved, setSaved] = useState(false);

  const startStudy = () => {
    setCardIndex(0);
    setRevealed(false);
    setStage("study");
  };

  const startQuiz = () => {
    setQuestions(buildQuestions(chapter, language));
    setQuestionIndex(0);
    setPicked(null);
    setCorrectCount(0);
    setSaved(false);
    setStage("quiz");
  };

  const finishQuiz = async (finalCorrect: number) => {
    setStage("results");
    if (user) {
      await api.games.record(user.id, chapter.id, language, finalCorrect, chapter.phrases.length);
      setSaved(true);
    }
  };

  if (stage === "setup") {
    return (
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-8">
          <p className="text-xs font-semibold tracking-[0.16em] text-ink-300 uppercase">
            Chapter {chapter.number}
          </p>
          <h1 className="mt-2 flex items-center gap-3 text-3xl">
            <span aria-hidden>{chapter.emoji}</span>
            {chapter.title}
          </h1>
          <p className="mt-4 leading-relaxed text-ink-600">{chapter.scene}</p>

          <div className="mt-8">
            <p className="mb-3 text-sm font-medium text-ink-700">Which language?</p>
            <ScriptToggle language={language} onChange={setLanguage} />
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={startStudy}
              className="group rounded-2xl bg-sand-100 p-5 text-left ring-1 ring-inset ring-ink-900/8 transition hover:bg-jade-50 hover:ring-jade-200"
            >
              <span className="text-xl" aria-hidden>
                📖
              </span>
              <p className="mt-2 font-display text-lg text-ink-900">Study the deck</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-500">
                {chapter.phrases.length} cards. Flip each one, no scoring.
              </p>
            </button>

            <button
              type="button"
              onClick={startQuiz}
              className="group rounded-2xl bg-ink-900 p-5 text-left text-sand-100 transition hover:bg-ink-800"
            >
              <span className="text-xl" aria-hidden>
                🎯
              </span>
              <p className="mt-2 font-display text-lg text-sand-50">Test yourself</p>
              <p className="mt-1 text-sm leading-relaxed text-sand-200/70">
                {chapter.phrases.length} questions, four options each.
              </p>
            </button>
          </div>
        </Card>

        <Card className="p-8">
          <p className="text-sm font-medium text-ink-700">What&rsquo;s in this chapter</p>
          <ul className="mt-4 divide-y divide-ink-900/6">
            {chapter.phrases.map((phrase) => (
              <li key={phrase.n} className="flex items-baseline justify-between gap-4 py-2.5">
                <span className="text-sm text-ink-600">{phrase.english}</span>
                <span
                  className={cn(
                    "shrink-0 text-right text-base",
                    language === "sinhala" ? "text-sinhala" : "text-tamil",
                  )}
                >
                  {scriptOf(phrase, language)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    );
  }

  if (stage === "study") {
    const phrase = chapter.phrases[cardIndex];
    const last = cardIndex === chapter.phrases.length - 1;

    return (
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setStage("setup")}
            className="text-sm text-ink-500 transition hover:text-ink-900"
          >
            ← Back
          </button>
          <ScriptToggle language={language} onChange={setLanguage} />
        </div>

        <Progress
          value={cardIndex + 1}
          max={chapter.phrases.length}
          className="mt-6"
        />
        <p className="mt-2 text-center text-xs text-ink-400">
          Card {cardIndex + 1} of {chapter.phrases.length}
        </p>

        <button
          type="button"
          onClick={() => setRevealed((value) => !value)}
          className="mt-6 block w-full text-left"
          aria-label={revealed ? "Hide the answer" : "Reveal the answer"}
        >
          <Card className="min-h-72 p-9 transition hover:shadow-lifted">
            <p className="text-xs font-semibold tracking-[0.16em] text-ink-300 uppercase">
              English
            </p>
            <p className="mt-2 font-display text-3xl leading-snug text-ink-900">
              {phrase.english}
            </p>

            {revealed ? (
              <div className="mt-8 animate-rise space-y-5 border-t border-ink-900/8 pt-7">
                <div>
                  <p className="text-xs font-semibold tracking-[0.16em] text-jade-600 uppercase">
                    {languageLabel[language]}
                  </p>
                  <p
                    className={cn(
                      "mt-2 text-3xl leading-snug text-ink-900",
                      language === "sinhala" ? "text-sinhala" : "text-tamil",
                    )}
                  >
                    {scriptOf(phrase, language)}
                  </p>
                  <p className="mt-1.5 text-lg text-ink-600">{romanOf(phrase, language)}</p>
                </div>

                {phrase.note ? (
                  <p className="rounded-xl bg-saffron-50 px-4 py-3 text-sm leading-relaxed text-saffron-600">
                    {phrase.note}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-8 border-t border-dashed border-ink-900/12 pt-7 text-sm text-ink-400">
                Say it out loud, then tap to check.
              </p>
            )}
          </Card>
        </button>

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              setCardIndex((index) => Math.max(0, index - 1));
              setRevealed(false);
            }}
            disabled={cardIndex === 0}
          >
            Previous
          </Button>

          {last ? (
            <Button onClick={startQuiz}>Test yourself →</Button>
          ) : (
            <Button
              onClick={() => {
                setCardIndex((index) => index + 1);
                setRevealed(false);
              }}
            >
              Next card
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (stage === "quiz") {
    const question = questions[questionIndex];
    const answered = picked !== null;
    const isCorrect = answered && romanOf(picked, language) === romanOf(question.phrase, language);

    return (
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setStage("setup")}
            className="text-sm text-ink-500 transition hover:text-ink-900"
          >
            ← Give up
          </button>
          <span className="text-sm text-ink-500">
            {correctCount} / {questionIndex + (answered ? 1 : 0)} correct
          </span>
        </div>

        <Progress value={questionIndex + 1} max={questions.length} className="mt-6" />
        <p className="mt-2 text-center text-xs text-ink-400">
          Question {questionIndex + 1} of {questions.length}
        </p>

        <Card className="mt-6 p-8">
          <p className="text-xs font-semibold tracking-[0.16em] text-ink-300 uppercase">
            How do you say
          </p>
          <p className="mt-2 font-display text-3xl leading-snug text-ink-900">
            {question.phrase.english}
          </p>
          <p className="mt-1.5 text-sm text-ink-400">in {languageLabel[language]}</p>

          <div className="mt-7 space-y-3">
            {question.options.map((option) => {
              const optionRoman = romanOf(option, language);
              const isAnswer = optionRoman === romanOf(question.phrase, language);
              const isPicked = answered && romanOf(picked, language) === optionRoman;

              return (
                <button
                  key={optionRoman + option.english}
                  type="button"
                  disabled={answered}
                  onClick={() => {
                    setPicked(option);
                    if (romanOf(option, language) === romanOf(question.phrase, language)) {
                      setCorrectCount((count) => count + 1);
                    }
                  }}
                  className={cn(
                    "w-full rounded-xl px-5 py-4 text-left ring-1 ring-inset transition",
                    !answered && "bg-white ring-ink-900/10 hover:bg-sand-50 hover:ring-jade-300",
                    answered && isAnswer && "bg-jade-50 ring-jade-400",
                    answered && isPicked && !isAnswer && "bg-clay-50 ring-clay-400",
                    answered && !isAnswer && !isPicked && "bg-white/50 ring-ink-900/6 opacity-55",
                  )}
                >
                  <span
                    className={cn(
                      "block text-xl leading-snug",
                      language === "sinhala" ? "text-sinhala" : "text-tamil",
                    )}
                  >
                    {scriptOf(option, language)}
                  </span>
                  <span className="mt-0.5 block text-sm text-ink-500">{optionRoman}</span>
                </button>
              );
            })}
          </div>

          {answered ? (
            <div className="mt-7 animate-rise border-t border-ink-900/8 pt-6">
              <p
                className={cn(
                  "font-display text-lg",
                  isCorrect ? "text-jade-700" : "text-clay-600",
                )}
              >
                {isCorrect ? "Correct." : `Not quite — it is ${romanOf(question.phrase, language)}.`}
              </p>
              {question.phrase.note ? (
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{question.phrase.note}</p>
              ) : null}

              <Button
                className="mt-5 w-full"
                onClick={() => {
                  const finalCorrect = correctCount;
                  if (questionIndex === questions.length - 1) {
                    void finishQuiz(finalCorrect);
                  } else {
                    setQuestionIndex((index) => index + 1);
                    setPicked(null);
                  }
                }}
              >
                {questionIndex === questions.length - 1 ? "See your score" : "Next question"}
              </Button>
            </div>
          ) : null}
        </Card>
      </div>
    );
  }

  const total = chapter.phrases.length;
  const pct = Math.round((correctCount / total) * 100);
  const verdict =
    pct === 100
      ? "Perfect. Every one."
      : pct >= 80
        ? "Solid. You could use these tomorrow."
        : pct >= 50
          ? "Halfway there. Run the deck once more."
          : "Early days. Study the cards and come back.";

  return (
    <div className="mx-auto max-w-xl">
      <Card className="p-9 text-center">
        <p className="text-5xl" aria-hidden>
          {pct === 100 ? "🏆" : pct >= 80 ? "🌴" : pct >= 50 ? "🛺" : "📖"}
        </p>
        <p className="mt-5 font-display text-6xl text-ink-900">{pct}%</p>
        <p className="mt-2 text-ink-500">
          {correctCount} of {total} in {languageLabel[language]}
        </p>

        <p className="mt-6 font-display text-xl text-ink-900">{verdict}</p>

        {user ? (
          saved ? (
            <Badge tone="jade" className="mt-5">
              Saved to your portal
            </Badge>
          ) : null
        ) : (
          <p className="mt-5 text-sm text-ink-400">
            <Link
              href="/portal/login"
              className="font-medium text-jade-700 underline decoration-jade-300 underline-offset-4"
            >
              Log in
            </Link>{" "}
            next time and scores like this get saved.
          </p>
        )}

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Button variant="secondary" onClick={startQuiz}>
            Try again
          </Button>
          <Button
            onClick={() => {
              setLanguage(language === "sinhala" ? "tamil" : "sinhala");
              setStage("setup");
            }}
          >
            Now in {languageLabel[language === "sinhala" ? "tamil" : "sinhala"]}
          </Button>
        </div>

        <ButtonLink href="/games/languages" variant="ghost" size="sm" className="mt-5">
          Back to the chapter map
        </ButtonLink>
      </Card>
    </div>
  );
}
