import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("patients").collect(),
});

export const get = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, { patientId }) => await ctx.db.get(patientId),
});

/** Idempotent demo seed so the dashboard is never empty. */
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("patients").first();
    if (existing) return existing._id;

    const margaret = await ctx.db.insert("patients", {
      name: "Margaret Doe",
      patientType: "senior",
      phone: "+15555550101",
      medications: ["Lisinopril", "Metformin"],
      emergencyContactName: "Sarah (daughter)",
      emergencyContactPhone: "+15555550199",
    });
    await ctx.db.insert("patients", {
      name: "Walter Reed",
      patientType: "senior",
      phone: "+15555550102",
      medications: ["Atorvastatin"],
      emergencyContactName: "James (son)",
      emergencyContactPhone: "+15555550198",
    });
    return margaret;
  },
});
