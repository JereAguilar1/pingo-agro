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

describe("respond — Escenarios de Nutrición y Suelo (C08, C09)", () => {
  describe("C08 · Comparar estrategias y dosis de fertilización", () => {
    it("pide cultivo, rinde objetivo y análisis sin inventar dosis cerrada", async () => {
      const r = await respond("Con estos análisis de suelo y antecedentes del lote, ¿qué estrategias, fuentes y dosis de fertilizante conviene evaluar para el cultivo?");
      expect(r.kind).toBe("insufficient_info");
      expect(r.clarificationForm?.kind).toBe("fertilization_strategy");
      expect(r.sources.map((s) => s.sourceCode)).toEqual(expect.arrayContaining(["R03", "R04", "R05"]));
      // No inventa una dosis fija arbitraria
      expect(r.answer).not.toMatch(/\b(aplicar \d+ kg\/ha|dosis recomendada: \d+)\b/i);
    });

    it("orienta con curvas y umbrales INTA al enviar formulario de fertilización", async () => {
      const r = await respond("", {
        kind: "fertilization_strategy",
        data: { cultivo: "Maíz", rindeObjetivo: "9 tn/ha", analisisSuelo: "N-NO3 18 ppm, P 9 ppm, MO 3.2%", antecedentes: "Soja de primera" },
      });
      expect(r.kind).toBe("grounded_answer");
      expect(r.sources.map((s) => s.sourceCode)).toEqual(expect.arrayContaining(["R03", "R05"]));
      expect(r.answer).toContain("Maíz");
      expect(r.answer).toContain("Balcarce");
      expect(r.answer).not.toMatch(/\b(la dosis exacta es \d+ kg\/ha)\b/i);
    });
  });

  describe("C09 · Hacer un balance de nutrientes", () => {
    it("aclara explícitamente que un balance completo no está implementado en este MVP", async () => {
      const r = await respond("¿Podés ayudarme a calcular el balance de nutrientes de este cultivo o secuencia y mostrar cómo llegaste al resultado?");
      expect(r.kind).toBe("insufficient_info");
      expect(r.clarificationForm?.kind).toBe("nutrient_balance");
      expect(r.sources.map((s) => s.sourceCode)).toContain("R03");
      expect(r.answer.toLowerCase()).toContain("no está implementado");
    });

    it("orienta sobre entradas y salidas y cálculos deterministas de urea al enviar formulario", async () => {
      const r = await respond("", {
        kind: "nutrient_balance",
        data: { secuenciaCultivos: "Trigo / Soja 2da", rendimientoObtenido: "Trigo 4 tn/ha, Soja 2.5 tn/ha", fertilizantesAplicados: "100 kg/ha urea", entradasSalidas: "Solo extracción por grano cosechado vs fertilizante" },
      });
      expect(r.kind).toBe("grounded_answer");
      expect(r.sources.map((s) => s.sourceCode)).toContain("R03");
      expect(r.answer).toContain("Trigo");
      expect(r.answer.toLowerCase()).toContain("balance");
    });
  });
});

describe("respond — Escenarios de Clima, Aplicaciones y Regulatorio (C16, C17, C10, C11, C18)", () => {
  describe("C16 · Riesgo de heladas", () => {
    it("distingue pronóstico meteorológico de monitoreo satelital de eventos ya ocurridos", async () => {
      const r = await respond("¿Hay riesgo de heladas en la zona de mi lote y qué información necesito para evaluar su importancia para el cultivo?");
      expect(r.kind).toBe("insufficient_info");
      expect(r.clarificationForm?.kind).toBe("frost_risk");
      expect(r.sources.map((s) => s.sourceCode)).toEqual(expect.arrayContaining(["R17", "R18", "R26"]));
      expect(r.answer.toLowerCase()).toContain("satelital");
    });

    it("orienta con SMN e INTA al enviar formulario de heladas", async () => {
      const r = await respond("", {
        kind: "frost_risk",
        data: { ubicacion: "Tandil", cultivo: "Trigo", etapaFenologica: "Espigazón", fechaInteres: "Próximas 48 horas" },
      });
      expect(r.kind).toBe("grounded_answer");
      expect(r.sources.map((s) => s.sourceCode)).toEqual(expect.arrayContaining(["R17", "R18", "R26"]));
      expect(r.answer).toContain("Tandil");
      expect(r.answer).toContain("Trigo");
    });
  });

  describe("C17 · Condiciones para una aplicación", () => {
    it("nunca otorga autorización automática por 3 variables climáticas y exige marbete y normativa", async () => {
      const r = await respond("Según el tiempo previsto, ¿qué ventana podría evaluar para una aplicación y qué tendría que comprobar antes de empezar y durante el trabajo?");
      expect(r.kind).toBe("insufficient_info");
      expect(r.clarificationForm?.kind).toBe("application_conditions");
      expect(r.sources.map((s) => s.sourceCode)).toEqual(expect.arrayContaining(["R01", "R02", "R14", "R17", "R19"]));
      // Prohibición estricta de autorización automática
      expect(r.answer.toLowerCase()).not.toMatch(/\b(pod[eé]s aplicar|la ventana es buena|est[aá] autorizad[ao])\b/i);
    });

    it("guía la verificación in situ, telemetría y marbete al enviar formulario de aplicación", async () => {
      const r = await respond("", {
        kind: "application_conditions",
        data: { producto: "Roundup Full II", cultivo: "Soja", condicionesPrevistas: "Viento 12 km/h, Humedad 60%, Temp 20°C", entornoLote: "Cercano a escuela rural o curso de agua" },
      });
      expect(r.kind).toBe("grounded_answer");
      expect(r.sources.map((s) => s.sourceCode)).toEqual(expect.arrayContaining(["R02", "R19"]));
      expect(r.answer).toContain("Roundup Full II");
      expect(r.answer.toLowerCase()).toContain("in situ");
    });
  });

  describe("C10 · Normativa aplicable y municipios fuera de Tandil", () => {
    it("pide municipio y advierte cobertura específica de Tandil ante consulta genérica de normativa", async () => {
      const r = await respond("¿Qué leyes, decretos y ordenanzas tengo que revisar para el uso de fitosanitarios en este lote? ¿Cómo se relacionan y qué artículos corresponden a mi consulta?");
      expect(r.kind).toBe("insufficient_info");
      expect(r.clarificationForm?.kind).toBe("municipality_regulations");
      expect(r.sources.map((s) => s.sourceCode)).toEqual(expect.arrayContaining(["R11", "R12", "R13", "R14"]));
    });

    it("explica lectura conjunta de Tandil (R11 a R16) si el municipio es Tandil", async () => {
      const r = await respond("", {
        kind: "municipality_regulations",
        data: { municipio: "Tandil", tipoAplicacion: "Terrestre", distanciaZonaSensible: "200 m" },
      });
      expect(r.kind).toBe("grounded_answer");
      expect(r.sources.map((s) => s.sourceCode)).toEqual(expect.arrayContaining(["R12", "R13", "R14", "R15", "R16"]));
      expect(r.answer).toContain("17.404");
    });

    it("declara explícitamente falta de cobertura local si el municipio es distinto a Tandil", async () => {
      const r = await respond("", {
        kind: "municipality_regulations",
        data: { municipio: "Balcarce", tipoAplicacion: "Terrestre" },
      });
      expect(r.kind).toBe("grounded_answer");
      expect(r.sources.map((s) => s.sourceCode)).toEqual(expect.arrayContaining(["R12", "R13"]));
      expect(r.answer.toLowerCase()).toContain("solo cubre");
      expect(r.answer).toContain("Balcarce");
    });
  });

  describe("C11 · Conocer novedades en insumos", () => {
    it("declara que no hay feed en tiempo real y distingue anuncios de empresas de ensayos independientes", async () => {
      const r = await respond("Quiero estar actualizado sobre semillas, fertilizantes y fitosanitarios nuevos. ¿Qué novedades son pertinentes para mi zona y qué información respalda lo que ofrecen?");
      expect(r.kind).toBe("insufficient_info");
      expect(r.sources.map((s) => s.sourceCode)).toEqual(expect.arrayContaining(["R01", "R06", "R08", "R24"]));
      expect(r.answer.toLowerCase()).toContain("tiempo real");
      expect(r.answer.toLowerCase()).toContain("independiente");
    });
  });

  describe("C18 · Consultar una biblioteca propia", () => {
    it("informa honestamente que la carga de documentos propios está fuera del MVP y sugiere pegar texto", async () => {
      const r = await respond("Tengo papers, ensayos, análisis y planillas de mis lotes. ¿Cómo puedo consultarlos junto con estudios de la zona, comparar resultados y volver al dato original?");
      expect(r.kind).toBe("general");
      expect(r.answer.toLowerCase()).toContain("fuera de alcance");
      expect(r.answer.toLowerCase()).toContain("pegar");
    });
  });
});
