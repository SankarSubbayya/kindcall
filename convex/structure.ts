import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { chatCompletion, DEFAULT_RESPAN_BASE_URL } from "./lib/respan";
import { buildStructureMessages, parseStructuredNote, heuristicStructure } from "./lib/careNote";
import { buildEvalMessages, parseEvalVerdict, type EvalVerdict } from "./lib/eval";
import { shouldAlert, buildAlertMessage } from "./lib/alerts";
import type { StructuredNote } from "./lib/domain";
import { sendSpectrumMessage } from "./photon";

// Structures a dictated care note via the Respan gateway (with an LLM-as-judge
// eval), falling back to the deterministic heuristic if no key / on failure,
// then pages the family through Photon when the note is urgent.
export const structureNote = internalAction({
  args: { careNoteId: v.id("careNotes") },
  handler: async (ctx, { careNoteId }) => {
    const data = await ctx.runQuery(internal.careNotes.getWithPatient, { careNoteId });
    if (!data || !data.note) return;
    const { note, patient } = data;
    const transcript = note.normalized || note.rawTranscript;

    const apiKey = process.env.RESPAN_API_KEY;
    const baseUrl = process.env.RESPAN_BASE_URL || DEFAULT_RESPAN_BASE_URL;
    const model = process.env.KINDCALL_MODEL || "claude-sonnet-4-6";

    let structured: StructuredNote;
    let source = "respan";
    let evalResult: EvalVerdict | null = null;

    try {
      if (!apiKey) throw new Error("RESPAN_API_KEY not set");
      const completion = await chatCompletion({
        apiKey,
        baseUrl,
        model,
        messages: buildStructureMessages(transcript),
        temperature: 0.1,
        metadata: { feature: "structure_care_note", patient: patient?.name },
      });
      structured = parseStructuredNote(completion.content);

      // Faithfulness eval — non-fatal if it fails.
      try {
        const judged = await chatCompletion({
          apiKey,
          baseUrl,
          model,
          messages: buildEvalMessages(transcript, structured),
          temperature: 0,
          metadata: { feature: "eval_care_note", patient: patient?.name },
        });
        evalResult = parseEvalVerdict(judged.content);
      } catch {
        evalResult = null;
      }
    } catch {
      // No key or the LLM/parse failed — keep the demo alive deterministically.
      structured = heuristicStructure(transcript);
      source = "heuristic";
    }

    const patch: Record<string, unknown> = {
      status: "structured",
      summary: structured.summary,
      mood: structured.mood,
      wellnessScore: structured.wellnessScore,
      medicationTaken: structured.medicationTaken,
      concerns: structured.concerns,
      serviceRequests: structured.serviceRequests,
      urgency: structured.urgency,
      actionItems: structured.actionItems,
      source,
    };
    if (evalResult) {
      patch.evalScore = evalResult.score;
      patch.evalPass = evalResult.pass;
      patch.evalReason = evalResult.reason;
    }
    await ctx.runMutation(internal.careNotes.applyStructured, { careNoteId, patch });

    if (shouldAlert(structured) && patient) {
      const message = buildAlertMessage(patient.name, structured);
      const send = await sendSpectrumMessage({ to: patient.emergencyContactPhone, text: message });
      await ctx.runMutation(internal.careNotes.recordAlert, {
        patientId: note.patientId,
        careNoteId,
        message,
        urgency: structured.urgency,
        channel: send.channel,
        sent: send.sent,
        detail: send.detail,
      });
    }
  },
});
