import type { Metadata } from "next";
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
  title: {
    default: "Serendib Learn — Sinhala & Tamil, taught by Sri Lankans",
    template: "%s · Serendib Learn",
  },
  description:
    "Live one-to-one Sinhala and Tamil lessons, a portal for students and tutors, and games that teach you the island one phrase at a time.",
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
