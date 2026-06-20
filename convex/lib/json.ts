// Robustly extract a JSON object from an LLM response that may be wrapped in
// prose or ```json code fences.
export function extractJson(raw: string): Record<string, unknown> {
  if (!raw || !raw.trim()) throw new Error("empty response");

  // Prefer a fenced block if present.
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("no JSON object found in response");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}
