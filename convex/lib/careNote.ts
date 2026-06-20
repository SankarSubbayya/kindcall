// Turn a dictated care note into a structured clinical record.
// The LLM path (via Respan) is primary; heuristicStructure() is a deterministic
// fallback (ported from CareCompanion) so the demo always works without keys.

import type { ChatMessage } from "./respan";
import { extractJson } from "./json";
import {
  CATEGORY_TYPES,
  EMERGENCY_WORDS,
  NEGATIVE_WORDS,
  POSITIVE_WORDS,
  SERVICE_CATEGORIES,
  labelForCategory,
  maxUrgency,
  type Mood,
  type ServiceRequest,
  type StructuredNote,
  type Urgency,
} from "./domain";

export const STRUCTURE_SYSTEM_PROMPT =
  "You are KindCall, a careful clinical-intake assistant for senior care. " +
  "A caregiver has dictated a free-form care note. Convert it into a structured record. " +
  "Be strictly faithful: never invent facts, medications, or symptoms that are not in the note. " +
  "If something is not mentioned, leave it empty/null. Flag anything urgent honestly.";

export function buildStructureMessages(transcript: string): ChatMessage[] {
  const categoryList = SERVICE_CATEGORIES.map((c) => `- ${c.type}: ${c.label}`).join("\n");
  const user =
    `Care note (dictated by a caregiver):\n"""${transcript}"""\n\n` +
    `Return ONLY a JSON object with this exact shape:\n` +
    `{\n` +
    `  "summary": string,\n` +
    `  "mood": "happy"|"neutral"|"sad"|"concerning"|"unknown",\n` +
    `  "wellnessScore": integer 1-10,\n` +
    `  "medicationTaken": true|false|null,\n` +
    `  "concerns": string[],\n` +
    `  "serviceRequests": [{"type": one of [${CATEGORY_TYPES.join(", ")}], "label": string, "urgency": "normal"|"high"|"critical"}],\n` +
    `  "urgency": "normal"|"high"|"critical",\n` +
    `  "actionItems": string[]\n` +
    `}\n\n` +
    `Allowed serviceRequest types:\n${categoryList}`;
  return [
    { role: "system", content: STRUCTURE_SYSTEM_PROMPT },
    { role: "user", content: user },
  ];
}

const MOODS: Mood[] = ["happy", "neutral", "sad", "concerning", "unknown"];
const URGENCIES: Urgency[] = ["normal", "high", "critical"];

function coerceMood(m: unknown): Mood {
  return MOODS.includes(m as Mood) ? (m as Mood) : "unknown";
}
function coerceUrgency(u: unknown): Urgency {
  return URGENCIES.includes(u as Urgency) ? (u as Urgency) : "normal";
}
function clampScore(n: unknown): number {
  const x = Math.round(Number(n));
  if (Number.isNaN(x)) return 5;
  return Math.max(1, Math.min(10, x));
}
function stringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

/** Parse + validate the LLM's JSON, dropping anything off-schema. */
export function parseStructuredNote(raw: string): StructuredNote {
  const obj = extractJson(raw) as Record<string, any>;

  const serviceRequests: ServiceRequest[] = Array.isArray(obj.serviceRequests)
    ? obj.serviceRequests
        .filter((r: any) => r && CATEGORY_TYPES.includes(r.type))
        .map((r: any) => ({
          type: r.type as string,
          label: labelForCategory(r.type, r.label),
          urgency: coerceUrgency(r.urgency),
        }))
    : [];

  const note: StructuredNote = {
    summary: typeof obj.summary === "string" ? obj.summary.trim() : "",
    mood: coerceMood(obj.mood),
    wellnessScore: clampScore(obj.wellnessScore),
    medicationTaken: obj.medicationTaken === true ? true : obj.medicationTaken === false ? false : null,
    concerns: stringArray(obj.concerns),
    serviceRequests,
    urgency: coerceUrgency(obj.urgency),
    actionItems: stringArray(obj.actionItems),
  };

  // Overall urgency is at least as severe as any single request.
  note.urgency = maxUrgency([note.urgency, ...serviceRequests.map((s) => s.urgency)]);
  return note;
}

const MED_YES = ["took", "taken", "already took"];
const MED_NO = ["forgot", "haven't", "didn't take", "missed", "not yet", "skip"];

/** Deterministic, no-LLM structuring — ported from CareCompanion analyze_transcript(). */
export function heuristicStructure(transcript: string): StructuredNote {
  const text = (transcript || "").toLowerCase();
  if (!text.trim()) {
    return {
      summary: "No note provided",
      mood: "unknown",
      wellnessScore: 5,
      medicationTaken: null,
      concerns: [],
      serviceRequests: [],
      urgency: "normal",
      actionItems: [],
    };
  }

  const words = new Set(text.match(/\b[\w']+\b/g) ?? []);
  const pos = POSITIVE_WORDS.filter((w) => words.has(w)).length;
  const neg = NEGATIVE_WORDS.filter((w) => words.has(w)).length;

  let mood: Mood;
  if (neg > pos + 1) mood = "concerning";
  else if (neg > pos) mood = "sad";
  else if (pos > neg + 1) mood = "happy";
  else mood = "neutral";

  let wellness = Math.max(1, Math.min(10, 6 + pos - neg * 2));

  const concerns: string[] = [];
  let emergencyHit = false;
  for (const phrase of EMERGENCY_WORDS) {
    if (text.includes(phrase)) {
      concerns.push(phrase);
      emergencyHit = true;
    }
  }
  if (text.includes("lonely") || text.includes("alone")) concerns.push("loneliness");
  if (text.includes("confused") || text.includes("remember")) concerns.push("possible confusion");

  const medYes = MED_YES.some((w) => text.includes(w));
  const medNo = MED_NO.some((w) => text.includes(w));
  const medicationTaken = medYes && !medNo ? true : medNo && !medYes ? false : null;

  const serviceRequests: ServiceRequest[] = [];
  for (const cat of SERVICE_CATEGORIES) {
    if (cat.phrases.some((p) => text.includes(p))) {
      serviceRequests.push({ type: cat.type, label: cat.label, urgency: cat.defaultUrgency });
    }
  }

  if (concerns.length) wellness = Math.max(1, wellness - concerns.length);

  const urgency = maxUrgency([
    "normal",
    ...serviceRequests.map((s) => s.urgency),
    ...(emergencyHit ? (["critical"] as Urgency[]) : []),
  ]);

  const parts = [`Mood: ${mood}`];
  if (medicationTaken === true) parts.push("Medications taken");
  else if (medicationTaken === false) parts.push("Medications NOT taken");
  if (concerns.length) parts.push(`Concerns: ${concerns.join(", ")}`);
  if (serviceRequests.length) parts.push(`Service requests: ${serviceRequests.map((s) => s.label).join(", ")}`);

  return {
    summary: parts.join(". "),
    mood,
    wellnessScore: wellness,
    medicationTaken,
    concerns,
    serviceRequests,
    urgency,
    actionItems: serviceRequests.map((s) => `Arrange: ${s.label}`),
  };
}
