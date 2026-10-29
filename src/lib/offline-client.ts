import {
  AssistantResponse,
  FormSubmission,
  ProducerLote,
  SourceCardData,
  UploadedDocument,
} from "./types";
import { respond } from "./respond";
import { getLocalLLMStatus, generateLocalGroundedResponse } from "./local-llm";
import { LIBRARY, SourceFragment } from "./library";
import { retrieve } from "./retrieval";
import { runStep4VerifierAndBuildTrace } from "./pipeline/orchestrator";
import { runOrchestratorAgent } from "./agents/orchestrator-agent";

export type LocalGeneratorFn = (params: {
  question: string;
  sources: SourceCardData[];
  onToken?: (text: string) => void;
}) => Promise<string | null>;

export interface ResolveChatOptions {
  question?: string;
  form?: FormSubmission;
  activeLote?: ProducerLote | null;
  uploadedDocs?: UploadedDocument[];
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
  onToken?: (text: string) => void,
  activeLote?: ProducerLote | null
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
      let finalSources = res.sources;
      if (!finalSources || finalSources.length === 0) {
        const retrieved = retrieve(question, 4);
        finalSources = retrieved.map((r) => ({
          sourceCode: r.fragment.sourceCode,
          institution: r.fragment.institution,
          title: r.fragment.title,
          date: r.fragment.date,
          accessedOn: r.fragment.accessedOn,
          section: r.fragment.section,
          page: r.fragment.page,
          exactPassage: r.fragment.exactPassage,
          url: r.fragment.url,
          verification: r.fragment.verification,
          supports: r.fragment.text,
        }));
      }

      const generated = await generator({ question, sources: finalSources, onToken });
      if (generated) {
        const drafted: AssistantResponse = {
          ...res,
          answer: generated,
          mode: "ai",
          kind: finalSources.length > 0 ? "grounded_answer" : (res.kind === "no_evidence" ? "general" : res.kind),
          sources: finalSources,
        };
        return runStep4VerifierAndBuildTrace({
          question,
          response: drafted,
          activeLote,
          draftEngine: "local_slm",
        });
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
        const retrieved = retrieve(question, 4);
        relevantSnippets = retrieved.map((r) => r.fragment);
      }

      const generated = await generateLocalGroundedResponse({
        question,
        snippets: relevantSnippets,
        onToken,
      });

      if (generated) {
        const finalSources =
          res.sources && res.sources.length > 0
            ? res.sources
            : relevantSnippets.map((s) => ({
                sourceCode: s.sourceCode,
                institution: s.institution,
                title: s.title,
                date: s.date,
                accessedOn: s.accessedOn,
                section: s.section,
                page: s.page,
                exactPassage: s.exactPassage,
                url: s.url,
                verification: s.verification,
                supports: s.text,
              }));

        const finalWarnings =
          res.warnings && res.warnings.length > 0
            ? res.warnings
            : relevantSnippets
                .map((s) => s.limitation)
                .filter((v, i, arr) => Boolean(v) && arr.indexOf(v) === i);

        const drafted: AssistantResponse = {
          ...res,
          answer: generated,
          mode: "ai",
          kind: finalSources.length > 0 ? "grounded_answer" : (res.kind === "no_evidence" ? "general" : res.kind),
          sources: finalSources,
          warnings: finalWarnings,
        };

        return runStep4VerifierAndBuildTrace({
          question,
          response: drafted,
          activeLote,
          draftEngine: "local_slm",
        });
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
  const {
    question = "",
    form,
    activeLote,
    uploadedDocs,
    preferOffline = false,
    fetchFn,
    localGeneratorFn,
    onToken,
  } = options;
  const safeQuestion = question.trim();
  const effectiveFetch = fetchFn ?? (typeof fetch !== "undefined" ? fetch : undefined);

  const hasLocalLLM =
    (typeof window !== "undefined" && getLocalLLMStatus().status === "ready") ||
    Boolean(localGeneratorFn);

  async function resolveLocally(): Promise<AssistantResponse> {
    if ((uploadedDocs && uploadedDocs.length > 0) || form?.kind === "dynamic_context" || (form?.round && form.round >= 1)) {
      return runOrchestratorAgent({
        question: safeQuestion,
        form,
        activeLote,
        uploadedDocs,
      });
    }
    return respond(safeQuestion, form, activeLote);
  }

  // If user has local SLM active in memory, or if offline is preferred/detected, or activeLote is used:
  // resolve directly via local engine
  if (preferOffline || isBrowserOffline() || !effectiveFetch || hasLocalLLM || Boolean(activeLote)) {
    const rawMemoryResponse = await resolveLocally();
    const enhanced = await enhanceWithLocalLLM(
      rawMemoryResponse,
      safeQuestion,
      localGeneratorFn,
      onToken,
      activeLote
    );
    return {
      response: enhanced,
      source: "offline",
      aiConfigured: enhanced.mode === "ai",
    };
  }

  // Attempt network call to Online Orchestrator Agent (/api/chat)
  try {
    const res = await effectiveFetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: safeQuestion, form, activeLote, uploadedDocs }),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        response: AssistantResponse;
        aiConfigured?: boolean;
      };
      if (data?.response) {
        // If server answered in demo mode and client has local LLM, enhance it!
        if (data.response.mode === "demo" && hasLocalLLM) {
          const enhanced = await enhanceWithLocalLLM(
            data.response,
            safeQuestion,
            localGeneratorFn,
            onToken,
            activeLote
          );
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
    const memoryFallback = await resolveLocally();
    const enhanced = await enhanceWithLocalLLM(
      memoryFallback,
      safeQuestion,
      localGeneratorFn,
      onToken,
      activeLote
    );
    return {
      response: enhanced,
      source: "offline",
      aiConfigured: false,
    };
  } catch {
    // Network failure -> Fallback seamlessly to local in-memory resolution
    const memoryFallback = await resolveLocally();
    const enhanced = await enhanceWithLocalLLM(
      memoryFallback,
      safeQuestion,
      localGeneratorFn,
      onToken,
      activeLote
    );
    return {
      response: enhanced,
      source: "offline",
      aiConfigured: false,
    };
  }
}
