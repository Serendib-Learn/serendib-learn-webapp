"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/hooks";

/**
 * Starts a Google connection: asks the API for the consent screen's address
 * in the background, then sends the browser to Google. (Navigating to the
 * API directly loses the session in browsers that keep the API's cookie for
 * background requests only — Brave, Safari, Chrome without third-party
 * cookies.)
 */
export function GoogleConnectButton({
  getUrl,
  children,
  className,
}: {
  getUrl: () => Promise<string>;
  children: React.ReactNode;
  className?: string;
}) {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className={className}>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={opening}
        onClick={async () => {
          setError(null);
          setOpening(true);
          try {
            window.location.assign(await getUrl());
          } catch (failure) {
            setError(errorMessage(failure));
            setOpening(false);
          }
        }}
      >
        {opening ? "Opening Google…" : children}
      </Button>
      {error ? <p className="mt-2 text-sm text-clay-600">{error}</p> : null}
    </div>
  );
}
