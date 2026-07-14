import { describe, expect, it, vi } from "vitest";

// Intercepts the OpenAI SDK so we can assert the request translation and
// feed back a canned response, without needing a real OPENAI_API_KEY or
// network access.
const createMock = vi.fn();
vi.mock("openai", () => ({
  default: class {
    chat = { completions: { create: createMock } };
  },
}));

const { createOpenAIClient } = await import("@/lib/providers/openai");

describe("openai provider adapter", () => {
  it("translates an Anthropic-shaped request into OpenAI chat.completions params", async () => {
    createMock.mockResolvedValueOnce({
      id: "chatcmpl_1",
      model: "gpt-4.1",
      usage: { prompt_tokens: 10, completion_tokens: 5 },
      choices: [{ finish_reason: "stop", message: { role: "assistant", content: "Hej!", tool_calls: [] } }],
    });

    const client = createOpenAIClient();
    await client.messages.create({
      model: "gpt-4.1",
      max_tokens: 400,
      system: "You are Ola.",
      tools: [
        {
          name: "book_appointment",
          description: "Book it",
          input_schema: { type: "object", properties: { slot: { type: "string" } }, required: ["slot"] },
        },
      ],
      messages: [{ role: "user", content: "Cześć" }],
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4.1",
        max_completion_tokens: 400,
        messages: [
          { role: "system", content: "You are Ola." },
          { role: "user", content: "Cześć" },
        ],
        tools: [
          expect.objectContaining({
            type: "function",
            function: expect.objectContaining({ name: "book_appointment" }),
          }),
        ],
      }),
    );
  });

  it("maps a plain-text finish into a text content block with end_turn", async () => {
    createMock.mockResolvedValueOnce({
      id: "chatcmpl_2",
      model: "gpt-4.1",
      usage: { prompt_tokens: 1, completion_tokens: 1 },
      choices: [{ finish_reason: "stop", message: { role: "assistant", content: "Dzień dobry", tool_calls: [] } }],
    });

    const client = createOpenAIClient();
    const res = await client.messages.create({
      model: "gpt-4.1",
      max_tokens: 100,
      system: "sys",
      messages: [{ role: "user", content: "hi" }],
    });

    expect(res.stop_reason).toBe("end_turn");
    expect(res.content).toEqual([{ type: "text", text: "Dzień dobry" }]);
  });

  it("maps a tool_calls finish into a tool_use content block with parsed input", async () => {
    createMock.mockResolvedValueOnce({
      id: "chatcmpl_3",
      model: "gpt-4.1",
      usage: { prompt_tokens: 1, completion_tokens: 1 },
      choices: [
        {
          finish_reason: "tool_calls",
          message: {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: "call_1",
                type: "function",
                function: { name: "book_appointment", arguments: '{"slot":"jutro · 9:00"}' },
              },
            ],
          },
        },
      ],
    });

    const client = createOpenAIClient();
    const res = await client.messages.create({
      model: "gpt-4.1",
      max_tokens: 100,
      system: "sys",
      messages: [{ role: "user", content: "hi" }],
    });

    expect(res.stop_reason).toBe("tool_use");
    expect(res.content).toEqual([
      { type: "tool_use", id: "call_1", name: "book_appointment", input: { slot: "jutro · 9:00" } },
    ]);
  });
});
