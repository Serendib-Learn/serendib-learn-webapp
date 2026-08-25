"use client";

import { Badge, Card, type Tone } from "@/components/ui/primitives";
import { formatDate } from "@/lib/format";
import type { Material, MaterialKind } from "@/lib/types";

const kindMeta: Record<MaterialKind, { label: string; icon: string; tone: Tone }> = {
  pdf: { label: "PDF", icon: "📄", tone: "clay" },
  audio: { label: "Audio", icon: "🎧", tone: "ocean" },
  video: { label: "Video", icon: "🎬", tone: "saffron" },
  link: { label: "Link", icon: "🔗", tone: "neutral" },
  deck: { label: "Deck", icon: "🃏", tone: "jade" },
};

export function MaterialCard({
  material,
  footer,
}: {
  material: Material;
  footer?: React.ReactNode;
}) {
  const kind = kindMeta[material.kind];

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start gap-3">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-sand-100 text-lg">
          {kind.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base leading-snug text-ink-900">{material.title}</p>
          <p className="text-xs text-ink-400">
            {kind.label} · added {formatDate(material.createdAt)}
          </p>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-ink-500">{material.description}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge tone={kind.tone}>{material.level}</Badge>
        <Badge tone={material.language === "tamil" ? "clay" : "jade"}>
          {material.language === "both"
            ? "Sinhala + Tamil"
            : material.language === "sinhala"
              ? "Sinhala"
              : "Tamil"}
        </Badge>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink-900/8 pt-4">
        {material.url ? (
          <a
            href={material.url}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-jade-700 hover:text-jade-600"
          >
            Open resource →
          </a>
        ) : (
          <span className="text-sm text-ink-400">{material.fileLabel ?? "No file attached"}</span>
        )}
        {footer}
      </div>
    </Card>
  );
}
