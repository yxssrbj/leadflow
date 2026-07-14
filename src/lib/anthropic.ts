import Anthropic from "@anthropic-ai/sdk";
import { createMockClient } from "./mock";
import { createOpenAIClient } from "./providers/openai";

export const MODEL = "claude-sonnet-5";
const OPENAI_MODEL = "gpt-4.1";

// Where agent replies come from. Switch with AGENT_PROVIDER in web/.env.local:
//   mock     — scripted Polish replies, no credentials, no cost (test the flow)
//   vertex   — real Claude via Google Vertex AI (free trial credits, gcloud auth)
//   anthropic— real Claude via an Anthropic API key
//   openai   — real GPT via an OpenAI API key
// If AGENT_PROVIDER is unset, we use Anthropic when a key is present, else mock.
export type AgentProvider = "mock" | "vertex" | "anthropic" | "openai";

export function activeProvider(): AgentProvider {
  const p = (process.env.AGENT_PROVIDER || "").toLowerCase();
  if (p === "mock" || p === "vertex" || p === "anthropic" || p === "openai") return p;
  return process.env.ANTHROPIC_API_KEY ? "anthropic" : "mock";
}

// Model to fall back to when a BusinessConfig doesn't override one for the
// active provider — vendors don't share model names, so MODEL alone
// (Anthropic's) would be wrong once AGENT_PROVIDER=openai.
export function defaultModel(): string {
  return activeProvider() === "openai" ? OPENAI_MODEL : MODEL;
}

// The minimal slice of the Anthropic client the agent routes actually use.
// Real Anthropic, real Vertex, and the mock all satisfy it.
export interface AgentClient {
  messages: {
    create(params: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message>;
  };
}

export async function getClient(): Promise<AgentClient | null> {
  const provider = activeProvider();

  if (provider === "mock") {
    console.log("[agents] provider=mock (scripted replies — set AGENT_PROVIDER=vertex|anthropic for real Claude)");
    return createMockClient();
  }

  if (provider === "vertex") {
    try {
      const { AnthropicVertex } = await import("@anthropic-ai/vertex-sdk");
      const region = process.env.CLOUD_ML_REGION || process.env.ANTHROPIC_VERTEX_REGION || "global";
      const projectId =
        process.env.ANTHROPIC_VERTEX_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
      console.log(`[agents] provider=vertex (project=${projectId ?? "?"}, region=${region})`);
      return new AnthropicVertex({ region, projectId }) as unknown as AgentClient;
    } catch (err) {
      console.error("[agents] Vertex client failed to start:", err);
      return null;
    }
  }

  if (provider === "openai") {
    if (!process.env.OPENAI_API_KEY) return null;
    console.log("[agents] provider=openai");
    return createOpenAIClient();
  }

  if (!process.env.ANTHROPIC_API_KEY) return null;
  console.log("[agents] provider=anthropic");
  return new Anthropic() as unknown as AgentClient;
}

// Provider-appropriate message shown in the chat when no client is available.
export function clientError(): string {
  if (activeProvider() === "vertex") {
    return "Vertex is selected but the client couldn't start. Run `gcloud auth application-default login`, set ANTHROPIC_VERTEX_PROJECT_ID (and CLOUD_ML_REGION) in web/.env.local, and restart the dev server.";
  }
  if (activeProvider() === "openai") {
    return "The server is missing OPENAI_API_KEY. Add it to web/.env.local (see .env.local.example) and restart the dev server — or set AGENT_PROVIDER=mock to test without a key.";
  }
  return "The server is missing ANTHROPIC_API_KEY. Add it to web/.env.local (see .env.local.example) and restart the dev server — or set AGENT_PROVIDER=mock to test without a key.";
}

// Kept for backwards compatibility with any existing imports.
export const MISSING_KEY_ERROR = clientError();
