"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/** The API refuses anything longer, so stop recording here. */
const MAX_SECONDS = 180;

export interface Recording {
  blob: Blob;
  durationSec: number;
  /** An object URL for listening back; revoked when the recording is replaced. */
  url: string;
}

const noSubscription = () => () => {};

function supportedType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus", "audio/webm"].find(
    (type) => MediaRecorder.isTypeSupported(type),
  );
}

function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

/**
 * Records a short voice note in the browser (MediaRecorder, at a voice
 * bitrate so three minutes stays small), lets the person listen back, and
 * hands the recording up. Nothing is uploaded until the form is submitted.
 */
export function VoiceRecorder({
  value,
  onChange,
}: {
  value: Recording | null;
  onChange: (recording: Recording | null) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const startedAt = useRef(0);

  // MediaRecorder only exists in the browser; assume support while rendering on the server.
  const supported = useSyncExternalStore(
    noSubscription,
    () => supportedType() !== undefined && !!navigator.mediaDevices?.getUserMedia,
    () => true,
  );

  useEffect(() => {
    if (!value) return;
    return () => URL.revokeObjectURL(value.url);
  }, [value]);

  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => {
      const elapsed = (Date.now() - startedAt.current) / 1000;
      setSeconds(elapsed);
      if (elapsed >= MAX_SECONDS) recorder.current?.stop();
    }, 250);
    return () => clearInterval(timer);
  }, [recording]);

  // Never leave the microphone on if the dialog closes mid-recording.
  useEffect(() => () => recorder.current?.stop(), []);

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const media = new MediaRecorder(stream, {
        mimeType: supportedType(),
        audioBitsPerSecond: 32_000,
      });
      const chunks: Blob[] = [];
      media.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      media.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        const durationSec = Math.min(MAX_SECONDS, (Date.now() - startedAt.current) / 1000);
        const blob = new Blob(chunks, { type: media.mimeType });
        onChange({ blob, durationSec, url: URL.createObjectURL(blob) });
      };
      recorder.current = media;
      startedAt.current = Date.now();
      setSeconds(0);
      media.start();
      setRecording(true);
    } catch {
      setError("We could not use your microphone. Check the browser's permission for this site.");
    }
  };

  if (!supported) {
    return <p className="text-xs text-ink-400">Voice notes are not supported in this browser.</p>;
  }

  return (
    <div className="rounded-2xl bg-sand-100/70 p-4 ring-1 ring-ink-900/6">
      {value && !recording ? (
        <div className="flex flex-wrap items-center gap-3">
          <audio controls src={value.url} className="h-10 max-w-full flex-1" />
          <span className="text-xs text-ink-500">{clock(value.durationSec)}</span>
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}>
            Remove
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            size="sm"
            variant={recording ? "danger" : "secondary"}
            onClick={() => (recording ? recorder.current?.stop() : void start())}
          >
            <span
              aria-hidden
              className={cn("size-2.5 rounded-full", recording ? "animate-pulse bg-white" : "bg-clay-500")}
            />
            {recording ? "Stop" : "Record a voice note"}
          </Button>
          <span className="text-xs text-ink-500">
            {recording ? `${clock(seconds)} / ${clock(MAX_SECONDS)}` : "Up to three minutes — often easier than typing."}
          </span>
        </div>
      )}
      {error ? <p className="mt-2 text-xs text-clay-600">{error}</p> : null}
    </div>
  );
}
