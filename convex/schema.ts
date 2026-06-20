import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const urgency = v.union(v.literal("normal"), v.literal("high"), v.literal("critical"));
const mood = v.union(
  v.literal("happy"),
  v.literal("neutral"),
  v.literal("sad"),
  v.literal("concerning"),
  v.literal("unknown"),
);

export default defineSchema({
  patients: defineTable({
    name: v.string(),
    patientType: v.string(), // "senior" | "disability"
    phone: v.optional(v.string()),
    medications: v.array(v.string()),
    emergencyContactName: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
  }),

  careNotes: defineTable({
    patientId: v.id("patients"),
    author: v.string(),
    rawTranscript: v.string(),
    normalized: v.string(),
    status: v.union(v.literal("processing"), v.literal("structured"), v.literal("error")),
    createdAt: v.number(),

    // Filled in by the Respan-powered structuring action.
    summary: v.optional(v.string()),
    mood: v.optional(mood),
    wellnessScore: v.optional(v.number()),
    medicationTaken: v.optional(v.union(v.boolean(), v.null())),
    concerns: v.optional(v.array(v.string())),
    serviceRequests: v.optional(
      v.array(v.object({ type: v.string(), label: v.string(), urgency })),
    ),
    urgency: v.optional(urgency),
    actionItems: v.optional(v.array(v.string())),

    // Respan eval (LLM-as-judge faithfulness).
    evalScore: v.optional(v.number()),
    evalPass: v.optional(v.boolean()),
    evalReason: v.optional(v.string()),
    source: v.optional(v.string()), // "respan" | "heuristic"
  })
    .index("by_patient", ["patientId"])
    .index("by_created", ["createdAt"]),

  alerts: defineTable({
    patientId: v.id("patients"),
    careNoteId: v.id("careNotes"),
    message: v.string(),
    urgency,
    channel: v.string(), // "whatsapp" | "sms" | "imessage" | "log"
    sent: v.boolean(),
    detail: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_patient", ["patientId"]),
});
