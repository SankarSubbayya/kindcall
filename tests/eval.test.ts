import { describe, it, expect } from "vitest";
import { parseEvalVerdict, buildEvalMessages } from "../convex/lib/eval";
import type { StructuredNote } from "../convex/lib/domain";

describe("parseEvalVerdict", () => {
  it("clamps score and applies the pass threshold", () => {
    expect(parseEvalVerdict('{"score": 0.9, "reason": "good"}').pass).toBe(true);
    expect(parseEvalVerdict('{"score": 0.5, "reason": "meh"}').pass).toBe(false);
    expect(parseEvalVerdict('{"score": 2, "reason": "x"}').score).toBe(1);
    expect(parseEvalVerdict('{"score": -3}').score).toBe(0);
  });

  it("handles fenced json and a custom threshold", () => {
    const v = parseEvalVerdict("```json\n{\"score\":0.6,\"reason\":\"ok\"}\n```", 0.5);
    expect(v.pass).toBe(true);
    expect(v.reason).toBe("ok");
  });
});

describe("buildEvalMessages", () => {
  it("includes the transcript and the structured record", () => {
    const note: StructuredNote = {
      summary: "fall",
      mood: "concerning",
      wellnessScore: 2,
      medicationTaken: null,
      concerns: ["fall"],
      serviceRequests: [],
      urgency: "critical",
      actionItems: [],
    };
    const msgs = buildEvalMessages("she fell", note);
    expect(msgs[1].content).toContain("she fell");
    expect(msgs[1].content).toContain("critical");
  });
});
