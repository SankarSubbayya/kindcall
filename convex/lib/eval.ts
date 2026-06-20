// LLM-as-judge faithfulness eval for a structured care note, scored via Respan.
// Catches the dangerous failure mode: a structured record that hallucinates or
// drops an urgent concern present in the caregiver's words.

import type { ChatMessage } from "./respan";
import { extractJson } from "./json";
import type { StructuredNote } from "./domain";

export interface EvalVerdict {
  score: number; // 0-1 faithfulness
  pass: boolean;
  reason: string;
}

export const EVAL_SYSTEM_PROMPT =
  "You are a strict evaluator. Decide whether a structured care record faithfully " +
  "represents a caregiver's dictated note. Penalize hallucinated facts, missed urgent " +
  "concerns, wrong urgency, and incorrect medication status. Respond ONLY with JSON.";

export function buildEvalMessages(transcript: string, structured: StructuredNote): ChatMessage[] {
  const user =
    `Original dictated note:\n"""${transcript}"""\n\n` +
    `Structured record:\n${JSON.stringify(structured, null, 2)}\n\n` +
    `Return ONLY:\n{ "score": number between 0 and 1, "reason": string }\n` +
    `score = faithfulness (1 = perfectly faithful, 0 = fabricated or misses critical info).`;
  return [
    { role: "system", content: EVAL_SYSTEM_PROMPT },
    { role: "user", content: user },
  ];
}

export function parseEvalVerdict(raw: string, threshold = 0.7): EvalVerdict {
  const obj = extractJson(raw) as Record<string, unknown>;
  let score = Number(obj.score);
  if (Number.isNaN(score)) score = 0;
  score = Math.max(0, Math.min(1, score));
  return {
    score,
    pass: score >= threshold,
    reason: typeof obj.reason === "string" ? obj.reason : "",
  };
}
