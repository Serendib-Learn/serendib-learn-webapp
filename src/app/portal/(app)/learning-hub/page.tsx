"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useAction, useQuery } from "@/lib/hooks";
import { ChapterBrowser, groupByStage } from "@/components/portal/chapter-browser";
import { VoiceNotePlayer } from "@/components/portal/voice-note-player";
import { PageHeader } from "@/components/portal/page-header";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Alert, Badge, Card, Loading } from "@/components/ui/primitives";
import type { CourseChapter, LanguageCode, Material, MaterialKind, User } from "@/lib/types";

export default function LearningHubPage() {
  const { user } = useAuth();
  if (!user) return <Loading />;
  return user.role === "student" ? (
    <StudentHub student={user} />
  ) : (
    <TeachingHub owner={user} />
  );
}

function StudentHub({ student }: { student: User }) {
  const mine = useQuery(() => api.materials.forStudent(student.id), [student.id]);
  const library = useQuery(() => api.materials.library(), []);
  const notes = useQuery(() => api.lessonNotes.forStudent(student.id), [student.id]);
  const chapters = useQuery(() => api.chapters.list(), []);

  if (mine.loading || chapters.loading) return <Loading label="Opening your hub" />;

  return (
    <>
      <PageHeader title="Learning hub">
        Your course chapter by chapter, everything your tutor has shared, and the write-up
        from every lesson.
      </PageHeader>

      <section>
        <h2 className="text-xl">Your course, chapter by chapter</h2>
        <p className="mt-1 text-sm text-ink-500">
          Everything your tutor has shared and the open library, filed by chapter — with the
          phrases for each one in{" "}
          {student.languages.map((language) => (language === "sinhala" ? "Sinhala" : "Tamil")).join(" and ")}.
        </p>
        <div className="mt-5">
          <ChapterBrowser
            chapters={chapters.data ?? []}
            materials={[...(mine.data ?? []), ...(library.data ?? [])]}
            languages={student.languages}
          />
        </div>
      </section>

      {(notes.data ?? []).length > 0 ? (
        <section className="mt-12">
          <h2 className="text-xl">Lesson notes</h2>
          <div className="mt-4 space-y-4">
            {(notes.data ?? []).map((note) => (
              <div key={note.id} className="rounded-2xl bg-white p-5 border border-forest/10">
                <p className="text-xs font-medium uppercase tracking-wider text-ink-400">
                  {new Date(note.date).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "long",
                  })}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink-700">{note.summary}</p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-jade-50 px-4 py-3">
                    <p className="text-xs font-semibold text-jade-700">Went well</p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-600">{note.wentWell}</p>
                  </div>
                  <div className="rounded-xl bg-saffron-50 px-4 py-3">
                    <p className="text-xs font-semibold text-saffron-600">Work on</p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-600">{note.workOn}</p>
                  </div>
                </div>

                {note.voiceNoteId ? (
                  <div className="mt-4">
                    <VoiceNotePlayer id={note.voiceNoteId} label="From your tutor" />
                  </div>
                ) : null}

                {note.vocabIntroduced.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {note.vocabIntroduced.map((word) => (
                      <Badge key={word}>{word}</Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

    </>
  );
}

function TeachingHub({ owner }: { owner: User }) {
  const materials = useQuery(() => api.materials.forOwner(owner.id), [owner.id]);
  const tutees = useQuery(() => api.users.tuteesOf(owner.id), [owner.id]);
  const [composing, setComposing] = useState(false);
  const [assigning, setAssigning] = useState<Material | null>(null);
  const [managing, setManaging] = useState(false);
  const chapters = useQuery(() => api.chapters.list(), []);

  const remove = useAction((id: string) => api.materials.remove(id));
  const move = useAction((id: string, chapterId: string) =>
    api.materials.setChapter(id, chapterId || undefined),
  );

  if (materials.loading || chapters.loading) return <Loading label="Opening your hub" />;

  const students = (tutees.data ?? []).filter((person) => person.role === "student");

  return (
    <>
      <PageHeader
        title="Learning hub"
        action={
          <div className="flex flex-wrap gap-2">
            {owner.role === "admin" ? (
              <Button size="sm" variant="secondary" onClick={() => setManaging(true)}>
                Manage chapters
              </Button>
            ) : null}
            <Button size="sm" onClick={() => setComposing(true)}>
              Add material
            </Button>
          </div>
        }
      >
        Upload what you use in lessons, file it under its chapter, and assign it to the students
        who need it.
      </PageHeader>

      {(materials.data ?? []).length === 0 ? (
        <Card className="mb-8 flex flex-wrap items-center justify-between gap-4 p-5">
          <p className="text-sm text-ink-600">
            Your shelf is empty. Worksheets, audio drills, links — anything a student can work
            through between lessons, filed by chapter.
          </p>
          <Button size="sm" onClick={() => setComposing(true)}>
            Add your first material
          </Button>
        </Card>
      ) : null}

      <ChapterBrowser
        chapters={chapters.data ?? []}
        materials={materials.data ?? []}
        languages={owner.languages}
        footerFor={(material) => (
          <div className="flex flex-wrap items-center gap-1">
            <Select
              aria-label={`Chapter for ${material.title}`}
              className="h-9 w-auto max-w-44 py-0 text-xs"
              value={material.chapterId ?? ""}
              disabled={move.pending}
              onChange={(event) => void move.run(material.id, event.target.value)}
            >
              <option value="">No chapter</option>
              {(chapters.data ?? []).map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.title}
                </option>
              ))}
            </Select>
            <Button variant="ghost" size="sm" onClick={() => setAssigning(material)}>
              {material.assignedTo.length === 0
                ? "Assign"
                : `${material.assignedTo.length} assigned`}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-clay-600 hover:bg-clay-50"
              disabled={remove.pending}
              onClick={() => void remove.run(material.id)}
            >
              Delete
            </Button>
          </div>
        )}
      />

      {managing ? (
        <ManageChapters chapters={chapters.data ?? []} onClose={() => setManaging(false)} />
      ) : null}

      {composing ? (
        <MaterialComposer
          owner={owner}
          students={students}
          chapters={chapters.data ?? []}
          onClose={() => setComposing(false)}
        />
      ) : null}

      {assigning ? (
        <AssignDialog
          material={assigning}
          students={students}
          onClose={() => setAssigning(null)}
        />
      ) : null}
    </>
  );
}

function MaterialComposer({
  owner,
  students,
  chapters,
  onClose,
}: {
  owner: User;
  students: User[];
  chapters: CourseChapter[];
  onClose: () => void;
}) {
  const [chapterId, setChapterId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<MaterialKind>("pdf");
  const [language, setLanguage] = useState<LanguageCode | "both">(
    owner.languages[0] ?? "sinhala",
  );
  const [level, setLevel] = useState<Material["level"]>("beginner");
  const [url, setUrl] = useState("");
  const [fileLabel, setFileLabel] = useState("");
  const [assignedTo, setAssignedTo] = useState<string[]>([]);

  const create = useAction(() =>
    api.materials.create({
      ownerId: owner.id,
      title,
      description,
      kind,
      language,
      level,
      url: url.trim() || undefined,
      fileLabel: fileLabel.trim() || undefined,
      assignedTo,
      chapterId: chapterId || undefined,
    }),
  );

  return (
    <Modal
      open
      onClose={onClose}
      title="Add material"
      description="Nothing is uploaded in the demo — describe the file and it appears for your students."
    >
      <div className="space-y-4">
        <Field label="Title" htmlFor="material-title">
          <Input
            id="material-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Sinhala verbs — present tense drill"
          />
        </Field>

        <Field label="What is it for?" htmlFor="material-description">
          <Textarea
            id="material-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Two pages of fill-in-the-blank practice on the verbs we covered."
          />
        </Field>

        <Field label="Chapter" htmlFor="material-chapter" hint="Where students find it in their course.">
          <Select
            id="material-chapter"
            value={chapterId}
            onChange={(event) => setChapterId(event.target.value)}
          >
            <option value="">No chapter</option>
            {groupByStage(chapters).map(({ stage, chapters: items }) => (
              <optgroup key={stage} label={stage}>
                {items.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Type" htmlFor="material-kind">
            <Select
              id="material-kind"
              value={kind}
              onChange={(event) => setKind(event.target.value as MaterialKind)}
            >
              <option value="pdf">PDF</option>
              <option value="audio">Audio</option>
              <option value="video">Video</option>
              <option value="link">Link</option>
              <option value="deck">Deck</option>
            </Select>
          </Field>

          <Field label="Language" htmlFor="material-language">
            <Select
              id="material-language"
              value={language}
              onChange={(event) =>
                setLanguage(event.target.value as LanguageCode | "both")
              }
            >
              <option value="sinhala">Sinhala</option>
              <option value="tamil">Tamil</option>
              <option value="both">Both</option>
            </Select>
          </Field>

          <Field label="Level" htmlFor="material-level">
            <Select
              id="material-level"
              value={level}
              onChange={(event) => setLevel(event.target.value as Material["level"])}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </Select>
          </Field>
        </div>

        {kind === "link" || kind === "video" ? (
          <Field label="Link" htmlFor="material-url">
            <Input
              id="material-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://"
            />
          </Field>
        ) : (
          <Field label="File name" htmlFor="material-file" hint="Shown to students as a label.">
            <Input
              id="material-file"
              value={fileLabel}
              onChange={(event) => setFileLabel(event.target.value)}
              placeholder="verbs-drill.pdf"
            />
          </Field>
        )}

        {students.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-medium text-ink-700">Assign to</p>
            <div className="space-y-2">
              {students.map((student) => (
                <Checkbox
                  key={student.id}
                  label={student.name}
                  checked={assignedTo.includes(student.id)}
                  onChange={(event) =>
                    setAssignedTo((previous) =>
                      event.target.checked
                        ? [...previous, student.id]
                        : previous.filter((id) => id !== student.id),
                    )
                  }
                />
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-400">
              Leave everyone unticked to put it in the open library instead.
            </p>
          </div>
        ) : null}

        {create.error ? <Alert>{create.error}</Alert> : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={create.pending}
            onClick={async () => {
              const result = await create.run();
              if (result) onClose();
            }}
          >
            {create.pending ? "Saving…" : "Add material"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function AssignDialog({
  material,
  students,
  onClose,
}: {
  material: Material;
  students: User[];
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(material.assignedTo);
  const assign = useAction(() => api.materials.assign(material.id, selected));

  return (
    <Modal open onClose={onClose} title="Assign material" description={material.title}>
      {students.length === 0 ? (
        <p className="text-sm leading-relaxed text-ink-500">
          You have no students yet. Once someone books a lesson they show up here.
        </p>
      ) : (
        <div className="space-y-2">
          {students.map((student) => (
            <Checkbox
              key={student.id}
              label={student.name}
              checked={selected.includes(student.id)}
              onChange={(event) =>
                setSelected((previous) =>
                  event.target.checked
                    ? [...previous, student.id]
                    : previous.filter((id) => id !== student.id),
                )
              }
            />
          ))}
        </div>
      )}

      {assign.error ? (
        <div className="mt-4">
          <Alert>{assign.error}</Alert>
        </div>
      ) : null}

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={assign.pending}
          onClick={async () => {
            const result = await assign.run();
            if (result) onClose();
          }}
        >
          Save
        </Button>
      </div>
    </Modal>
  );
}

/** Administrators: rename, reorder, add and remove the course's chapters. */
function ManageChapters({ chapters, onClose }: { chapters: CourseChapter[]; onClose: () => void }) {
  const [stage, setStage] = useState("");
  const [title, setTitle] = useState("");
  const add = useAction(() =>
    api.chapters.create({
      stage: stage.trim(),
      title: title.trim(),
      summary: "",
      order: Math.max(0, ...chapters.map((chapter) => chapter.order)) + 10,
    }),
  );

  return (
    <Modal
      open
      onClose={onClose}
      title="Manage chapters"
      description="Changes show for every tutor and student straight away. Removing a chapter keeps its materials, unfiled."
      className="sm:max-w-2xl"
    >
      <div className="space-y-6">
        {groupByStage(chapters).map(({ stage: heading, chapters: items }) => (
          <div key={heading}>
            <p className="text-xs font-semibold tracking-[0.16em] text-jade-600 uppercase">{heading}</p>
            <ul className="mt-2 space-y-2">
              {items.map((chapter) => (
                <ChapterRow key={chapter.id} chapter={chapter} />
              ))}
            </ul>
          </div>
        ))}

        <form
          className="grid gap-3 rounded-2xl bg-sand-100/70 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          onSubmit={async (event) => {
            event.preventDefault();
            if (await add.run()) {
              setTitle("");
            }
          }}
        >
          <Field label="Stage" htmlFor="new-chapter-stage">
            <Input
              id="new-chapter-stage"
              list="chapter-stages"
              value={stage}
              onChange={(event) => setStage(event.target.value)}
              placeholder="Foundation"
            />
          </Field>
          <datalist id="chapter-stages">
            {groupByStage(chapters).map(({ stage: heading }) => (
              <option key={heading} value={heading} />
            ))}
          </datalist>
          <Field label="New chapter" htmlFor="new-chapter-title">
            <Input
              id="new-chapter-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="At the temple"
            />
          </Field>
          <Button type="submit" disabled={add.pending || !stage.trim() || !title.trim()}>
            Add
          </Button>
        </form>
        {add.error ? <Alert>{add.error}</Alert> : null}
      </div>
    </Modal>
  );
}

function ChapterRow({ chapter }: { chapter: CourseChapter }) {
  const [title, setTitle] = useState(chapter.title);
  const [summary, setSummary] = useState(chapter.summary);
  const [order, setOrder] = useState(String(chapter.order));
  const save = useAction(() =>
    api.chapters.update(chapter.id, { title: title.trim(), summary: summary.trim(), order: Number(order) }),
  );
  const remove = useAction(() => api.chapters.remove(chapter.id));
  const dirty =
    title !== chapter.title || summary !== chapter.summary || order !== String(chapter.order);

  return (
    <li className="grid gap-2 rounded-xl px-3 py-2.5 border border-forest/10 sm:grid-cols-[4rem_1fr_1.4fr_auto] sm:items-center">
      <Input
        aria-label={`Order of ${chapter.title}`}
        type="number"
        className="h-9 py-0 text-sm"
        value={order}
        onChange={(event) => setOrder(event.target.value)}
      />
      <Input
        aria-label="Title"
        className="h-9 py-0 text-sm"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <Input
        aria-label="Summary"
        className="h-9 py-0 text-sm"
        value={summary}
        onChange={(event) => setSummary(event.target.value)}
      />
      <div className="flex gap-1">
        <Button size="sm" variant="secondary" disabled={!dirty || save.pending} onClick={() => void save.run()}>
          Save
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-clay-600 hover:bg-clay-50"
          disabled={remove.pending}
          onClick={() => {
            if (window.confirm(`Remove "${chapter.title}"? Its materials stay, unfiled.`)) {
              void remove.run();
            }
          }}
        >
          Remove
        </Button>
      </div>
      {save.error || remove.error ? (
        <p className="text-xs text-clay-600 sm:col-span-4">{save.error ?? remove.error}</p>
      ) : null}
    </li>
  );
}
