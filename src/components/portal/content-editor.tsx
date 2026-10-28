"use client";

import { ArrowDown, ArrowUp, X } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { HOLIDAY_CATEGORY_LABEL, slugify } from "@/lib/content";
import { useAction, useQuery } from "@/lib/hooks";
import { relativeTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Alert, Badge, Card, EmptyState, Loading } from "@/components/ui/primitives";
import type {
  AlphabetLetter,
  AlphabetLetterGroup,
  AlphabetSheet,
  Holiday,
  HolidayCategory,
  Phrase,
  PhraseList,
} from "@/lib/types";

/*
 * The content editor's panels. Each one reads through api.content and saves
 * the whole item back with one button — what is on screen is what is saved.
 */

const small = "h-9 text-sm";

function Saved({ at }: { at?: string }) {
  return at ? <span className="text-xs text-ink-400">Last saved {relativeTime(at)}</span> : null;
}

/** Up / down / remove buttons for one row in an editable list. */
function RowControls({
  index,
  count,
  onMove,
  onRemove,
  label,
}: {
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
  label: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <button type="button" aria-label={`Move ${label} up`} disabled={index === 0} onClick={() => onMove(index, index - 1)} className="rounded p-1.5 text-ink-400 hover:bg-mist disabled:opacity-30">
        <ArrowUp className="h-3.5 w-3.5" />
      </button>
      <button type="button" aria-label={`Move ${label} down`} disabled={index === count - 1} onClick={() => onMove(index, index + 1)} className="rounded p-1.5 text-ink-400 hover:bg-mist disabled:opacity-30">
        <ArrowDown className="h-3.5 w-3.5" />
      </button>
      <button type="button" aria-label={`Remove ${label}`} onClick={() => onRemove(index)} className="rounded p-1.5 text-clay-500 hover:bg-clay-50">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function moved<T>(items: T[], from: number, to: number): T[] {
  const copy = [...items];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

/* ───────────────────────────── Phrase lists ───────────────────────────── */

export function PhraseListsEditor({ isAdmin }: { isAdmin: boolean }) {
  const lists = useQuery(() => api.content.list("phrase-lists"), []);
  const [selectedId, setSelectedId] = useState("");
  const [creating, setCreating] = useState(false);

  if (lists.loading) return <Loading label="Loading phrase lists" />;
  const all = lists.data ?? [];
  const current = all.find((list) => list.id === selectedId) ?? all[0];

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[17rem_1fr]">
      <Card className="space-y-1 p-3">
        {all.map((list) => (
          <button
            key={list.id}
            type="button"
            onClick={() => setSelectedId(list.id)}
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition",
              current?.id === list.id ? "bg-mist text-forest" : "text-ink-600 hover:bg-sand-100",
            )}
          >
            <span className="min-w-0 truncate">
              {list.emoji} {list.title}
            </span>
            <span className="shrink-0 text-xs text-ink-400">{list.phrases.length}</span>
          </button>
        ))}
        {isAdmin ? (
          <Button size="sm" variant="secondary" className="mt-2 w-full" onClick={() => setCreating(true)}>
            New phrase list
          </Button>
        ) : null}
      </Card>

      {current ? (
        <PhraseListForm key={current.id} list={current} isAdmin={isAdmin} />
      ) : (
        <EmptyState icon="🗒️" title="No phrase lists yet">
          {isAdmin ? "Start one with “New phrase list”." : "An administrator can start one."}
        </EmptyState>
      )}

      {creating ? (
        <NewPhraseListDialog
          lists={all}
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setSelectedId(id);
            setCreating(false);
          }}
        />
      ) : null}
    </div>
  );
}

const emptyPhrase = (): Phrase => ({ n: 0, english: "", sinhala: "", sinhalaRoman: "", tamil: "", tamilRoman: "" });

function PhraseListForm({ list, isAdmin }: { list: PhraseList; isAdmin: boolean }) {
  const [title, setTitle] = useState(list.title);
  const [emoji, setEmoji] = useState(list.emoji);
  const [scene, setScene] = useState(list.scene);
  const [stage, setStage] = useState(list.stage);
  const [number, setNumber] = useState(String(list.number));
  const [phrases, setPhrases] = useState<Phrase[]>(list.phrases);
  const [saved, setSaved] = useState(false);

  const save = useAction(() =>
    api.content.save("phrase-lists", list.id, {
      title: title.trim(),
      emoji: emoji.trim(),
      scene: scene.trim(),
      stage: stage.trim(),
      number: Number(number) || 1,
      phrases: phrases.filter((phrase) => phrase.english.trim()),
    }),
  );
  const remove = useAction(() => api.content.remove("phrase-lists", list.id));

  const setPhrase = (index: number, patch: Partial<Phrase>) =>
    setPhrases((current) => current.map((phrase, i) => (i === index ? { ...phrase, ...patch } : phrase)));

  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setSaved(false);
        if (await save.run()) setSaved(true);
      }}
    >
      <Card className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-[5rem_1fr_6rem]">
          <Field label="Emoji" htmlFor="pl-emoji">
            <Input id="pl-emoji" value={emoji} maxLength={8} onChange={(event) => setEmoji(event.target.value)} />
          </Field>
          <Field label="Title" htmlFor="pl-title">
            <Input id="pl-title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </Field>
          <Field label="Order" htmlFor="pl-number">
            <Input id="pl-number" type="number" min={1} value={number} onChange={(event) => setNumber(event.target.value)} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_14rem]">
          <Field label="The situation" htmlFor="pl-scene" hint="One line, shown above the phrases.">
            <Input id="pl-scene" value={scene} onChange={(event) => setScene(event.target.value)} />
          </Field>
          <Field label="Stage" htmlFor="pl-stage">
            <Input id="pl-stage" value={stage} onChange={(event) => setStage(event.target.value)} />
          </Field>
        </div>
        <p className="text-xs text-ink-400">
          Id <code className="rounded bg-sand-100 px-1">{list.id}</code> — link it to a chapter in Learning hub → Manage
          chapters.
        </p>
      </Card>

      <div className="space-y-3">
        {phrases.map((phrase, index) => (
          <Card key={index} className="p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-ink-400">Phrase {index + 1}</span>
              <RowControls
                index={index}
                count={phrases.length}
                label={`phrase ${index + 1}`}
                onMove={(from, to) => setPhrases((current) => moved(current, from, to))}
                onRemove={(at) => setPhrases((current) => current.filter((_, i) => i !== at))}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Input aria-label="English" placeholder="English" className={small} value={phrase.english} onChange={(event) => setPhrase(index, { english: event.target.value })} />
              <Input aria-label="Sinhala" placeholder="Sinhala" className={cn(small, "text-sinhala")} value={phrase.sinhala} onChange={(event) => setPhrase(index, { sinhala: event.target.value })} />
              <Input aria-label="Sinhala, romanised" placeholder="Sinhala, romanised" className={small} value={phrase.sinhalaRoman} onChange={(event) => setPhrase(index, { sinhalaRoman: event.target.value })} />
              <Input aria-label="Note" placeholder="Note (optional)" className={small} value={phrase.note ?? ""} onChange={(event) => setPhrase(index, { note: event.target.value })} />
              <Input aria-label="Tamil" placeholder="Tamil" className={cn(small, "text-tamil")} value={phrase.tamil} onChange={(event) => setPhrase(index, { tamil: event.target.value })} />
              <Input aria-label="Tamil, romanised" placeholder="Tamil, romanised" className={small} value={phrase.tamilRoman} onChange={(event) => setPhrase(index, { tamilRoman: event.target.value })} />
            </div>
          </Card>
        ))}
        <Button type="button" variant="secondary" size="sm" onClick={() => setPhrases((current) => [...current, emptyPhrase()])}>
          Add a phrase
        </Button>
      </div>

      {save.error ? <Alert>{save.error}</Alert> : null}
      {remove.error ? <Alert>{remove.error}</Alert> : null}
      {saved && !save.pending ? <Alert tone="jade">Saved — the learning hub shows it now.</Alert> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Saved at={list.updatedAt} />
        <div className="flex gap-2">
          {isAdmin ? (
            <Button
              type="button"
              variant="ghost"
              className="text-clay-600 hover:bg-clay-50"
              disabled={remove.pending}
              onClick={() => {
                if (window.confirm(`Delete “${list.title}” and its ${list.phrases.length} phrases? Chapters linked to it stop showing it.`)) {
                  void remove.run();
                }
              }}
            >
              Delete list
            </Button>
          ) : null}
          <Button type="submit" disabled={save.pending || !title.trim() || !stage.trim()}>
            {save.pending ? "Saving…" : "Save phrase list"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function NewPhraseListDialog({
  lists,
  onClose,
  onCreated,
}: {
  lists: PhraseList[];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const stages = Array.from(new Set(lists.map((list) => list.stage)));
  const [title, setTitle] = useState("");
  const [stage, setStage] = useState(stages[0] ?? "");
  const [emoji, setEmoji] = useState("");
  const id = slugify(title);
  const create = useAction(() =>
    api.content.save("phrase-lists", id, {
      title: title.trim(),
      stage: stage.trim(),
      emoji: emoji.trim(),
      scene: "",
      number: Math.max(0, ...lists.filter((list) => list.stage === stage).map((list) => list.number)) + 1,
      phrases: [],
    }),
  );

  return (
    <Modal open onClose={onClose} title="New phrase list" description="Add the phrases once it exists.">
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (lists.some((list) => list.id === id)) return;
          const made = await create.run();
          if (made) onCreated(made.id);
        }}
      >
        <div className="grid gap-4 sm:grid-cols-[5rem_1fr]">
          <Field label="Emoji" htmlFor="new-pl-emoji">
            <Input id="new-pl-emoji" value={emoji} maxLength={8} onChange={(event) => setEmoji(event.target.value)} />
          </Field>
          <Field label="Title" htmlFor="new-pl-title" hint={id ? `Its id will be ${id}.` : undefined}>
            <Input id="new-pl-title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </Field>
        </div>
        <Field label="Stage" htmlFor="new-pl-stage">
          <Input id="new-pl-stage" list="new-pl-stages" value={stage} onChange={(event) => setStage(event.target.value)} />
          <datalist id="new-pl-stages">
            {stages.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </Field>
        {lists.some((list) => list.id === id) ? <Alert>There is already a list called that.</Alert> : null}
        {create.error ? <Alert>{create.error}</Alert> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={create.pending || !id || !stage.trim()}>
            {create.pending ? "Creating…" : "Create list"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ───────────────────────────── Alphabet sheets ───────────────────────────── */

export function AlphabetEditor() {
  const sheets = useQuery(() => api.content.list("alphabet"), []);
  const [selected, setSelected] = useState<string>("sinhala");
  if (sheets.loading) return <Loading label="Loading the alphabet sheets" />;
  const current = (sheets.data ?? []).find((sheet) => sheet.id === selected) ?? sheets.data?.[0];
  if (!current) return <EmptyState icon="🔤" title="No alphabet sheets">They appear once the API has filled them.</EmptyState>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {(sheets.data ?? []).map((sheet) => (
          <Button key={sheet.id} size="sm" variant={sheet.id === current.id ? "forest" : "secondary"} onClick={() => setSelected(sheet.id)}>
            {sheet.name}
            {sheet.status === "draft" ? <Badge tone="saffron" className="ml-2">Draft</Badge> : null}
          </Button>
        ))}
      </div>
      <AlphabetForm key={current.id} sheet={current} />
    </div>
  );
}

const emptyLetter = (): AlphabetLetter => ({ letter: "", roman: "", sound: "", ipa: "" });

function AlphabetForm({ sheet }: { sheet: AlphabetSheet }) {
  const [name, setName] = useState(sheet.name);
  const [native, setNative] = useState(sheet.native);
  const [intro, setIntro] = useState(sheet.intro);
  const [status, setStatus] = useState(sheet.status);
  const [groups, setGroups] = useState<AlphabetLetterGroup[]>(sheet.groups);
  const [signs, setSigns] = useState(sheet.vowelSigns);
  const [saved, setSaved] = useState(false);
  const script = sheet.id === "sinhala" ? "text-sinhala" : "text-tamil";

  const save = useAction(() =>
    api.content.save("alphabet", sheet.id, {
      name: name.trim(),
      native: native.trim(),
      intro: intro.trim(),
      status,
      voiceLangs: sheet.voiceLangs,
      groups: groups.map((group) => ({
        ...group,
        letters: group.letters.filter((letter) => letter.letter.trim()),
      })),
      vowelSigns: { ...signs, signs: signs.signs.filter((sign) => sign.form.trim()) },
    }),
  );

  const setGroup = (index: number, patch: Partial<AlphabetLetterGroup>) =>
    setGroups((current) => current.map((group, i) => (i === index ? { ...group, ...patch } : group)));
  const setLetter = (groupIndex: number, letterIndex: number, patch: Partial<AlphabetLetter>) =>
    setGroup(groupIndex, {
      letters: groups[groupIndex].letters.map((letter, i) => (i === letterIndex ? { ...letter, ...patch } : letter)),
    });

  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setSaved(false);
        if (await save.run()) setSaved(true);
      }}
    >
      <Card className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Name" htmlFor="ab-name">
            <Input id="ab-name" value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="In the script" htmlFor="ab-native">
            <Input id="ab-native" className={script} value={native} onChange={(event) => setNative(event.target.value)} />
          </Field>
          <Field label="Status" htmlFor="ab-status" hint="The public sheet says it is a draft until a tutor marks it checked.">
            <Select id="ab-status" value={status} onChange={(event) => setStatus(event.target.value as AlphabetSheet["status"])}>
              <option value="draft">Draft — not yet checked</option>
              <option value="reviewed">Checked by a tutor</option>
            </Select>
          </Field>
        </div>
        <Field label="Introduction" htmlFor="ab-intro">
          <Textarea id="ab-intro" className="min-h-20" value={intro} onChange={(event) => setIntro(event.target.value)} />
        </Field>
      </Card>

      {groups.map((group, groupIndex) => (
        <Card key={groupIndex} className="space-y-3 p-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
            <Input aria-label="Group title" className="font-medium" value={group.title} onChange={(event) => setGroup(groupIndex, { title: event.target.value })} />
            <Input aria-label="Group name in the script" placeholder="In the script (optional)" className={script} value={group.native ?? ""} onChange={(event) => setGroup(groupIndex, { native: event.target.value })} />
          </div>
          <Textarea aria-label="Group introduction" className="min-h-14 text-sm" value={group.intro} onChange={(event) => setGroup(groupIndex, { intro: event.target.value })} />
          <div className="space-y-2">
            {group.letters.map((letter, letterIndex) => (
              <div key={letterIndex} className="flex items-start gap-2 rounded-lg border border-forest/8 p-2">
                <div className="grid flex-1 gap-2">
                  <div className="grid gap-2 sm:grid-cols-[4rem_5rem_1fr_5rem]">
                  <Input aria-label="Letter" className={cn(small, script, "text-center text-lg")} value={letter.letter} onChange={(event) => setLetter(groupIndex, letterIndex, { letter: event.target.value })} />
                  <Input aria-label="Romanised" placeholder="roman" className={small} value={letter.roman} onChange={(event) => setLetter(groupIndex, letterIndex, { roman: event.target.value })} />
                  <Input aria-label="How it sounds" placeholder="How it sounds" className={small} value={letter.sound} onChange={(event) => setLetter(groupIndex, letterIndex, { sound: event.target.value })} />
                  <Input aria-label="IPA" placeholder="IPA" className={small} value={letter.ipa} onChange={(event) => setLetter(groupIndex, letterIndex, { ipa: event.target.value })} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[10rem_10rem_1fr]">
                  <Input aria-label="Example word" placeholder="Example word" className={cn(small, script)} value={letter.example?.word ?? ""} onChange={(event) => setLetter(groupIndex, letterIndex, { example: { word: event.target.value, roman: letter.example?.roman ?? "", meaning: letter.example?.meaning ?? "" } })} />
                  <Input aria-label="Example, romanised" placeholder="romanised" className={small} value={letter.example?.roman ?? ""} onChange={(event) => setLetter(groupIndex, letterIndex, { example: { word: letter.example?.word ?? "", roman: event.target.value, meaning: letter.example?.meaning ?? "" } })} />
                  <Input aria-label="Example meaning" placeholder="meaning" className={small} value={letter.example?.meaning ?? ""} onChange={(event) => setLetter(groupIndex, letterIndex, { example: { word: letter.example?.word ?? "", roman: letter.example?.roman ?? "", meaning: event.target.value } })} />
                  </div>
                </div>
                <RowControls
                  index={letterIndex}
                  count={group.letters.length}
                  label={`letter ${letter.letter || letterIndex + 1}`}
                  onMove={(from, to) => setGroup(groupIndex, { letters: moved(group.letters, from, to) })}
                  onRemove={(at) => setGroup(groupIndex, { letters: group.letters.filter((_, i) => i !== at) })}
                />
              </div>
            ))}
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={() => setGroup(groupIndex, { letters: [...group.letters, emptyLetter()] })}>
            Add a letter
          </Button>
        </Card>
      ))}

      <Card className="space-y-3 p-5">
        <p className="font-medium text-ink-800">Vowel signs</p>
        <Textarea aria-label="Vowel signs introduction" className="min-h-14 text-sm" value={signs.intro} onChange={(event) => setSigns({ ...signs, intro: event.target.value })} />
        <div className="grid gap-2 sm:grid-cols-4">
          {signs.signs.map((sign, index) => (
            <div key={index} className="flex items-center gap-1">
              <Input aria-label="Form" className={cn(small, script, "w-16 text-center")} value={sign.form} onChange={(event) => setSigns({ ...signs, signs: signs.signs.map((item, i) => (i === index ? { ...item, form: event.target.value } : item)) })} />
              <Input aria-label="Romanised" className={small} value={sign.roman} onChange={(event) => setSigns({ ...signs, signs: signs.signs.map((item, i) => (i === index ? { ...item, roman: event.target.value } : item)) })} />
              <button type="button" aria-label="Remove vowel sign" onClick={() => setSigns({ ...signs, signs: signs.signs.filter((_, i) => i !== index) })} className="rounded p-1.5 text-clay-500 hover:bg-clay-50">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => setSigns({ ...signs, signs: [...signs.signs, { form: "", roman: "" }] })}>
          Add a vowel sign
        </Button>
      </Card>

      {save.error ? <Alert>{save.error}</Alert> : null}
      {saved && !save.pending ? <Alert tone="jade">Saved — the public alphabet sheet updates within a minute.</Alert> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Saved at={sheet.updatedAt} />
        <Button type="submit" disabled={save.pending || !name.trim()}>
          {save.pending ? "Saving…" : `Save the ${sheet.name} sheet`}
        </Button>
      </div>
    </form>
  );
}

/* ───────────────────────────── Holidays ───────────────────────────── */

const categories = Object.keys(HOLIDAY_CATEGORY_LABEL) as HolidayCategory[];

export function HolidaysEditor() {
  const holidays = useQuery(() => api.content.list("holidays"), []);
  if (holidays.loading) return <Loading label="Loading holidays" />;
  const all = holidays.data ?? [];

  return (
    <div className="space-y-6">
      <NewHoliday />
      <div className="space-y-2">
        {all.map((holiday) => (
          <HolidayRow key={`${holiday.id}:${holiday.updatedAt}`} holiday={holiday} />
        ))}
      </div>
    </div>
  );
}

function NewHoliday() {
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<HolidayCategory>("poya");
  const [funFact, setFunFact] = useState("");
  const add = useAction(() =>
    api.content.save("holidays", `hol_${date}_${slugify(name)}`, { date, name: name.trim(), category, funFact: funFact.trim() }),
  );

  return (
    <Card className="space-y-3 p-5">
      <p className="font-medium text-ink-800">Add a holiday</p>
      <p className="text-xs text-ink-500">
        Poya and Muslim holidays move every year — add next year&rsquo;s once the gazette is out.
      </p>
      <div className="grid gap-2 sm:grid-cols-[10rem_1fr_10rem]">
        <Input aria-label="Date" type="date" className={small} value={date} onChange={(event) => setDate(event.target.value)} />
        <Input aria-label="Name" placeholder="Name" className={small} value={name} onChange={(event) => setName(event.target.value)} />
        <Select aria-label="Kind" className={small} value={category} onChange={(event) => setCategory(event.target.value as HolidayCategory)}>
          {categories.map((value) => (
            <option key={value} value={value}>
              {HOLIDAY_CATEGORY_LABEL[value]}
            </option>
          ))}
        </Select>
      </div>
      <Textarea aria-label="Something worth knowing about it" placeholder="Something worth knowing about it" className="min-h-14 text-sm" value={funFact} onChange={(event) => setFunFact(event.target.value)} />
      {add.error ? <Alert>{add.error}</Alert> : null}
      <Button
        size="sm"
        disabled={add.pending || !date || !name.trim()}
        onClick={async () => {
          if (await add.run()) {
            setDate("");
            setName("");
            setFunFact("");
          }
        }}
      >
        {add.pending ? "Adding…" : "Add holiday"}
      </Button>
    </Card>
  );
}

function HolidayRow({ holiday }: { holiday: Holiday }) {
  const [date, setDate] = useState(holiday.date);
  const [name, setName] = useState(holiday.name);
  const [category, setCategory] = useState(holiday.category);
  const [funFact, setFunFact] = useState(holiday.funFact);
  const changed = date !== holiday.date || name !== holiday.name || category !== holiday.category || funFact !== holiday.funFact;
  const save = useAction(() => api.content.save("holidays", holiday.id, { date, name: name.trim(), category, funFact: funFact.trim() }));
  const remove = useAction(() => api.content.remove("holidays", holiday.id));

  return (
    <Card className="space-y-2 p-4">
      <div className="grid gap-2 sm:grid-cols-[10rem_1fr_10rem]">
        <Input aria-label="Date" type="date" className={small} value={date} onChange={(event) => setDate(event.target.value)} />
        <Input aria-label="Name" className={small} value={name} onChange={(event) => setName(event.target.value)} />
        <Select aria-label="Kind" className={small} value={category} onChange={(event) => setCategory(event.target.value as HolidayCategory)}>
          {categories.map((value) => (
            <option key={value} value={value}>
              {HOLIDAY_CATEGORY_LABEL[value]}
            </option>
          ))}
        </Select>
      </div>
      <Textarea aria-label="Something worth knowing" className="min-h-12 text-sm" value={funFact} onChange={(event) => setFunFact(event.target.value)} />
      {save.error || remove.error ? <Alert>{save.error ?? remove.error}</Alert> : null}
      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="ghost"
          className="text-clay-600 hover:bg-clay-50"
          disabled={remove.pending}
          onClick={() => {
            if (window.confirm(`Remove ${holiday.name}?`)) void remove.run();
          }}
        >
          Remove
        </Button>
        <Button size="sm" disabled={!changed || save.pending} onClick={() => void save.run()}>
          {save.pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </Card>
  );
}

/* ───────────────────────────── Course stages ───────────────────────────── */

/** Each stage chapters are grouped under, with the description its learning hub folder shows. */
export function StagesEditor() {
  const chapters = useQuery(() => api.chapters.list(), []);
  const stages = useQuery(() => api.content.list("stages"), []);
  if (chapters.loading || stages.loading) return <Loading label="Loading stages" />;

  const names = Array.from(
    new Set([...(chapters.data ?? []).sort((a, b) => a.order - b.order).map((chapter) => chapter.stage), ...(stages.data ?? []).map((stage) => stage.name)]),
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-500">
        Rename stages and move chapters between them in Learning hub → Manage chapters. Here you write
        what each stage&rsquo;s folder says.
      </p>
      {names.map((name) => {
        const doc = (stages.data ?? []).find((stage) => stage.name === name);
        return <StageRow key={`${name}:${doc?.updatedAt ?? ""}`} name={name} id={doc?.id ?? slugify(name)} description={doc?.description ?? ""} />;
      })}
    </div>
  );
}

function StageRow({ name, id, description }: { name: string; id: string; description: string }) {
  const [text, setText] = useState(description);
  const save = useAction(() => api.content.save("stages", id, { name, description: text.trim() }));

  return (
    <Card className="space-y-2 p-4">
      <p className="font-medium text-ink-800">{name}</p>
      <Textarea aria-label={`Description of ${name}`} className="min-h-14 text-sm" value={text} onChange={(event) => setText(event.target.value)} />
      {save.error ? <Alert>{save.error}</Alert> : null}
      <div className="flex justify-end">
        <Button size="sm" disabled={text === description || save.pending} onClick={() => void save.run()}>
          {save.pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </Card>
  );
}
