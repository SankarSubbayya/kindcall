// Normalize raw dictation (from Voice Cursor or the in-app mic) into a clean note.

const FILLERS = [
  "you know", "i mean", "kind of", "sort of",
  "um", "uh", "er", "ah", "like", "basically", "actually", "literally",
];

/** Remove standalone filler words/phrases (case-insensitive, word-boundary aware). */
export function stripFillers(text: string): string {
  let out = text;
  for (const filler of FILLERS) {
    const escaped = filler.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`\\b${escaped}\\b`, "gi"), " ");
  }
  return out;
}

/** Collapse whitespace, drop fillers, capitalize the first letter. */
export function normalizeTranscript(raw: string): string {
  let t = (raw ?? "").replace(/\s+/g, " ").trim();
  t = stripFillers(t).replace(/\s+([.,!?;:])/g, "$1").replace(/\s+/g, " ").trim();
  if (t.length > 0) t = t[0].toUpperCase() + t.slice(1);
  return t;
}
