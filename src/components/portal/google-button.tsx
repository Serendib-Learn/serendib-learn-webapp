"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Google's own "Sign in with Google" button, from Google Identity Services.
 * It hands back an ID token which the API verifies — the browser never sees a
 * client secret, and there is no redirect to manage.
 *
 * Renders nothing at all when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is unset, so the
 * site still runs without a Google project.
 */

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const SCRIPT_SRC = "https://accounts.google.com/gsi/client";

interface CredentialResponse {
  credential?: string;
}

interface GoogleIdentityApi {
  accounts: {
    id: {
      initialize(options: {
        client_id: string;
        callback(response: CredentialResponse): void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
      }): void;
      renderButton(
        parent: HTMLElement,
        options: {
          type?: "standard" | "icon";
          theme?: "outline" | "filled_blue" | "filled_black";
          size?: "small" | "medium" | "large";
          text?: "signin_with" | "signup_with" | "continue_with";
          shape?: "rectangular" | "pill";
          width?: number;
          logo_alignment?: "left" | "center";
        },
      ): void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityApi;
  }
}

export const googleSignInAvailable = CLIENT_ID !== "";

function loadScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("load failed")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("load failed"));
    document.head.appendChild(script);
  });
}

export function GoogleButton({
  text = "continue_with",
  disabled = false,
  onCredential,
}: {
  text?: "signin_with" | "signup_with" | "continue_with";
  /** Blocks the click while the surrounding form is incomplete. */
  disabled?: boolean;
  onCredential: (credential: string) => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const latest = useRef(onCredential);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    latest.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!googleSignInAvailable) return;

    let cancelled = false;

    void loadScript()
      .then(() => {
        const identity = window.google?.accounts.id;
        if (cancelled || !identity || !holder.current) return;

        identity.initialize({
          client_id: CLIENT_ID,
          callback: (response) => {
            if (response.credential) latest.current(response.credential);
          },
          cancel_on_tap_outside: true,
        });

        identity.renderButton(holder.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "pill",
          text,
          logo_alignment: "center",
          width: 320,
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [text]);

  if (!googleSignInAvailable) return null;

  if (failed) {
    return (
      <p className="text-center text-xs text-ink-400">
        Google sign-in could not load. Check your connection, or use your email and
        password.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-ink-900/10" />
        <span className="text-xs font-medium tracking-wide text-ink-400 uppercase">or</span>
        <span className="h-px flex-1 bg-ink-900/10" />
      </div>

      <div className="relative flex justify-center">
        <div ref={holder} className="[color-scheme:light]" />
        {disabled ? (
          // Google renders the button in an iframe we cannot disable, so cover it.
          <div
            className="absolute inset-0 cursor-not-allowed bg-sand-50/60"
            title="Choose at least one language first"
          />
        ) : null}
      </div>
    </div>
  );
}
