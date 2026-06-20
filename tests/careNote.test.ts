import { describe, it, expect } from "vitest";
import { parseStructuredNote, heuristicStructure, buildStructureMessages } from "../convex/lib/careNote";

describe("parseStructuredNote", () => {
  it("parses fenced JSON, clamps score, filters bad categories, escalates urgency", () => {
    const raw =
      "```json\n" +
      JSON.stringify({
        summary: "Margaret is tired and needs a refill",
        mood: "sad",
        wellnessScore: 42,
        medicationTaken: false,
        concerns: ["fatigue", 5],
        serviceRequests: [
          { type: "medicine_need", label: "whatever", urgency: "high" },
          { type: "not_a_real_type", label: "x", urgency: "critical" },
        ],
        urgency: "normal",
        actionItems: ["call pharmacy"],
      }) +
      "\n```";

    const note = parseStructuredNote(raw);
    expect(note.wellnessScore).toBe(10);
    expect(note.medicationTaken).toBe(false);
    expect(note.concerns).toEqual(["fatigue"]);
    expect(note.serviceRequests).toHaveLength(1);
    expect(note.serviceRequests[0].label).toBe("Medicine / Prescription");
    expect(note.urgency).toBe("high"); // escalated from the service request
  });

  it("throws on non-JSON", () => {
    expect(() => parseStructuredNote("there is no json here")).toThrow();
  });
});

describe("heuristicStructure (no-LLM fallback)", () => {
  it("flags a medical emergency as critical", () => {
    const note = heuristicStructure("She had chest pain and I think we need an ambulance");
    expect(note.urgency).toBe("critical");
    expect(note.serviceRequests.some((s) => s.type === "medical_emergency")).toBe(true);
    expect(note.concerns.length).toBeGreaterThan(0);
  });

  it("detects medication not taken and a refill need (high urgency)", () => {
    const note = heuristicStructure("She forgot her pills and we ran out of medication");
    expect(note.medicationTaken).toBe(false);
    expect(note.serviceRequests.some((s) => s.type === "medicine_need")).toBe(true);
    expect(note.urgency).toBe("high");
  });

  it("reads a positive note as happy and normal urgency", () => {
    const note = heuristicStructure("She was happy and feeling great today, we had a lovely chat");
    expect(note.mood).toBe("happy");
    expect(note.urgency).toBe("normal");
  });

  it("handles an empty note", () => {
    const note = heuristicStructure("   ");
    expect(note.mood).toBe("unknown");
    expect(note.serviceRequests).toHaveLength(0);
  });
});

describe("buildStructureMessages", () => {
  it("includes the transcript and the allowed categories", () => {
    const msgs = buildStructureMessages("She needs a shower");
    expect(msgs[0].role).toBe("system");
    expect(msgs[1].content).toContain("She needs a shower");
    expect(msgs[1].content).toContain("medical_emergency");
  });
});
