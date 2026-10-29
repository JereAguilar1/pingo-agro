import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isWebGPUSupported,
  formatGroundingPrompt,
  DEFAULT_MODEL_ID,
} from "../local-llm";
import { SourceFragment } from "../library";

describe("Local LLM Service", () => {
  it("exposes the recommended default model id", () => {
    expect(DEFAULT_MODEL_ID).toContain("Llama-3.2-1B-Instruct");
  });

  describe("isWebGPUSupported", () => {
    it("returns false when navigator.gpu is undefined (Node/SSR/old mobile)", () => {
      expect(isWebGPUSupported({} as unknown as Navigator)).toBe(false);
    });

    it("returns true when navigator.gpu is present", () => {
      const mockNav = { gpu: {} } as unknown as Navigator;
      expect(isWebGPUSupported(mockNav)).toBe(true);
    });
  });

  describe("formatGroundingPrompt", () => {
    const mockSnippets: SourceFragment[] = [
      {
        id: "mock-r08",
        sourceCode: "R08",
        institution: "Aapresid REM",
        title: "Alerta de biotipos resistentes",
        date: "2024-05",
        url: "https://www.aapresid.org.ar/rem",
        verification: "verified",
        section: "Biotipos",
        limitation: "Solo informa resistencias confirmadas; no reemplaza diagnóstico a campo.",
        topics: ["maleza", "resistencia"],
        text: "Conyza bonariensis presenta resistencia comprobada a glifosato y a inhibidores de ALS en la zona sur de Buenos Aires.",
      },
    ];

    it("constructs a zero-hallucination system prompt referencing the strict limits", () => {
      const { systemPrompt, userPrompt } = formatGroundingPrompt({
        question: "¿Qué resistencia tiene Conyza?",
        snippets: mockSnippets,
      });

      expect(systemPrompt).toContain("Pingo");
      expect(systemPrompt).toMatch(/nunca inventes|no inventes/i);
      expect(systemPrompt).toMatch(/solo responde usando/i);
      expect(userPrompt).toContain("Conyza bonariensis");
      expect(userPrompt).toContain("R08");
      expect(userPrompt).toContain("¿Qué resistencia tiene Conyza?");
    });

    it("explicitly instructs the model when no snippets are found", () => {
      const { userPrompt } = formatGroundingPrompt({
        question: "Consulta sin fuentes",
        snippets: [],
      });

      expect(userPrompt).toContain("No se encontraron fragmentos relevantes");
    });
  });
});
