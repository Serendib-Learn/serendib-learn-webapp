import {
  BookOpenText,
  Calendar,
  ClipboardList,
  FolderOpen,
  Home,
  Mail,
  MessageCircle,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/types";

/**
 * The portal's sections, in the order the original site's portal header
 * listed them (Home, Calendar, Learning hub, Homework, Community), followed by
 * the ones this version adds. The icons are the original site's (lucide).
 */
export interface PortalSection {
  href: string;
  label: string;
  /** One line, for the Welcome back cards. */
  description: string;
  /** The line under the page title. */
  tagline: string;
  Icon: LucideIcon;
  roles: Role[];
}

const everyone: Role[] = ["student", "tutor", "admin"];

export const portalSections: PortalSection[] = [
  {
    href: "/portal",
    label: "Home",
    description: "Everything at a glance",
    tagline: "",
    Icon: Home,
    roles: everyone,
  },
  {
    href: "/portal/calendar",
    label: "Calendar",
    description: "Book sessions, see upcoming classes",
    tagline: "Pick a day, see what's open, and book a session - no other site needed.",
    Icon: Calendar,
    roles: everyone,
  },
  {
    href: "/portal/learning-hub",
    label: "Learning hub",
    description: "Vocab sheets, audio and worksheets by unit",
    tagline: "Vocabulary, audio and worksheets, organised by folder. Tutors can upload directly here.",
    Icon: FolderOpen,
    roles: everyone,
  },
  {
    href: "/portal/homework",
    label: "Homework",
    description: "See what's assigned, submit your work",
    tagline: "What's been assigned, and where to send it back.",
    Icon: ClipboardList,
    roles: everyone,
  },
  {
    href: "/portal/community",
    label: "Community",
    description: "Ask questions, share wins, connect",
    tagline: "",
    Icon: MessageCircle,
    roles: everyone,
  },
  {
    href: "/portal/messages",
    label: "Messages",
    description: "Your tutor and your practice partners",
    tagline: "Quick questions between lessons - scheduling, a word you forgot, a link you promised.",
    Icon: Mail,
    roles: everyone,
  },
  {
    href: "/portal/content",
    label: "Content",
    description: "Phrase lists, alphabet sheets, holidays",
    tagline: "The course's teaching content — edit it here and every page uses it.",
    Icon: BookOpenText,
    roles: ["tutor", "admin"],
  },
  {
    href: "/portal/profile",
    label: "Profile",
    description: "Your character, languages and details",
    tagline: "",
    Icon: UserRound,
    roles: everyone,
  },
  {
    href: "/portal/admin",
    label: "Admin",
    description: "People, tutor applications, moderation",
    tagline: "",
    Icon: ShieldCheck,
    roles: ["admin"],
  },
];

export function sectionFor(pathname: string): PortalSection | undefined {
  return portalSections
    .filter((section) => section.href !== "/portal")
    .find((section) => pathname.startsWith(section.href));
}
