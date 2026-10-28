import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai-provider", () => ({
  isAiConfigured: () => false,
  completeWithAi: vi.fn(),
}));

import { respond } from "@/lib/respond";

describe("respond — cálculos", () => {
  it("calcula el contenido de N en urea y lo marca como cálculo, no recomendación", async () => {
    const r = await respond("¿Cuánto nitrógeno contienen 100 kg de urea al 46 %?");
    expect(r.kind).toBe("calculation");
    expect(r.calculation?.resultSummary).toContain("46");
    expect(r.warnings.join(" ")).toMatch(/no.*recomendaci/i);
  });

  it("calcula la cantidad de producto a partir de una dosis", async () => {
    const r = await respond("Con 60 kg de N/ha, urea al 46 % y 12 ha, ¿cuánto producto necesito?");
    expect(r.kind).toBe("calculation");
    expect(r.calculation?.resultSummary).toContain("1565.22");
  });
});

describe("respond — información insuficiente", () => {
  it("pide datos ante una pregunta de autorización de fitosanitario sin producto identificado", async () => {
    const r = await respond("¿Está autorizado este herbicida para mi cultivo?");
    expect(r.kind).toBe("insufficient_info");
    expect(r.sources.length).toBeGreaterThan(0);
    expect(r.followUpQuestions?.length).toBeGreaterThan(0);
  });

  it("no inventa un precio actual de cereales", async () => {
    const r = await respond("¿Cuál es el precio actual de la soja hoy?");
    expect(r.kind).toBe("insufficient_info");
    expect(r.answer).not.toMatch(/\$\s*\d/);
  });

  it("pide contexto ante una pregunta genérica de muestreo de suelo", async () => {
    const r = await respond("¿Cómo debería planificar un muestreo de suelo?");
    expect(r.kind).toBe("insufficient_info");
    expect(r.followUpQuestions?.length).toBeGreaterThan(0);
  });
});

describe("respond — sin evidencia", () => {
  it("no genera fuentes inventadas cuando no hay evidencia en la biblioteca", async () => {
    const r = await respond("¿Cuál es la capital de Mongolia?");
    expect(r.kind).toBe("no_evidence");
    expect(r.sources.length).toBe(0);
  });
});

describe("respond — respuesta con fuentes reales", () => {
  it("responde sobre normativa de agroquímicos en Tandil citando fuentes verificadas", async () => {
    const r = await respond("¿Qué normativa de Tandil regula el manejo de agroquímicos?");
    expect(r.kind).toBe("grounded_answer");
    expect(r.sources.length).toBeGreaterThan(0);
    expect(r.sources.every((s) => s.verification === "verified")).toBe(true);
  });
});
