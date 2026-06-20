/* eslint-disable */
import type * as careNotes from "../careNotes.js";
import type * as patients from "../patients.js";
import type * as photon from "../photon.js";
import type * as structure from "../structure.js";
import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  careNotes: typeof careNotes;
  patients: typeof patients;
  photon: typeof photon;
  structure: typeof structure;
}>;

export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;
