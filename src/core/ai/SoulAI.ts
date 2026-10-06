/**
 * SoulGraph — SoulAI abstraction (Interpretation layer).
 *
 * Designed in Phase I, built in Phase II. Providers are interchangeable
 * (OpenAI-compatible, Anthropic, local, Nostr-native pay-per-request). The LLM
 * NEVER calculates scores; it only interprets the canonical SoulGraph. Every
 * call returns a typed result PLUS a usage record. See docs/ARCHITECTURE.md §12.
 *
 * Pure TypeScript. No React imports.
 */

import type { SoulGraph } from "@/core/graph/schema";

/** Usage/telemetry record returned with every SoulAI call. */
export interface AIUsage {
  provider: string;
  model: string;
  tokens: number;
  /** Cost in the provider's smallest sensible unit (e.g. sats or USD cents). */
  cost: number;
  /** Latency in milliseconds. */
  latency: number;
  /** Which SoulAI feature produced this usage. */
  feature: SoulAIFeature;
}

export type SoulAIFeature =
  | "chat"
  | "report"
  | "compare"
  | "couple"
  | "team"
  | "organization"
  | "simulate"
  | "decision"
  | "retrieve"
  | "embed"
  | "summarize";

/** Every SoulAI method resolves to a result payload + a usage record. */
export interface AIResult<T> {
  data: T;
  usage: AIUsage;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/** Interpretation always carries an evidence-aware, non-diagnostic framing. */
export interface Interpretation {
  text: string;
  /** Evidence labels the interpretation draws on. */
  evidence: Array<"psychometric" | "interpretive" | "experimental">;
}

/**
 * The SoulAI interface. Implementations are providers; the app depends only on
 * this contract so providers can be swapped freely.
 */
export interface SoulAI {
  readonly provider: string;
  readonly model: string;

  chat(graph: SoulGraph, messages: ChatMessage[]): Promise<AIResult<ChatMessage>>;
  report(graph: SoulGraph): Promise<AIResult<Interpretation>>;
  compare(a: SoulGraph, b: SoulGraph): Promise<AIResult<Interpretation>>;
  couple(a: SoulGraph, b: SoulGraph): Promise<AIResult<Interpretation>>;
  team(graphs: SoulGraph[]): Promise<AIResult<Interpretation>>;
  organization(graphs: SoulGraph[]): Promise<AIResult<Interpretation>>;
  simulate(graph: SoulGraph, scenario: string): Promise<AIResult<Interpretation>>;
  decision(graph: SoulGraph, question: string): Promise<AIResult<Interpretation>>;
  retrieve(graph: SoulGraph, query: string): Promise<AIResult<string[]>>;
  embed(text: string): Promise<AIResult<number[]>>;
  summarize(text: string): Promise<AIResult<string>>;
}
