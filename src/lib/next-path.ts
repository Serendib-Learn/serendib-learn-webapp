/**
 * Where to go after signing in: the portal page someone was sent away from
 * (`?next=/portal/calendar?bundle=5`, say), or the portal's home. Only paths
 * inside the portal are followed, so the link can't send anyone off-site.
 */
export function afterSignInPath(): string {
  if (typeof window === "undefined") return "/portal";
  const next = new URLSearchParams(window.location.search).get("next") ?? "";
  return next.startsWith("/portal/") && !next.startsWith("//") && !next.includes("\\") ? next : "/portal";
}

/** The login page, remembering where to come back to. */
export function loginPathFor(pathname: string, search: string): string {
  const here = `${pathname}${search}`;
  return here.startsWith("/portal/") ? `/portal/login?next=${encodeURIComponent(here)}` : "/portal/login";
}
