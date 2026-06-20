/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as careNotes from "../careNotes.js";
import type * as lib_alerts from "../lib/alerts.js";
import type * as lib_careNote from "../lib/careNote.js";
import type * as lib_domain from "../lib/domain.js";
import type * as lib_eval from "../lib/eval.js";
import type * as lib_json from "../lib/json.js";
import type * as lib_respan from "../lib/respan.js";
import type * as lib_transcript from "../lib/transcript.js";
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
  "lib/alerts": typeof lib_alerts;
  "lib/careNote": typeof lib_careNote;
  "lib/domain": typeof lib_domain;
  "lib/eval": typeof lib_eval;
  "lib/json": typeof lib_json;
  "lib/respan": typeof lib_respan;
  "lib/transcript": typeof lib_transcript;
  patients: typeof patients;
  photon: typeof photon;
  structure: typeof structure;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
