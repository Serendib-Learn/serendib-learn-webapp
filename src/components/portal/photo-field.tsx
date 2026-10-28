"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/api";
import { profilePhotoUrl } from "@/lib/api/public";
import { useAction } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Alert, Avatar } from "@/components/ui/primitives";
import type { User } from "@/lib/types";

/** Longest side of the uploaded photo; the tutors page shows it at 112px. */
const MAX_SIDE = 800;

/** Shrinks a picked photo to a JPEG the API will take, and returns it as base64. */
async function resizedJpeg(file: File): Promise<{ mimeType: string; data: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot resize photos.");
  // JPEG has no transparency: paint white behind PNG cut-outs.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return { mimeType: "image/jpeg", data: dataUrl.slice(dataUrl.indexOf(",") + 1) };
}

/**
 * A tutor's photo for the public tutors page. Saves on its own, straight
 * away — separate from the rest of the profile form.
 */
export function PhotoField({ user }: { user: User }) {
  const input = useRef<HTMLInputElement>(null);
  const [photoId, setPhotoId] = useState(user.photoId);

  const upload = useAction(async (file: File) =>
    api.users.uploadPhoto(user.id, await resizedJpeg(file)),
  );
  const remove = useAction(() => api.users.removePhoto(user.id));
  const { confirm, dialog } = useConfirm();
  const busy = upload.pending || remove.pending;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar
          name={user.name}
          avatarId={user.avatarId}
          photoUrl={photoId ? profilePhotoUrl(user.id, photoId) : undefined}
          size="xl"
        />
        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              const updated = await upload.run(file);
              if (updated) setPhotoId(updated.photoId);
            }}
          />
          <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => input.current?.click()}>
            {upload.pending ? "Uploading…" : photoId ? "Replace photo" : "Upload a photo"}
          </Button>
          {photoId ? (
            <Button
              type="button"
              variant="danger-ghost"
              size="sm"
              disabled={busy}
              onClick={async () => {
                const yes = await confirm({
                  title: "Remove this photo?",
                  message: "The tutors page shows their character instead, until a new photo is uploaded.",
                  confirmLabel: "Remove photo",
                });
                if (!yes) return;
                const updated = await remove.run();
                if (updated) setPhotoId(undefined);
              }}
            >
              Remove
            </Button>
          ) : null}
          {dialog}
        </div>
      </div>
      <p className="text-[11px] leading-relaxed text-earth/50">
        Shown on the public tutors page instead of the character. A clear, friendly head and
        shoulders photo works best.
      </p>
      {upload.error || remove.error ? <Alert>{upload.error ?? remove.error}</Alert> : null}
    </div>
  );
}
