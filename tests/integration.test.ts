import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";

// convex-test discovers the modules root from the "_generated" dir, so include it.
const modules = import.meta.glob("../convex/**/*.*s");

const makeT = () => convexTest(schema, modules);

// Scheduled actions (runAfter(0)) fire via the timer queue, so drive them with
// fake timers + finishAllScheduledFunctions.
const runScheduled = (t: ReturnType<typeof convexTest>) =>
  t.finishAllScheduledFunctions(vi.runAllTimers);

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete process.env.RESPAN_API_KEY;
  delete process.env.PHOTON_API_KEY;
  delete process.env.PHOTON_ENDPOINT;
});

describe("patients", () => {
  it("seeds idempotently and lists demo patients", async () => {
    const t = makeT();
    await t.mutation(api.patients.seed, {});
    await t.mutation(api.patients.seed, {}); // idempotent
    const patients = await t.query(api.patients.list, {});
    expect(patients).toHaveLength(2);
    expect(patients.map((p) => p.name)).toContain("Margaret Doe");
  });
});

describe("dictate → structure (heuristic fallback, no API keys)", () => {
  it("structures an urgent note as critical and pages the family (log channel)", async () => {
    const t = makeT();
    const patientId = await t.mutation(api.patients.seed, {});

    await t.mutation(api.careNotes.dictate, {
      patientId,
      author: "Nurse Joy",
      transcript: "She had chest pain and we need an ambulance right away",
    });

    // Queued, not yet structured.
    let notes = await t.query(api.careNotes.listByPatient, { patientId });
    expect(notes[0].status).toBe("processing");

    // Run the scheduled structuring action.
    await runScheduled(t);

    notes = await t.query(api.careNotes.listByPatient, { patientId });
    const note = notes[0];
    expect(note.status).toBe("structured");
    expect(note.source).toBe("heuristic"); // no RESPAN_API_KEY -> deterministic fallback
    expect(note.urgency).toBe("critical");
    expect(note.serviceRequests?.some((s) => s.type === "medical_emergency")).toBe(true);

    const alerts = await t.query(api.careNotes.alertsByPatient, { patientId });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].urgency).toBe("critical");
    expect(alerts[0].sent).toBe(false); // Photon not configured
    expect(alerts[0].channel).toBe("log");
    expect(alerts[0].message).toContain("Margaret");
  });

  it("does not page the family for a calm, normal note", async () => {
    const t = makeT();
    const patientId = await t.mutation(api.patients.seed, {});
    await t.mutation(api.careNotes.dictate, {
      patientId,
      author: "Nurse Joy",
      transcript: "She was happy and feeling great, we had a lovely chat",
    });
    await runScheduled(t);

    const notes = await t.query(api.careNotes.listByPatient, { patientId });
    expect(notes[0].urgency).toBe("normal");
    const alerts = await t.query(api.careNotes.alertsByPatient, { patientId });
    expect(alerts).toHaveLength(0);
  });
});

describe("dictate → structure (Respan gateway, mocked)", () => {
  it("uses the gateway result and records the faithfulness eval", async () => {
    process.env.RESPAN_API_KEY = "sk-test";

    const structured = {
      summary: "Margaret is low and out of her medication",
      mood: "sad",
      wellnessScore: 4,
      medicationTaken: false,
      concerns: ["low mood"],
      serviceRequests: [{ type: "medicine_need", label: "Medicine / Prescription", urgency: "high" }],
      urgency: "high",
      actionItems: ["Refill prescription"],
    };

    const fetchMock = vi.fn(async (_url: unknown, init: { body: string }) => {
      const body = JSON.parse(init.body) as { messages: unknown };
      const isEval = JSON.stringify(body.messages).includes("strict evaluator");
      const content = isEval
        ? '{"score": 0.92, "reason": "faithful"}'
        : "```json\n" + JSON.stringify(structured) + "\n```";
      return new Response(
        JSON.stringify({ model: "test-model", choices: [{ message: { content } }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const t = makeT();
    const patientId = await t.mutation(api.patients.seed, {});
    await t.mutation(api.careNotes.dictate, {
      patientId,
      author: "Dr. Smith",
      transcript: "Margaret seems low and she ran out of her medication",
    });
    await runScheduled(t);

    const notes = await t.query(api.careNotes.listByPatient, { patientId });
    const note = notes[0];
    expect(note.source).toBe("respan");
    expect(note.urgency).toBe("high");
    expect(note.evalScore).toBeCloseTo(0.92);
    expect(note.evalPass).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2); // structuring + eval

    const alerts = await t.query(api.careNotes.alertsByPatient, { patientId });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].urgency).toBe("high");
  });
});
