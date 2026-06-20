import { describe, it, expect } from "vitest";
import { normalizeTranscript, stripFillers } from "../convex/lib/transcript";

describe("stripFillers", () => {
  it("removes standalone filler words and phrases", () => {
    const out = stripFillers("you know she was uh bored");
    expect(out).not.toMatch(/\byou know\b/);
    expect(out).not.toMatch(/\buh\b/);
    expect(out).toMatch(/bored/);
  });

  it("does not chop fillers inside real words", () => {
    expect(stripFillers("she likes umbrellas")).toContain("umbrellas");
    expect(stripFillers("she likes umbrellas")).toContain("likes");
  });
});

describe("normalizeTranscript", () => {
  it("collapses whitespace and capitalizes", () => {
    expect(normalizeTranscript("she   took    her medication")).toBe("She took her medication");
  });

  it("strips fillers and cleans up", () => {
    expect(normalizeTranscript("uh she is uh doing okay")).toBe("She is doing okay");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeTranscript("")).toBe("");
  });
});
