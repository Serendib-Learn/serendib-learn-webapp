import type { Metadata } from "next";
import { AlphabetView } from "@/components/alphabet/alphabet-view";

export const metadata: Metadata = {
  title: "Alphabet sheet",
  description:
    "The Sinhala and Tamil alphabets on one printable sheet: every letter, its romanisation, how to say it, and an example word.",
};

export default async function AlphabetPage(props: PageProps<"/alphabet">) {
  const { script } = await props.searchParams;
  const initial = script === "tamil" ? "tamil" : "sinhala";
  return <AlphabetView key={initial} initial={initial} />;
}
