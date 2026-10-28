import { AssistantResponse, FormSubmission, SourceCardData } from "./types";
import { respond } from "./respond";
import { getLocalLLMStatus, generateLocalGroundedResponse } from "./local-llm";
import { LIBRARY } from "./library";

export type LocalGeneratorFn = (params: {
  question: string;
  sources: SourceCardData[];
  onToken?: (text: string) => void;
}) => Promise<string | null>;

export interface ResolveChatOptions {
  question?: string;
  form?: FormSubmission;
  preferOffline?: boolean;
  fetchFn?: typeof fetch;
  localGeneratorFn?: LocalGeneratorFn;
  onToken?: (text: string) => void;
}

export interface ResolveChatResult {
  response: AssistantResponse;
  source: "network" | "offline";
  aiConfigured?: boolean;
}

/**
 * Checks whether the client environment indicates offline status.
 */
export function isBrowserOffline(): boolean {
  if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
    return !navigator.onLine;
  }
  return false;
}

async function enhanceWithLocalLLM(
  res: AssistantResponse,
  question: string,
  generator?: LocalGeneratorFn,
  onToken?: (text: string) => void
): Promise<AssistantResponse> {
  // Only enhance grounded answers with sources (preserve calculations & forms deterministically)
  if (res.kind !== "grounded_answer" || res.sources.length === 0) {
    return res;
  }

  // 1. If explicit generator provided (e.g. in tests)
  if (generator) {
    try {
      const generated = await generator({ question, sources: res.sources, onToken });
      if (generated) {
        return { ...res, answer: generated, mode: "ai" };
      }
    } catch {
      return res;
    }
  }

  // 2. If browser environment with WebLLM ready in memory
  if (typeof window !== "undefined" && getLocalLLMStatus().status === "ready") {
    try {
      // Map sources back to library snippets
      const sourceCodes = new Set(res.sources.map((s) => s.sourceCode));
      const relevantSnippets = LIBRARY.filter((item) => sourceCodes.has(item.sourceCode));

      const generated = await generateLocalGroundedResponse({
        question,
        snippets: relevantSnippets,
        onToken,
      });

      if (generated) {
        return { ...res, answer: generated, mode: "ai" };
      }
    } catch (err) {
      console.debug("Error generating on-device response:", err);
    }
  }

  return res;
}

/**
 * Resolves a chat query using network /api/chat when available,
 * falling back transparently to in-memory respond() when offline
 * or when fetch fails.
 */
export async function resolveChatQuery(
  options: ResolveChatOptions
): Promise<ResolveChatResult> {
  const { question = "", form, preferOffline = false, fetchFn, localGeneratorFn, onToken } = options;
  const safeQuestion = question.trim();
  const effectiveFetch = fetchFn ?? (typeof fetch !== "undefined" ? fetch : undefined);

  // If explicitly offline, browser is known offline, or no fetch available, resolve in-memory
  if (preferOffline || isBrowserOffline() || !effectiveFetch) {
    const rawMemoryResponse = await respond(safeQuestion, form);
    const enhanced = await enhanceWithLocalLLM(rawMemoryResponse, safeQuestion, localGeneratorFn, onToken);
    return {
      response: enhanced,
      source: "offline",
      aiConfigured: false,
    };
  }

  // Attempt network call
  try {
    const res = await effectiveFetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: safeQuestion, form }),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        response: AssistantResponse;
        aiConfigured?: boolean;
      };
      if (data?.response) {
        return {
          response: data.response,
          source: "network",
          aiConfigured: Boolean(data.aiConfigured),
        };
      }
    }

    // Server returned a non-OK status or malformed JSON (e.g. 500, 502, 503)
    // Fallback to in-memory resolution with local LLM if ready
    const memoryFallback = await respond(safeQuestion, form);
    const enhanced = await enhanceWithLocalLLM(memoryFallback, safeQuestion, localGeneratorFn, onToken);
    return {
      response: enhanced,
      source: "offline",
      aiConfigured: false,
    };
  } catch {
    // Network failure (no connection, DNS error, timeout, CORS error in mobile container)
    // Fallback seamlessly to local in-memory respond()
    const memoryFallback = await respond(safeQuestion, form);
    const enhanced = await enhanceWithLocalLLM(memoryFallback, safeQuestion, localGeneratorFn, onToken);
    return {
      response: enhanced,
      source: "offline",
      aiConfigured: false,
    };
  }
}
