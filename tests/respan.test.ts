import { describe, it, expect, vi } from "vitest";
import { chatCompletion, DEFAULT_RESPAN_BASE_URL } from "../convex/lib/respan";

function okResponse(content: string) {
  return new Response(
    JSON.stringify({ model: "test-model", choices: [{ message: { content } }] }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

describe("chatCompletion", () => {
  it("posts an OpenAI-compatible request to the Respan gateway", async () => {
    const fetchImpl = vi.fn(async () => okResponse("hi there"));
    const res = await chatCompletion({
      apiKey: "sk-test",
      model: "claude-sonnet-4-6",
      messages: [{ role: "user", content: "yo" }],
      metadata: { feature: "unit-test" },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(res.content).toBe("hi there");
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${DEFAULT_RESPAN_BASE_URL}/chat/completions`);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk-test");

    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("claude-sonnet-4-6");
    expect(body.messages).toHaveLength(1);
    expect(body.metadata.feature).toBe("unit-test");
  });

  it("throws without an api key", async () => {
    await expect(
      chatCompletion({ apiKey: "", model: "m", messages: [] }),
    ).rejects.toThrow(/RESPAN_API_KEY/);
  });

  it("throws on non-ok responses", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 500 }));
    await expect(
      chatCompletion({ apiKey: "k", model: "m", messages: [], fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).rejects.toThrow(/500/);
  });
});
