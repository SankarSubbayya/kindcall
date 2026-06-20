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

const DEMO_PATIENTS = [
  {
    name: "Margaret Doe",
    patientType: "senior",
    phone: "+14084315433",
    medications: ["Lisinopril", "Metformin"],
    emergencyContactName: "Sarah (daughter)",
    emergencyContactPhone: "(408) 431-5433",
  },
  {
    name: "Walter Reed",
    patientType: "senior",
    phone: "+14084315433",
    medications: ["Atorvastatin"],
    emergencyContactName: "James (son)",
    emergencyContactPhone: "(408) 431-5433",
  },
];

/** Idempotent demo seed so the dashboard is never empty. */
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("patients").first();
    if (existing) return existing._id;
    let first = null;
    for (const p of DEMO_PATIENTS) {
      const id = await ctx.db.insert("patients", p);
      first = first ?? id;
    }
    return first;
  },
});

/** Wipe demo data and re-seed (used to refresh contacts before a demo). */
export const resetDemo = mutation({
  args: {},
  handler: async (ctx) => {
    for (const table of ["alerts", "careNotes", "patients"] as const) {
      for (const row of await ctx.db.query(table).collect()) {
        await ctx.db.delete(row._id);
      }
    }
    let first = null;
    for (const p of DEMO_PATIENTS) {
      const id = await ctx.db.insert("patients", p);
      first = first ?? id;
    }
    return first;
  },
});
