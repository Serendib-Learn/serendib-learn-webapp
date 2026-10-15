/**
 * Portal pages bring their own frame: the signed-in pages the forest portal
 * bar (portal-shell.tsx), the login screens a bare cream page with a link
 * back — as on the original site, neither uses the public site header.
 */
export default function PortalLayout({ children }: LayoutProps<"/portal">) {
  return <main className="flex-1">{children}</main>;
}
