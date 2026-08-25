"use client";

import { useEffect, useRef } from "react";

/**
 * Cloudflare Turnstile — a CAPTCHA on signup and the waitlist form. Renders
 * nothing when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is unset, so the site still
 * works without a Cloudflare account; the server does the same on its side
 * (see `lib/turnstile.ts`), so the two stay in sync automatically.
 */

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export const turnstileAvailable = SITE_KEY !== "";

interface TurnstileApi {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    },
  ): string;
  reset(widgetId?: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("load failed")), { once: true });
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

export function TurnstileWidget({ onToken }: { onToken: (token: string) => void }) {
  const holder = useRef<HTMLDivElement>(null);
  const latest = useRef(onToken);

  useEffect(() => {
    latest.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!turnstileAvailable) return;

    let cancelled = false;
    let widgetId: string | undefined;

    void loadScript()
      .then(() => {
        if (cancelled || !holder.current || !window.turnstile) return;
        widgetId = window.turnstile.render(holder.current, {
          sitekey: SITE_KEY,
          callback: (token) => latest.current(token),
        });
      })
      .catch(() => {
        // Signup/waitlist still submit without a token — the server then
        // either rejects (CAPTCHA required) or accepts (CAPTCHA off), same
        // as if this had never loaded.
      });

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.reset(widgetId);
    };
  }, []);

  if (!turnstileAvailable) return null;

  return <div ref={holder} className="[color-scheme:light]" />;
}
