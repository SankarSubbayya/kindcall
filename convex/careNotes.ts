import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { normalizeTranscript } from "./lib/transcript";

const urgency = v.union(v.literal("normal"), v.literal("high"), v.literal("critical"));

export const listByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, { patientId }) =>
    await ctx.db
      .query("careNotes")
      .withIndex("by_patient", (q) => q.eq("patientId", patientId))
      .order("desc")
      .collect(),
});

export const alertsByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, { patientId }) =>
    await ctx.db
      .query("alerts")
      .withIndex("by_patient", (q) => q.eq("patientId", patientId))
      .order("desc")
      .collect(),
});

/** Caregiver dictates a note → store it, then kick off async structuring via Respan. */
export const dictate = mutation({
  args: { patientId: v.id("patients"), author: v.string(), transcript: v.string() },
  handler: async (ctx, { patientId, author, transcript }) => {
    const normalized = normalizeTranscript(transcript);
    const id = await ctx.db.insert("careNotes", {
      patientId,
      author,
      rawTranscript: transcript,
      normalized,
      status: "processing",
      createdAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.structure.structureNote, { careNoteId: id });
    return id;
  },
});

// ---- internal helpers used by the structuring action ----

export const getWithPatient = internalQuery({
  args: { careNoteId: v.id("careNotes") },
  handler: async (ctx, { careNoteId }) => {
    const note = await ctx.db.get(careNoteId);
    if (!note) return null;
    const patient = await ctx.db.get(note.patientId);
    return { note, patient };
  },
});

export const applyStructured = internalMutation({
  args: { careNoteId: v.id("careNotes"), patch: v.any() },
  handler: async (ctx, { careNoteId, patch }) => {
    await ctx.db.patch(careNoteId, patch);
  },
});

export const recordAlert = internalMutation({
  args: {
    patientId: v.id("patients"),
    careNoteId: v.id("careNotes"),
    message: v.string(),
    urgency,
    channel: v.string(),
    sent: v.boolean(),
    detail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("alerts", { ...args, createdAt: Date.now() });
  },
});
