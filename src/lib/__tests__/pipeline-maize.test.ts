import { describe, expect, it } from "vitest";
import { respond } from "../respond";
import { DEFAULT_PRODUCER_LOTES } from "../local-knowledge";
import {
  maizeHarvestLossesCalc,
  maizeNitrogenBalance,
  maizeSeedingRate,
} from "../calculations";

describe("Pipeline 4 Etapas — Asistente Experto en Maíz (/public/flujo.png)", () => {
  it("2A · CÓDIGO (sin IA): calcula balance de N en maíz, densidad por metro y pérdidas de cosecha", () => {
    const nBal = maizeNitrogenBalance(10, 66, 46);
    expect(nBal.resultSummary).toContain("220 kg N/ha");
    expect(nBal.resultSummary).toContain("154 kg N/ha");
    expect(nBal.resultSummary).toContain("334.8 kg/ha de urea");

    const seed = maizeSeedingRate(72000, 52, 92);
    expect(seed.resultSummary).toContain("4.07 semillas por metro lineal");

    const loss = maizeHarvestLossesCalc(10, 1);
    expect(loss.resultSummary).toContain("183 kg/ha");
  });

  it("1 · ENTIENDE + 2 · RESUELVE: usa el Lote Activo 🔒 para fertilización de maíz sin repreguntar lo que ya sabe", async () => {
    const loteLaLoma = DEFAULT_PRODUCER_LOTES[0]; // 10 t/ha, 66 kg N/ha inicial, P Bray 14 ppm
    const res = await respond(
      "¿Cuánta urea y fósforo necesito aplicar en mi lote de maíz?",
      undefined,
      loteLaLoma
    );

    expect(res.kind).toBe("grounded_answer");
    expect(res.calculation).toBeDefined();
    expect(res.calculation?.resultSummary).toContain("334.8 kg/ha de urea");
    expect(res.sources.map((s) => s.sourceCode)).toEqual(
      expect.arrayContaining(["M01", "R03"])
    );
    // Verifica que todas las fuentes tengan página y pasaje original para "Ver pasaje original"
    expect(res.sources[0].page).toBeDefined();
    expect(res.sources[0].exactPassage).toBeDefined();
    // Verifica la traza de las 4 etapas
    expect(res.pipelineTrace?.step1Understand.usedLoteName).toContain("Lote 4");
    expect(res.pipelineTrace?.step2Resolve.codeExecuted).toBe(true);
    expect(res.pipelineTrace?.step4Verify.passed).toBe(true);
    expect(res.pipelineTrace?.step4Verify.abstained).toBe(false);
  });

  it("1 · ENTIENDE + 4 · VERIFICA: si NO hay Lote Activo 🔒 y faltan datos, activa abstención ⛔ y repregunta", async () => {
    const res = await respond(
      "¿Cómo determino la fertilización para este lote y objetivo de rinde?",
      undefined,
      null
    );

    expect(res.kind).toBe("insufficient_info");
    expect(res.pipelineTrace?.step4Verify.abstained).toBe(true);
    expect(res.structuredShort?.abstentionBlock).toBeDefined();
    expect(res.structuredShort?.abstentionBlock?.neededData.length).toBeGreaterThan(5);
  });

  it("2B · BÚSQUEDA (RAG): responde sobre umbral de cogollero (Spodoptera) en maíz con ficha M04, página y fecha", async () => {
    const res = await respond(
      "Observo ventanitas en hojas de maíz por cogollero (Spodoptera), ¿cuál es el umbral de acción?",
      undefined,
      DEFAULT_PRODUCER_LOTES[0]
    );

    expect(res.kind).toBe("grounded_answer");
    expect(res.sources.map((s) => s.sourceCode)).toContain("M04");
    const m04Card = res.sources.find((s) => s.sourceCode === "M04");
    expect(m04Card?.page).toContain("Pág. 12–15");
    expect(m04Card?.exactPassage).toContain("20% de plantas con daño grado 3");
    expect(res.pipelineTrace?.step4Verify.citationHoldsData).toBe(true);
  });
});
