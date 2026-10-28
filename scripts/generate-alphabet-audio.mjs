// Generates the Tamil alphabet sheet's audio with Google Cloud Text-to-Speech:
// every letter, every example word and every vowel sign, as small MP3s in
// public/audio/alphabet/tamil/, named by audioKey() (src/lib/content.ts).
// The letters come from the alphabet sheet in the database, through the API —
// so run it again after tutors change the Tamil sheet.
//
//   node scripts/generate-alphabet-audio.mjs            # only what is missing
//   node scripts/generate-alphabet-audio.mjs --force    # regenerate everything
//   API_URL=https://… node scripts/generate-alphabet-audio.mjs   # another API (default: the local one)
//
// Needs `gcloud auth login` with access to the serendib-learn project and the
// Text-to-Speech API enabled there. Google has no Sinhala voice, so Sinhala
// audio comes from tutors' recordings on the alphabet page instead; a tutor's
// Tamil recording also takes priority over these files.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

/** Same as audioKey() in src/lib/content.ts: the text's code points, e.g. 0B85-0BAE. */
function audioKey(text) {
  return Array.from(text)
    .map((char) => char.codePointAt(0).toString(16).toUpperCase().padStart(4, "0"))
    .join("-");
}

const API = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");
const sheetResponse = await fetch(`${API}/api/content/alphabet/tamil`);
if (!sheetResponse.ok) throw new Error(`Could not read the Tamil sheet from ${API}: ${sheetResponse.status}`);
const tamilAlphabet = await sheetResponse.json();

const PROJECT = "serendib-learn";
const VOICE = { languageCode: "ta-IN", name: "ta-IN-Wavenet-A" };
const force = process.argv.includes("--force");
const outDir = path.resolve(import.meta.dirname, "../public/audio/alphabet/tamil");
mkdirSync(outDir, { recursive: true });

const token = execFileSync("gcloud", ["auth", "print-access-token"]).toString().trim();

// Everything to say: each letter (skipping the bare marks, which have no
// sound of their own), each example word, and each vowel sign on க.
const texts = new Set();
for (const group of tamilAlphabet.groups) {
  for (const letter of group.letters) {
    if (!["ஃ", "்"].includes(letter.letter)) texts.add(letter.letter);
    if (letter.example) texts.add(letter.example.word);
  }
}
for (const sign of tamilAlphabet.vowelSigns.signs) texts.add(sign.form);

let made = 0;
for (const text of texts) {
  const file = path.join(outDir, `${audioKey(text)}.mp3`);
  if (existsSync(file) && !force) continue;

  const response = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "x-goog-user-project": PROJECT,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: { text },
      voice: VOICE,
      audioConfig: { audioEncoding: "MP3", speakingRate: 0.8 },
    }),
  });
  if (!response.ok) throw new Error(`${text}: ${response.status} ${await response.text()}`);
  const { audioContent } = await response.json();
  writeFileSync(file, Buffer.from(audioContent, "base64"));
  made += 1;
}

console.log(`${made} new file(s), ${texts.size} in all, in ${outDir}`);
