import OpenAI from "openai";
import type Anthropic from "@anthropic-ai/sdk";
import type { AgentClient } from "../anthropic";

// Adapts OpenAI's chat.completions + function-calling API to the same
// Anthropic-shaped AgentClient interface the mock, Vertex, and direct
// Anthropic clients satisfy — so olaAgent.ts and the three agent routes
// don't need to know which vendor is actually answering.

type Params = Anthropic.MessageCreateParamsNonStreaming;

function systemText(system: Params["system"]): string {
  if (typeof system === "string") return system;
  if (Array.isArray(system)) return system.map((b) => ("text" in b ? b.text : "")).join("\n");
  return "";
}

function toOpenAIMessages(params: Params): OpenAI.Chat.ChatCompletionMessageParam[] {
  const sys = systemText(params.system);
  // Every message content in this codebase is a plain string (see
  // ChatMessage in lib/types.ts) — no need to handle Anthropic content blocks.
  const rest: OpenAI.Chat.ChatCompletionMessageParam[] = params.messages.map((m) => ({
    role: m.role,
    content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
  }));
  return sys ? [{ role: "system", content: sys }, ...rest] : rest;
}

function toOpenAITools(tools: Params["tools"]): OpenAI.Chat.ChatCompletionTool[] | undefined {
  if (!tools || tools.length === 0) return undefined;
  return tools.map((t) => {
    const tool = t as Anthropic.Tool;
    return {
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema as Record<string, unknown>,
      },
    };
  });
}

export function createOpenAIClient(): AgentClient {
  const client = new OpenAI();
  return {
    messages: {
      async create(params: Params): Promise<Anthropic.Message> {
        const completion = await client.chat.completions.create({
          model: params.model,
          max_completion_tokens: params.max_tokens,
          messages: toOpenAIMessages(params),
          tools: toOpenAITools(params.tools),
        });

        const choice = completion.choices[0];
        const content: Array<Record<string, unknown>> = [];

        if (choice.message.content) {
          content.push({ type: "text", text: choice.message.content });
        }
        for (const call of choice.message.tool_calls ?? []) {
          if (call.type !== "function") continue;
          let input: unknown = {};
          try {
            input = JSON.parse(call.function.arguments);
          } catch {
            input = {};
          }
          content.push({ type: "tool_use", id: call.id, name: call.function.name, input });
        }

        return {
          id: completion.id,
          type: "message",
          role: "assistant",
          model: completion.model,
          stop_reason: choice.finish_reason === "tool_calls" ? "tool_use" : "end_turn",
          stop_sequence: null,
          usage: {
            input_tokens: completion.usage?.prompt_tokens ?? 0,
            output_tokens: completion.usage?.completion_tokens ?? 0,
          },
          content,
        } as unknown as Anthropic.Message;
      },
    },
  };
}
