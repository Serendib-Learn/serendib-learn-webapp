import type { Metadata, Viewport } from "next";
import {
  Inter,
  Noto_Sans_Sinhala,
  Noto_Sans_Tamil,
} from "next/font/google";
import { DemoInbox } from "@/components/site/demo-inbox";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const notoSinhala = Noto_Sans_Sinhala({
  variable: "--font-noto-sinhala",
  subsets: ["sinhala"],
  display: "swap",
});

const notoTamil = Noto_Sans_Tamil({
  variable: "--font-noto-tamil",
  subsets: ["tamil"],
  display: "swap",
});

export const metadata: Metadata = {
  // Absolute URLs for the share image and canonical links. Set
  // NEXT_PUBLIC_SITE_URL wherever the site is served from somewhere else.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.serendiblearn.com"),
  title: {
    default: "Serendib Learn — Sinhala & Tamil, taught by Sri Lankans",
    template: "%s · Serendib Learn",
  },
  description:
    "Live one-to-one Sinhala and Tamil lessons with personally vetted Sri Lankan tutors, and a portal for students, tutors and a vetted community.",
};

/** The forest green of the header, for the browser chrome and the installed app. */
export const viewport: Viewport = {
  themeColor: "#1B4332",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${notoSinhala.variable} ${notoTamil.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-sand-50 text-ink-900">
        <AuthProvider>
          {children}
          <DemoInbox />
        </AuthProvider>
      </body>
    </html>
  );
}
