"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useAction, useQuery } from "@/lib/hooks";
import { MaterialCard } from "@/components/portal/material-card";
import { PageHeader } from "@/components/portal/page-header";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Alert, Badge, EmptyState, Loading, SectionHeading } from "@/components/ui/primitives";
import type { LanguageCode, Material, MaterialKind, User } from "@/lib/types";

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

  if (mine.loading) return <Loading label="Opening your hub" />;

  return (
    <>
      <PageHeader title="Learning hub">
        Everything your tutor has shared, plus notes from past lessons and open resources
        anyone can use.
      </PageHeader>

      <section>
        <h2 className="text-xl">Shared with you</h2>
        {(mine.data ?? []).length === 0 ? (
          <div className="mt-4">
            <EmptyState icon="📚" title="Nothing assigned yet">
              Your tutor will drop worksheets, audio and decks here after your first lesson.
            </EmptyState>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {(mine.data ?? []).map((material) => (
              <MaterialCard key={material.id} material={material} />
            ))}
          </div>
        )}
      </section>

      {(notes.data ?? []).length > 0 ? (
        <section className="mt-12">
          <h2 className="text-xl">Lesson notes</h2>
          <div className="mt-4 space-y-4">
            {(notes.data ?? []).map((note) => (
              <div key={note.id} className="rounded-2xl bg-white p-5 ring-1 ring-ink-900/8">
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

      {(library.data ?? []).length > 0 ? (
        <section className="mt-12">
          <SectionHeading title="Open library" className="max-w-xl">
            Free resources from our tutors. No assignment needed.
          </SectionHeading>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {(library.data ?? []).map((material) => (
              <MaterialCard key={material.id} material={material} />
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

  const remove = useAction((id: string) => api.materials.remove(id));

  if (materials.loading) return <Loading label="Opening your hub" />;

  const students = (tutees.data ?? []).filter((person) => person.role === "student");

  return (
    <>
      <PageHeader
        title="Learning hub"
        action={<Button size="sm" onClick={() => setComposing(true)}>Add material</Button>}
      >
        Upload what you use in lessons and assign it to the students who need it.
      </PageHeader>

      {(materials.data ?? []).length === 0 ? (
        <EmptyState
          icon="📥"
          title="Your shelf is empty"
          action={<Button onClick={() => setComposing(true)}>Add your first material</Button>}
        >
          Worksheets, audio drills, links to news clips — anything a student can work through
          between lessons.
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(materials.data ?? []).map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              footer={
                <div className="flex items-center gap-1">
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
              }
            />
          ))}
        </div>
      )}

      {composing ? (
        <MaterialComposer
          owner={owner}
          students={students}
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
  onClose,
}: {
  owner: User;
  students: User[];
  onClose: () => void;
}) {
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
