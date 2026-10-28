import type { Metadata } from "next";
import { AlphabetView } from "@/components/alphabet/alphabet-view";
import { fetchContent } from "@/lib/api/public";

// Re-read the sheets at most once a minute, so tutors' edits show without a redeploy.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Alphabet sheet",
  description:
    "The Sinhala and Tamil alphabets on one printable sheet: every letter, its romanisation, how to say it, and an example word.",
};

export default async function AlphabetPage(props: PageProps<"/alphabet">) {
  const { script } = await props.searchParams;
  const initial = script === "tamil" ? "tamil" : "sinhala";
  // From the database, through the content API — tutors edit it in the portal.
  const sheets = await fetchContent("alphabet");
  return <AlphabetView key={initial} initial={initial} sheets={sheets} />;
}
