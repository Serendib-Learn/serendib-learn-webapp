import { notFound } from "next/navigation";
import { features } from "@/lib/features";

/**
 * MESSAGES-HIDDEN: direct messages are parked, not deleted. The page below is
 * intact; this check keeps it offline. See `src/lib/features.ts`.
 */
export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  if (!features.messages) notFound();
  return children;
}
