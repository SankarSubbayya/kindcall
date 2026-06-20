import { describe, it, expect } from "vitest";
import { shouldAlert, buildAlertMessage } from "../convex/lib/alerts";
import type { StructuredNote } from "../convex/lib/domain";

const base: StructuredNote = {
  summary: "s",
  mood: "neutral",
  wellnessScore: 5,
  medicationTaken: null,
  concerns: [],
  serviceRequests: [],
  urgency: "normal",
  actionItems: [],
};

describe("shouldAlert", () => {
  it("pages on high and critical only", () => {
    expect(shouldAlert({ ...base, urgency: "normal" })).toBe(false);
    expect(shouldAlert({ ...base, urgency: "high" })).toBe(true);
    expect(shouldAlert({ ...base, urgency: "critical" })).toBe(true);
  });
});

describe("buildAlertMessage", () => {
  it("includes patient name, needs and an urgency cue", () => {
    const note: StructuredNote = {
      ...base,
      urgency: "critical",
      summary: "Chest pain reported",
      serviceRequests: [{ type: "medical_emergency", label: "Medical Emergency", urgency: "critical" }],
      concerns: ["chest pain"],
    };
    const msg = buildAlertMessage("Margaret", note);
    expect(msg).toContain("Margaret");
    expect(msg).toContain("Medical Emergency");
    expect(msg).toContain("immediately");
    expect(msg.startsWith("🚨")).toBe(true);
  });

  it("uses a softer cue for high (non-critical) urgency", () => {
    const msg = buildAlertMessage("Walter", { ...base, urgency: "high", summary: "Needs a refill" });
    expect(msg.startsWith("⚠️")).toBe(true);
    expect(msg).toContain("when you can");
  });
});
