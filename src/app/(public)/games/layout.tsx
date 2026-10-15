import { notFound } from "next/navigation";
import { features } from "@/lib/features";

/**
 * GAMES-HIDDEN: the games are parked, not deleted. Every page below this
 * layout is intact; this one check is what keeps them offline. See
 * `src/lib/features.ts` to switch them back on.
 */
export default function GamesLayout({ children }: LayoutProps<"/games">) {
  if (!features.games) notFound();
  return children;
}
