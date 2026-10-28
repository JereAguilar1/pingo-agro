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

  it("C01 — pide identificar el producto ante un cambio de cultivo tras un herbicida ya aplicado", async () => {
    const r = await respond(
      "Se aplicó atrazina en un lote previsto para soja. Las lluvias obligaron a reorganizar la siembra y queremos evaluar girasol. ¿Qué restricciones tenemos que comprobar?"
    );
    expect(r.kind).toBe("insufficient_info");
    expect(r.answer).not.toMatch(/\d+\s*(d[ií]as|meses)/i); // no inventa un intervalo de siembra
    expect(r.answer.toLowerCase()).toContain("carencia");
    expect(r.sources.map((s) => s.sourceCode)).toEqual(expect.arrayContaining(["R01", "R02"]));
    expect(r.followUpQuestions?.length).toBeGreaterThan(0);
  });

  it("pide contexto ante una pregunta genérica de muestreo de suelo", async () => {
    const r = await respond("¿Cómo debería planificar un muestreo de suelo?");
    expect(r.kind).toBe("insufficient_info");
    expect(r.followUpQuestions?.length).toBeGreaterThan(0);
  });

  it("los tres casos de información insuficiente incluyen un formulario de aclaración", async () => {
    const phyto = await respond("¿Está autorizado este herbicida para mi cultivo?");
    expect(phyto.clarificationForm?.kind).toBe("phyto");
    expect(phyto.clarificationForm?.fields.length).toBeGreaterThan(0);

    const soil = await respond("¿Cómo debería planificar un muestreo de suelo?");
    expect(soil.clarificationForm?.kind).toBe("soil_sampling");

    const rotation = await respond(
      "Se aplicó atrazina en un lote previsto para soja. Queremos reorganizar la siembra con girasol. ¿Qué restricciones de rotación tenemos que comprobar?"
    );
    expect(rotation.clarificationForm?.kind).toBe("crop_rotation");
  });

  it("C02 — pide cultivo y problema antes de listar productos/familias/modos de acción", async () => {
    const r = await respond(
      "¿Qué productos puedo utilizar para este cultivo y este problema? ¿Qué principios activos, familias químicas y modos de acción tienen?"
    );
    expect(r.kind).toBe("insufficient_info");
    expect(r.clarificationForm?.kind).toBe("product_family");
    expect(r.sources.map((s) => s.sourceCode)).toEqual(
      expect.arrayContaining(["R01", "R02", "R08", "R09"])
    );
    expect(r.followUpQuestions?.length).toBeGreaterThan(0);
  });
});

describe("respond — envío de formulario de aclaración", () => {
  it("responde con el producto identificado sin inventar una autorización", async () => {
    const r = await respond("", {
      kind: "phyto",
      data: { producto: "Roundup Full II", cultivo: "Soja", objetivo: "Sorgo de Alepo" },
    });
    expect(r.answer).toContain("Roundup Full II");
    expect(r.answer.toLowerCase()).not.toMatch(/est[aá] autorizado|registrado y vigente/);
    expect(r.sources.map((s) => s.sourceCode)).toEqual(expect.arrayContaining(["R01", "R02"]));
  });

  it("no inventa un intervalo de siembra numérico al recibir los datos de rotación", async () => {
    const r = await respond("", {
      kind: "crop_rotation",
      data: { producto: "Gesaprim 500", cultivoNuevo: "Girasol" },
    });
    expect(r.answer).toContain("Gesaprim 500");
    expect(r.answer).not.toMatch(/\d+\s*(d[ií]as|meses)/i);
  });

  it("orienta la búsqueda de productos/familias sin listar activos inventados", async () => {
    const r = await respond("", {
      kind: "product_family",
      data: { cultivo: "Soja", tipoProblema: "Maleza", especie: "Sorgo de Alepo", ubicacion: "Tandil" },
    });
    expect(r.answer).toContain("Soja");
    expect(r.answer.toLowerCase()).toContain("familia química");
    expect(r.answer.toLowerCase()).toContain("modo de acción");
    expect(r.sources.map((s) => s.sourceCode)).toEqual(
      expect.arrayContaining(["R08", "R09", "R01", "R02", "R11"])
    );
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

describe("respond — Escenarios Económicos (C13, C14, C15)", () => {
  describe("C13 · Alquileres rurales", () => {
    it("pide datos y advierte que no hay promedio zonal confiable sin inventar valores", async () => {
      const r = await respond("¿Qué referencias de alquiler hay para campos comparables al mío? ¿Hay información suficiente para hablar de un promedio zonal?");
      expect(r.kind).toBe("insufficient_info");
      expect(r.clarificationForm?.kind).toBe("rental_rates");
      expect(r.sources.map((s) => s.sourceCode)).toContain("R25");
      // No inventa cifras de alquiler ($/ha o qq/ha)
      expect(r.answer).not.toMatch(/\$\s*\d+|\b\d+\s*qq\b/i);
    });

    it("orienta la consulta de alquileres con el formulario enviado sin inventar precios", async () => {
      const r = await respond("", {
        kind: "rental_rates",
        data: { campana: "2026/2027", aptitud: "Agrícola pura", ubicacion: "Tandil", modalidad: "Quintales fijos (soja)" },
      });
      expect(r.kind).toBe("grounded_answer");
      expect(r.sources.map((s) => s.sourceCode)).toContain("R25");
      expect(r.answer).toContain("Tandil");
      expect(r.answer).not.toMatch(/\$\s*\d+|\b\d+\s*qq\b/i);
    });
  });

  describe("C14 · Costos de labores", () => {
    it("pide datos de la labor y diferencia referencia orientativa de presupuesto", async () => {
      const r = await respond("¿Cuánto cuesta esta labor y qué incluye el valor que me presupuestaron?");
      expect(r.kind).toBe("insufficient_info");
      expect(r.clarificationForm?.kind).toBe("machinery_costs");
      expect(r.sources.map((s) => s.sourceCode)).toContain("R22");
    });

    it("orienta con FACMA ante envío de formulario de labores", async () => {
      const r = await respond("", {
        kind: "machinery_costs",
        data: { labor: "Siembra directa", superficie: "150 ha", combustible: "Incluido por contratista", ubicacion: "Tandil" },
      });
      expect(r.kind).toBe("grounded_answer");
      expect(r.sources.map((s) => s.sourceCode)).toContain("R22");
      expect(r.answer).toContain("Siembra directa");
      expect(r.answer).toContain("FACMA");
    });
  });

  describe("C15 · Costos de flete", () => {
    it("pide origen, destino y carga citando FATRAC sin confirmar cotizaciones aisladas", async () => {
      const r = await respond("¿Cómo estimo y comparo el costo de transportar la producción desde mi campo hasta ese destino?");
      expect(r.kind).toBe("insufficient_info");
      expect(r.clarificationForm?.kind).toBe("freight_costs");
      expect(r.sources.map((s) => s.sourceCode)).toContain("R23");
    });

    it("orienta con FATRAC ante envío de formulario de flete", async () => {
      const r = await respond("", {
        kind: "freight_costs",
        data: { origen: "Tandil", destino: "Puerto Necochea (Quequén)", distanciaKm: "180", tipoCarga: "Cereal / Oleaginosa a granel" },
      });
      expect(r.kind).toBe("grounded_answer");
      expect(r.sources.map((s) => s.sourceCode)).toContain("R23");
      expect(r.answer).toContain("Quequén");
    });
  });
});

describe("respond — Escenarios de Manejo y Protección (C03, C04, C05, C06, C07)", () => {
  describe("C03 · Una maleza problema", () => {
    it("pide especie, estado y antecedentes ante consulta de maleza sin reducir a un producto", async () => {
      const r = await respond("Tengo una maleza que me está complicando el lote. ¿Qué estrategias de manejo puedo comparar para esta campaña y la siguiente?");
      expect(r.kind).toBe("insufficient_info");
      expect(r.clarificationForm?.kind).toBe("weed_management");
      expect(r.sources.map((s) => s.sourceCode)).toEqual(expect.arrayContaining(["R08", "R09"]));
      expect(r.answer).not.toMatch(/\b(dosis de \d+|aplica \d+ l\/ha)\b/i);
    });

    it("orienta el manejo integrado con la REM y rotación de modos de acción al enviar formulario", async () => {
      const r = await respond("", {
        kind: "weed_management",
        data: { especie: "Yuyo colorado (Amaranthus)", cultivo: "Soja", estadoFenologico: "Maleza desarrollada (>15 cm)", antecedentes: "Falla de control con glifosato" },
      });
      expect(r.kind).toBe("grounded_answer");
      expect(r.sources.map((s) => s.sourceCode)).toEqual(expect.arrayContaining(["R08", "R09"]));
      expect(r.answer).toContain("Amaranthus");
      expect(r.answer.toLowerCase()).toContain("modos de acción");
    });
  });

  describe("C04 · Plagas y enfermedades del cultivo", () => {
    it("diferencia hipótesis de diagnóstico y pide cultivo, etapa y observaciones", async () => {
      const r = await respond("¿Qué plagas o enfermedades debería monitorear en este cultivo y etapa? ¿Qué información me ayuda a interpretar lo que observo?");
      expect(r.kind).toBe("insufficient_info");
      expect(r.clarificationForm?.kind).toBe("pest_disease_management");
      expect(r.sources.map((s) => s.sourceCode)).toContain("R08");
    });

    it("orienta sobre monitoreo, umbrales y diagnóstico sin confirmar plagas aisladas al enviar formulario", async () => {
      const r = await respond("", {
        kind: "pest_disease_management",
        data: { cultivo: "Soja", etapaFenologica: "R3 (inicio de fructificación)", sintomasObservados: "Defoliación leve y chinches observadas", ubicacion: "Tandil" },
      });
      expect(r.kind).toBe("grounded_answer");
      expect(r.sources.map((s) => s.sourceCode)).toContain("R08");
      expect(r.answer).toContain("Soja");
      expect(r.answer.toLowerCase()).toContain("diagnóstico");
    });
  });

  describe("C05 · Comparar híbridos y cultivares", () => {
    it("pide cultivo, localidad y objetivo conservando el contexto del ensayo", async () => {
      const r = await respond("Estoy por sembrar y quiero seleccionar candidatos para mi zona. ¿Qué muestran los ensayos y bajo qué condiciones se obtuvieron esos resultados?");
      expect(r.kind).toBe("insufficient_info");
      expect(r.clarificationForm?.kind).toBe("cultivar_selection");
      expect(r.sources.map((s) => s.sourceCode)).toEqual(expect.arrayContaining(["R06", "R07", "R27"]));
    });

    it("orienta con la red correspondiente según el cultivo (ej. maíz R06, soja R07) al enviar formulario", async () => {
      const r = await respond("", {
        kind: "cultivar_selection",
        data: { cultivo: "Maíz", localidad: "Tandil", campana: "2025/2026", objetivo: "Potencial y estabilidad" },
      });
      expect(r.kind).toBe("grounded_answer");
      expect(r.sources.map((s) => s.sourceCode)).toContain("R06");
      expect(r.answer).toContain("Maíz");
      expect(r.answer).toContain("Tandil");
    });
  });

  describe("C06 · Controlar pérdidas de cosecha", () => {
    it("pide datos y diferencia pérdidas previas (precosecha) de máquina (plataforma y cola)", async () => {
      const r = await respond("Estoy midiendo pérdidas por plataforma y por cola. ¿Cómo las comparo con guías y estudios para saber si son elevadas?");
      expect(r.kind).toBe("insufficient_info");
      expect(r.clarificationForm?.kind).toBe("harvest_losses");
      expect(r.sources.map((s) => s.sourceCode)).toContain("R10");
    });

    it("orienta con protocolo INTA de cosecha al enviar formulario", async () => {
      const r = await respond("", {
        kind: "harvest_losses",
        data: { cultivo: "Soja", perdidaPlataforma: "50 kg/ha", perdidaCola: "70 kg/ha", precosechaMedida: "Sí, medida antes de entrar con la cosechadora" },
      });
      expect(r.kind).toBe("grounded_answer");
      expect(r.sources.map((s) => s.sourceCode)).toContain("R10");
      expect(r.answer).toContain("precosecha");
    });
  });

  describe("C07 · Planificar un muestreo de suelo", () => {
    it("responde a la consulta exacta de C07 pidiendo objetivo y contexto", async () => {
      const r = await respond("Quiero hacer un muestreo de suelo que sirva para la decisión que tengo que tomar. ¿Cómo debería organizarlo y qué información acompañaría las muestras?");
      expect(r.kind).toBe("insufficient_info");
      expect(r.clarificationForm?.kind).toBe("soil_sampling");
      expect(r.sources.map((s) => s.sourceCode)).toEqual(expect.arrayContaining(["R04", "R05"]));
    });
  });
});
