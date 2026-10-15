import type { Metadata } from "next";
import { AlphabetView } from "@/components/alphabet/alphabet-view";
import { learningLanguage } from "@/lib/learning-language-server";

export const metadata: Metadata = {
  title: "Alphabet sheet",
  description:
    "The Sinhala and Tamil alphabets on one printable sheet: every letter, its romanisation, how to say it, and an example word.",
};

export default async function AlphabetPage(props: PageProps<"/alphabet">) {
  const { script } = await props.searchParams;
  // An explicit ?script= wins; otherwise the language they are here for.
  const initial =
    script === "tamil" || script === "sinhala"
      ? script
      : (await learningLanguage()) === "tamil"
        ? "tamil"
        : "sinhala";
  return <AlphabetView key={initial} initial={initial} />;
}
