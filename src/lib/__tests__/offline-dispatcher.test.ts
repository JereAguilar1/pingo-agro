import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveChatQuery } from "../offline-client";

describe("Offline Client Dispatcher", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves via network when online and fetch succeeds", async () => {
    const mockResponseData = {
      response: {
        kind: "grounded_answer",
        answer: "Respuesta desde la API del servidor",
        sources: [],
        warnings: [],
        mode: "demo",
      },
      aiConfigured: false,
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponseData,
    });

    const result = await resolveChatQuery({
      question: "Qué hago con Conyza",
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    expect(result.source).toBe("network");
    expect(result.response.answer).toBe("Respuesta desde la API del servidor");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("transparently falls back to in-memory respond() when fetch throws a network error", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Failed to fetch"));

    const result = await resolveChatQuery({
      question: "¿Está autorizado este herbicida para mi cultivo?",
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    expect(result.source).toBe("offline");
    expect(result.response.kind).toBe("insufficient_info");
    expect(result.response.sources.length).toBeGreaterThan(0);
    expect(result.response.followUpQuestions?.length).toBeGreaterThan(0);
  });

  it("transparently falls back to in-memory respond() when preferOffline is true", async () => {
    const mockFetch = vi.fn();

    const result = await resolveChatQuery({
      question: "Tengo una maleza que me está complicando el lote. ¿Qué estrategias de manejo puedo comparar para esta campaña y la siguiente?",
      preferOffline: true,
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    expect(result.source).toBe("offline");
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.response.clarificationForm?.kind).toBe("weed_management");
  });

  it("resolves form submissions locally in memory when offline", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network offline"));

    const result = await resolveChatQuery({
      form: {
        kind: "weed_management",
        data: {
          especie: "Conyza bonariensis",
          cultivo: "Soja",
        },
      },
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    expect(result.source).toBe("offline");
    expect(result.response.kind).toBe("grounded_answer");
    expect(result.response.sources.map((s) => s.sourceCode)).toContain("R08");
  });

  it("enhances grounded responses with local LLM generator when available", async () => {
    const mockLocalGenerator = vi.fn().mockResolvedValue(
      "Respuesta local generada por Llama 3.2 1B basada en los fragmentos."
    );

    const result = await resolveChatQuery({
      question: "Qué dice la REM sobre Conyza y glifosato",
      preferOffline: true,
      localGeneratorFn: mockLocalGenerator,
    });

    expect(result.source).toBe("offline");
    expect(mockLocalGenerator).toHaveBeenCalledTimes(1);
    expect(result.response.answer).toBe(
      "Respuesta local generada por Llama 3.2 1B basada en los fragmentos."
    );
    expect(result.response.mode).toBe("ai");
  });

  it("answers meta / conversational queries using local LLM instead of falling back to no_evidence", async () => {
    const mockLocalGenerator = vi.fn().mockResolvedValue(
      "Sí, estoy funcionando con el modelo SLM Llama 3.2 1B ejecutándose localmente en tu dispositivo."
    );

    const result = await resolveChatQuery({
      question: "se esta usando un slm?",
      localGeneratorFn: mockLocalGenerator,
    });

    expect(result.source).toBe("offline");
    expect(mockLocalGenerator).toHaveBeenCalledTimes(1);
    expect(result.response.answer).toContain("Llama 3.2 1B");
    expect(result.response.mode).toBe("ai");
  });
});
