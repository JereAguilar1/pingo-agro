import { describe, expect, it, vi } from "vitest";
import { runOrchestratorAgent } from "../agents/orchestrator-agent";
import { calculatePolygonHectares, DEFAULT_PRODUCER_LOTES } from "../local-knowledge";

describe("Agente Orquestador Multi-Agente Online, Lotes como Proyectos y Formularios Dinámicos", () => {
  it("calcula correctamente la superficie en hectáreas a partir de un polígono satelital", () => {
    const lote1 = DEFAULT_PRODUCER_LOTES[0];
    expect(lote1.polygon).toBeDefined();
    const ha = calculatePolygonHectares(lote1.polygon!);
    expect(ha).toBeGreaterThan(20);
    expect(ha).toBeLessThan(80);
  });

  it("responde con certeza sobre qué se le echó previamente al lote y evalúa carry-over/rotación", async () => {
    const loteTandil = DEFAULT_PRODUCER_LOTES[0];
    const res = await runOrchestratorAgent({
      question: "¿Qué se le echó previamente a este lote en barbecho y qué cuidados de residualidad o rotación debo tener?",
      activeLote: loteTandil,
    });

    expect(res.kind).toBe("grounded_answer");
    expect(res.answer).toContain("Gesaprim 90 WG");
    expect(res.answer).toContain("Atrazina");
    expect(res.answer).toContain("Grupo C1");
    expect(res.sources.length).toBeGreaterThan(0);
  });

  it("calcula directamente la fertilización sin pedir formulario cuando el Lote Proyecto ya tiene suelo y rinde cargados", async () => {
    const loteTandil = DEFAULT_PRODUCER_LOTES[0];
    const res = await runOrchestratorAgent({
      question: "¿Cómo determino la estrategia de fertilización y dosis para este lote?",
      activeLote: loteTandil,
    });

    expect(res.kind).toBe("calculation");
    expect(res.calculation).toBeDefined();
    expect(res.answer).toContain("Lote 4 — La Loma");
    expect(res.sources.length).toBeGreaterThan(0);
  });

  it("ejecuta un ciclo multi-ronda de formulario dinámico hasta completar el contexto y calcular", async () => {
    // Ronda 0: Pregunta inicial sin contexto completo
    const q = "¿Cómo determino la estrategia de fertilización y dosis para este lote?";
    const r0 = await runOrchestratorAgent({ question: q });

    expect(r0.kind).toBe("insufficient_info");
    expect(r0.clarificationForm).toBeDefined();
    expect(r0.clarificationForm?.round).toBe(1);
    expect(r0.clarificationForm?.originalQuestion).toBe(q);

    // Ronda 1: El usuario envía cultivo=Maíz y rindeObjetivo=10, pero deja vacío el análisis de suelo
    const r1 = await runOrchestratorAgent({
      question: "Cultivo: Maíz, Rinde: 10",
      form: {
        kind: "fertilization_strategy",
        round: 1,
        originalQuestion: q,
        data: {
          cultivo: "Maíz",
          rindeObjetivo: "10",
          analisisSuelo: "",
        },
      },
    });

    // El Orquestador detecta que falta N en suelo para el Sub-Agente de Cálculo y lanza Ronda 2 dinámica
    expect(r1.kind).toBe("insufficient_info");
    expect(r1.clarificationForm?.kind).toBe("dynamic_context");
    expect(r1.clarificationForm?.round).toBe(2);
    expect(r1.clarificationForm?.fields.map((f) => f.id)).toContain("nSuelo");

    // Ronda 2: El usuario completa el dato faltante (nSuelo = 66)
    const r2 = await runOrchestratorAgent({
      question: "N en suelo: 66",
      form: {
        kind: "dynamic_context",
        round: 2,
        originalQuestion: q,
        accumulatedData: r1.clarificationForm?.accumulatedData,
        data: {
          nSuelo: "66",
          pBray: "14",
        },
      },
    });

    // Ahora el contexto está completo: el Orquestador invoca CalcSubAgent + DocsSubAgent + VerifierAgent
    expect(r2.kind).toBe("calculation");
    expect(r2.calculation).toBeDefined();
    expect(r2.answer).toContain("334.8");
    expect(r2.sources.length).toBeGreaterThan(0);
    expect(r2.agentsUsed).toEqual(expect.arrayContaining(["docs", "calc", "verifier"]));
  });

  it("consulta el Sub-Agente Documental sobre documentos propios cargados por el usuario", async () => {
    const res = await runOrchestratorAgent({
      question: "¿Qué dice el documento cargado sobre la densidad recomendada en el Lote Norte?",
      uploadedDocs: [
        {
          id: "doc-1",
          title: "Informe_Tecnico_Lote_Norte.txt",
          content:
            "En el Lote Norte de Tandil se recomienda una densidad de 64.000 plantas/ha de maíz tardío con fertilización arrancadora de 90 kg/ha de MAP.",
          uploadedAt: "2026-10-28",
        },
      ],
    });

    expect(res.kind).toBe("grounded_answer");
    expect(res.sources.map((s) => s.sourceCode)).toContain("U01");
    expect(res.answer).toContain("64.000 plantas/ha");
    expect(res.agentsUsed).toContain("docs");
  });

  it("invoca al Sub-Agente de Internet cuando se consulta por pronóstico o precios en línea", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ query: { search: [] } }),
    });

    const res = await runOrchestratorAgent({
      question: "Necesito buscar en internet el pronóstico y alertas del SMN para hoy en Tandil",
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    expect(res.sources.map((s) => s.sourceCode)).toContain("WEB-SMN");
    expect(res.agentsUsed).toContain("web");
  });
});
