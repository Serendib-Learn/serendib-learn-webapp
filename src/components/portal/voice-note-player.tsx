"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/**
 * Plays a stored voice note. The audio lives behind the session cookie on the
 * API's own domain, so it is fetched (with credentials) rather than given to
 * <audio> as a cross-origin src.
 */
export function VoiceNotePlayer({ id, label = "Voice note" }: { id: string; label?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let url: string | null = null;
    let live = true;
    api.voiceNotes.audio(id).then(
      (blob) => {
        if (!live) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);

  if (failed) return <p className="text-xs text-ink-400">That voice note could not be played.</p>;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-ink-600">🎙️ {label}</span>
      {src ? <audio controls src={src} className="h-9 max-w-full" /> : <span className="text-xs text-ink-400">Loading…</span>}
    </div>
  );
}
