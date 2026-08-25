import { Header } from "@/components/site/header";

export default function PortalLayout({ children }: LayoutProps<"/portal">) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
    </>
  );
}
