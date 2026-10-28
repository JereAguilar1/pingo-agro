import { AssistantResponse, FormSubmission } from "./types";
import { respond } from "./respond";

export interface ResolveChatOptions {
  question?: string;
  form?: FormSubmission;
  preferOffline?: boolean;
  fetchFn?: typeof fetch;
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

/**
 * Resolves a chat query using network /api/chat when available,
 * falling back transparently to in-memory respond() when offline
 * or when fetch fails.
 */
export async function resolveChatQuery(
  options: ResolveChatOptions
): Promise<ResolveChatResult> {
  const { question = "", form, preferOffline = false, fetchFn } = options;
  const safeQuestion = question.trim();
  const effectiveFetch = fetchFn ?? (typeof fetch !== "undefined" ? fetch : undefined);

  // If explicitly offline, browser is known offline, or no fetch available, resolve in-memory
  if (preferOffline || isBrowserOffline() || !effectiveFetch) {
    const memoryResponse = await respond(safeQuestion, form);
    return {
      response: memoryResponse,
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
    // Fallback to in-memory resolution so user is not blocked
    const memoryFallback = await respond(safeQuestion, form);
    return {
      response: memoryFallback,
      source: "offline",
      aiConfigured: false,
    };
  } catch {
    // Network failure (no connection, DNS error, timeout, CORS error in mobile container)
    // Fallback seamlessly to local in-memory respond()
    const memoryFallback = await respond(safeQuestion, form);
    return {
      response: memoryFallback,
      source: "offline",
      aiConfigured: false,
    };
  }
}
