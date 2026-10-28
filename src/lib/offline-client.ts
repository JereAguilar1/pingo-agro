import { AssistantResponse, FormSubmission, SourceCardData } from "./types";
import { respond } from "./respond";
import { getLocalLLMStatus, generateLocalGroundedResponse } from "./local-llm";
import { LIBRARY, SourceFragment } from "./library";
import { retrieve } from "./retrieval";

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
  // Preserve exact mathematical calculations deterministically
  if (res.kind === "calculation") {
    return res;
  }

  const hasLocal = typeof window !== "undefined" && getLocalLLMStatus().status === "ready";

  if (!generator && !hasLocal) {
    return res;
  }

  // 1. If explicit generator provided (e.g. in tests)
  if (generator) {
    try {
      const generated = await generator({ question, sources: res.sources, onToken });
      if (generated) {
        return {
          ...res,
          answer: generated,
          mode: "ai",
          kind: res.kind === "no_evidence" ? "general" : res.kind,
        };
      }
    } catch {
      return res;
    }
  }

  // 2. If browser environment with WebLLM ready in memory
  if (hasLocal) {
    try {
      let relevantSnippets: SourceFragment[] = [];
      if (res.sources && res.sources.length > 0) {
        const sourceCodes = new Set(res.sources.map((s) => s.sourceCode));
        relevantSnippets = LIBRARY.filter((item) => sourceCodes.has(item.sourceCode));
      } else {
        const retrieved = retrieve(question, 3);
        relevantSnippets = retrieved.map((r) => r.fragment);
      }

      const generated = await generateLocalGroundedResponse({
        question,
        snippets: relevantSnippets,
        onToken,
      });

      if (generated) {
        return {
          ...res,
          answer: generated,
          mode: "ai",
          kind: res.kind === "no_evidence" ? "general" : res.kind,
        };
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

  const hasLocalLLM =
    (typeof window !== "undefined" && getLocalLLMStatus().status === "ready") ||
    Boolean(localGeneratorFn);

  // If user has local SLM active in memory, or if offline is preferred/detected:
  // resolve directly via local engine
  if (preferOffline || isBrowserOffline() || !effectiveFetch || hasLocalLLM) {
    const rawMemoryResponse = await respond(safeQuestion, form);
    const enhanced = await enhanceWithLocalLLM(rawMemoryResponse, safeQuestion, localGeneratorFn, onToken);
    return {
      response: enhanced,
      source: "offline",
      aiConfigured: enhanced.mode === "ai",
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
        // If server answered in demo mode and client has local LLM, enhance it!
        if (data.response.mode === "demo" && hasLocalLLM) {
          const enhanced = await enhanceWithLocalLLM(data.response, safeQuestion, localGeneratorFn, onToken);
          return {
            response: enhanced,
            source: "offline",
            aiConfigured: enhanced.mode === "ai",
          };
        }

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
