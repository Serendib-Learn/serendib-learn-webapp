import { PortalShell } from "@/components/portal/portal-shell";

export default function PortalAppLayout({ children }: LayoutProps<"/portal">) {
  return <PortalShell>{children}</PortalShell>;
}
