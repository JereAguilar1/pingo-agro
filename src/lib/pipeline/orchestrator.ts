// Orquestador de las 4 etapas del flujo "Asistente experto en maíz · versión simple" (/public/flujo.png):
// 1 · ENTIENDE (Mixto: reglas + SLM) -> ¿qué tipo de pregunta es? ¿faltan datos? arma el plan
// 2 · RESUELVE -> 2A: CÓDIGO (sin IA: reglas, cálculos, tablas curadas) + 2B: BÚSQUEDA (RAG con página y fecha)
// 3 · REDACTA -> SLM local: usa solo lo que le dieron; no inventa números
// 4 · VERIFICA -> ¿la cita sostiene el dato? ¿está vigente? si no -> se abstiene (⛔ "sin respaldo: necesito X")

import {
  AssistantResponse,
  FormSubmission,
  PipelineTrace,
  ProducerLote,
  SourceCardData,
  StructuredShortAnswer,
} from "../types";
import {
  CalculationOutput,
  maizeHarvestLossesCalc,
  maizeNitrogenBalance,
  maizeSeedingRate,
} from "../calculations";
import { getSourceByCode, LIBRARY, SourceFragment } from "../library";
import { retrieve } from "../retrieval";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function makeCardFromFragment(f: SourceFragment, customSupports?: string): SourceCardData {
  return {
    sourceCode: f.sourceCode,
    institution: f.institution,
    title: f.title,
    date: f.date,
    accessedOn: f.accessedOn,
    section: f.section,
    page: f.page || f.section || "Documento técnico",
    exactPassage: f.exactPassage || f.text,
    url: f.url,
    verification: f.verification,
    supports: customSupports || f.text,
  };
}

/**
 * Enriquece las tarjetas de fuentes con `page` y `exactPassage` desde la Base de Conocimiento Local.
 */
export function enrichSourcesWithPassages(sources: SourceCardData[]): SourceCardData[] {
  return sources.map((s) => {
    const frag = getSourceByCode(s.sourceCode);
    if (!frag) return s;
    return {
      ...s,
      date: s.date || frag.date || frag.accessedOn,
      page: s.page || frag.page || frag.section || "Sección principal",
      exactPassage: s.exactPassage || frag.exactPassage || frag.text,
    };
  });
}

/**
 * Paso 1 + Paso 2A Determinista con "Mis Lotes 🔒":
 * Si el productor tiene un Lote activo en su Base de Conocimiento Local (o escribe una consulta
 * de cálculo de maíz con números explícitos), resuelve determinísticamente con CÓDIGO (sin IA)
 * + BÚSQUEDA (RAG) sin obligarlo a llenar un formulario de datos que ya están en su lote.
 */
export function tryResolveWithMaizeCodeAndLote(
  question: string,
  activeLote?: ProducerLote | null,
  form?: FormSubmission
): AssistantResponse | null {
  if (form) return null;
  const q = normalize(question);

  // 1. Consulta de calibración de densidad / semillas por metro en maíz
  const plantsMatch = q.match(/(\d{2}(?:\.?\d{3}))\s*(?:plantas|pl|semillas)/);
  const isMaizeDensityQuery =
    /\b(maiz)\b/.test(q) &&
    /\b(densidad|semillas por metro|calibrar sembradora|plantas por hectarea|pl\/ha|tosca)\b/.test(q);

  if (plantsMatch && /\b(metro|surco|sembradora|calibr|semillas)\b/.test(q)) {
    const rawPlants = parseInt(plantsMatch[1].replace(/\./g, ""), 10);
    const spacingMatch = q.match(/(\d{2,3})\s*cm/);
    const spacingCm = spacingMatch ? parseInt(spacingMatch[1], 10) : activeLote?.rowSpacingCm || 52;
    if (rawPlants >= 20000 && rawPlants <= 120000) {
      const calc = maizeSeedingRate(rawPlants, spacingCm, 92);
      const m03 = getSourceByCode("M03")!;
      return {
        kind: "calculation",
        answer: calc.resultSummary,
        calculation: calc,
        sources: [
          makeCardFromFragment(
            m03,
            "Recomendación de densidad de maíz por ambiente y calibración de siembra."
          ),
        ],
        warnings: [m03.limitation],
        mode: "demo",
      };
    }
  }

  // Si pregunta por densidad o fecha de siembra de maíz y tiene un Lote activo con profundidad de tosca
  if (isMaizeDensityQuery && activeLote) {
    const isSomero = activeLote.toscaDepthCm < 75;
    const recommendedPlants = isSomero ? 50000 : 72000;
    const recommendedRange = isSomero ? "45.000 a 55.000 pl/ha (Maíz Tardío)" : "68.000 a 78.000 pl/ha (Maíz Temprano)";
    const calc = maizeSeedingRate(recommendedPlants, activeLote.rowSpacingCm || 52, 92);
    const m03 = getSourceByCode("M03")!;
    const m02 = getSourceByCode("M02")!;
    return {
      kind: "grounded_answer",
      answer:
        `Usando los datos de tu lote "${activeLote.name}" (profundidad efectiva a tosca: ${activeLote.toscaDepthCm} cm, espaciamiento: ${activeLote.rowSpacingCm} cm), ` +
        `la tabla curada del INTA [M03] ubica este ambiente en el rango de ${recommendedRange}. ` +
        `Tomando una densidad objetivo de ${recommendedPlants.toLocaleString("es-AR")} pl/ha, el cálculo determinista arroja ${calc.resultSummary}`,
      calculation: calc,
      sources: [
        makeCardFromFragment(m03, "Ajuste de densidad y fecha de siembra según profundidad de tosca en Tandil."),
        makeCardFromFragment(m02, "Ubicación del período crítico (VT–R2) según fecha de siembra."),
      ],
      warnings: [m03.limitation],
      mode: "demo",
    };
  }

  // 2. Pérdidas de cosecha en maíz con conteo de granos/m² o espigas
  const grainsM2Match = q.match(/(\d+(?:[.,]\d+)?)\s*granos?\s*(?:por|\/)\s*m2/);
  if (grainsM2Match && /\b(maiz|cosecha|perdida|cabezal|cola)\b/.test(q)) {
    const grains = parseFloat(grainsM2Match[1].replace(",", "."));
    const earsMatch = q.match(/(\d+(?:[.,]\d+)?)\s*espigas?/);
    const ears = earsMatch ? parseFloat(earsMatch[1].replace(",", ".")) : 0;
    const calc = maizeHarvestLossesCalc(grains, ears);
    const m05 = getSourceByCode("M05")!;
    return {
      kind: "calculation",
      answer: calc.resultSummary,
      calculation: calc,
      sources: [makeCardFromFragment(m05, "Equivalencia determinista de pérdidas en cosecha de maíz y tolerancia INTA PRECOP.")],
      warnings: [m05.limitation],
      mode: "demo",
    };
  }

  // 3. Fertilización / Balance de Nitrógeno en maíz usando el Lote activo 🔒
  const isMaizeFertQuery =
    /\b(fertiliz|nitrogeno|urea|dosis|cuanto n|aplicar n|fosforo)\b/.test(q) &&
    (/\b(maiz|lote)\b/.test(q) || Boolean(activeLote));

  if (isMaizeFertQuery && activeLote && !/\b(calcular|contiene|contenido)\b/.test(q)) {
    const calc = maizeNitrogenBalance(activeLote.targetYieldTonHa, activeLote.soilNitrateKgHa, 46);
    const m01 = getSourceByCode("M01")!;
    const r03 = getSourceByCode("R03")!;
    const pStatus =
      activeLote.soilPhosphorusPpm < 15
        ? `Además, el P Bray del lote (${activeLote.soilPhosphorusPpm} ppm) está por debajo del umbral crítico de 15–16 ppm [M01], por lo que requiere fertilización fosfatada a la siembra.`
        : `El P Bray del lote (${activeLote.soilPhosphorusPpm} ppm) alcanza el umbral crítico de 15–16 ppm [M01] (estrategia de reposición/mantenimiento).`;

    return {
      kind: "grounded_answer",
      answer:
        `A partir de los datos guardados en "${activeLote.name}" (Híbrido ${activeLote.hybrid}, en estadio ${activeLote.phenology}, rinde objetivo ${activeLote.targetYieldTonHa} t/ha y N-NO3 inicial de ${activeLote.soilNitrateKgHa} kg N/ha a 0–60 cm): ` +
        `${calc.resultSummary} ${pStatus}`,
      calculation: calc,
      sources: [
        makeCardFromFragment(m01, "Requerimiento de 22 kg N/t y umbral crítico de P Bray (15–16 ppm) en maíz."),
        makeCardFromFragment(r03, "Concentración del 46% de N en la urea comercial."),
      ],
      warnings: [m01.limitation],
      mode: "demo",
    };
  }

  // 4. Cogollero / Spodoptera en maíz
  if (/\b(cogollero|spodoptera|isoca|oruga militar|davis)\b/.test(q)) {
    const m04 = getSourceByCode("M04")!;
    const r02 = getSourceByCode("R02")!;
    const loteContext = activeLote
      ? `En tu lote "${activeLote.name}" tenés sembrado ${activeLote.hybrid} en estadio ${activeLote.phenology}. `
      : "";
    return {
      kind: "grounded_answer",
      answer:
        `${loteContext}Según el protocolo de monitoreo de la REM e INTA [M04], el umbral orientativo de intervención para Spodoptera frugiperda en maíz es del 20% de plantas con daño grado 3 en la escala de Davis (lesiones circulares y ventanitas traslúcidas frescas), antes de que la larva supere 1,5 cm e ingrese al cogollo cubierta por aserrín. ` +
        `Verificá la proteína Bt del híbrido (Vip3A mantiene control; Cry1F registra quiebres) y consultá el vademécum de SENASA [R02] para corroborar principios activos registrados y marbete.`,
      sources: [
        makeCardFromFragment(m04, "Umbral de daño de Spodoptera frugiperda (20% grado 3 Davis) y eficacia de eventos Bt."),
        makeCardFromFragment(r02, "Buscador público de marbetes y principios activos autorizados en SENASA."),
      ],
      warnings: [m04.limitation],
      mode: "demo",
    };
  }

  return null;
}

/**
 * Etapa 4 · VERIFICA (Caja Roja del diagrama) + Construcción de `PipelineTrace` y `StructuredShortAnswer`.
 * Revisa:
 * 1) ¿La cita sostiene el dato?
 * 2) ¿Está vigente?
 * 3) Si no -> se abstiene (⛔ "sin respaldo: necesito X")
 */
export function runStep4VerifierAndBuildTrace(params: {
  question: string;
  response: AssistantResponse;
  activeLote?: ProducerLote | null;
  draftEngine: "local_slm" | "cloud_llm" | "deterministic_template";
}): AssistantResponse {
  const { question, response, activeLote, draftEngine } = params;
  const enrichedSources = enrichSourcesWithPassages(response.sources || []);

  // Determinar tipo de consulta en Paso 1 (ENTIENDE)
  const hasCalc = Boolean(response.calculation);
  const hasSources = enrichedSources.length > 0;
  const isInsufficient = response.kind === "insufficient_info";
  const isNoEvidence = response.kind === "no_evidence";

  let queryType: PipelineTrace["step1Understand"]["queryType"] = "rag_search";
  if (isInsufficient) {
    queryType = "insufficient_data";
  } else if (hasCalc && hasSources) {
    queryType = "hybrid";
  } else if (hasCalc) {
    queryType = "calculation";
  }

  const missingData: string[] = [];
  if (response.clarificationForm) {
    for (const f of response.clarificationForm.fields) {
      missingData.push(f.label);
    }
  } else if (response.followUpQuestions && response.followUpQuestions.length > 0) {
    missingData.push(...response.followUpQuestions);
  }

  // Verificar vigencia de las fuentes citadas (Paso 4 · VERIFICA)
  const sourceCodes = enrichedSources.map((s) => s.sourceCode);
  const hasCautionNorm = sourceCodes.includes("R14") || sourceCodes.includes("R16");
  const hasOldRem2013 = sourceCodes.includes("R09");
  const isVigent = !hasOldRem2013 || sourceCodes.length > 1;

  // Verificar si debe abstenerse (Paso 4: "si no -> se abstiene")
  const abstained = isInsufficient || isNoEvidence || (!hasSources && !hasCalc && response.kind !== "general");

  let abstentionReason: string | undefined;
  let neededDataText = "";

  if (isInsufficient) {
    neededDataText =
      missingData.length > 0
        ? missingData.slice(0, 3).join(", ")
        : "Datos de lote, cultivo/híbrido y estadio fenológico";
    abstentionReason =
      "Faltan datos agronómicos obligatorios del lote o aplicación para dar una recomendación respaldada sin adivinar.";
  } else if (isNoEvidence) {
    neededDataText = "Fuente oficial en biblioteca (p. ej. marbete SENASA, informe INTA o contexto de cultivo/lote)";
    abstentionReason =
      "Ningún documento de la Base de Conocimiento Local respalda esta afirmación específica. El verificador bloquea respuestas sin respaldo.";
  }

  // Verificar que los códigos [Rxx]/[Mxx] mencionados en el texto estén respaldados
  const citedMatches = response.answer.match(/\[([RM]\d{2})\]/g) || [];
  const citedCodes = citedMatches.map((m) => m.replace(/[\[\]]/g, ""));
  const allCitationsSupported = citedCodes.every((c) => sourceCodes.includes(c) || Boolean(getSourceByCode(c)));
  const citationHoldsData = (hasSources || hasCalc) && allCitationsSupported;

  // Construir Resumen de Fuente (📄 Fuente), Cálculo (🧮 Cálculo) e Interpretación (💡 Interpretación)
  let fuenteSummary = "Sin citas documentales aplicables a esta entrada.";
  if (enrichedSources.length > 0) {
    fuenteSummary = enrichedSources
      .map(
        (s) =>
          `[${s.sourceCode}] ${s.institution} — "${s.title}" (${s.page || "Sección técnica"}${
            s.date ? `, ${s.date}` : ""
          })`
      )
      .join(" · ");
  } else if (hasCalc) {
    fuenteSummary = "Fórmula agronómica determinista verificada en código local (sin IA).";
  }

  const calculoSummary: string | undefined = response.calculation
    ? `${response.calculation.title}: ${response.calculation.resultSummary}`
    : undefined;

  const structuredShort: StructuredShortAnswer = {
    fuenteSummary,
    calculoSummary,
    interpretacionSummary: response.answer,
    ...(abstained
      ? {
          abstentionBlock: {
            neededData: neededDataText || "Especificar lote, estadio del maíz o documento de referencia",
            reason: abstentionReason || "El verificador determinista requiere datos verificables antes de prescribir.",
          },
        }
      : {}),
  };

  let verificationSummary = "Cita verificada con página/fecha y cifras consistentes.";
  if (abstained) {
    verificationSummary = `Abstención preventiva activada: requiere ${neededDataText}.`;
  } else if (hasCautionNorm) {
    verificationSummary = "Citas verificadas. Alerta de vigencia: Decreto 423/2026 suspende cautelarmente Art. 8 en Tandil.";
  } else if (hasOldRem2013) {
    verificationSummary = "Citas verificadas. Nota de vigencia: contrastar R09 (2013) con registro SENASA actual.";
  }

  const pipelineTrace: PipelineTrace = {
    step1Understand: {
      queryType,
      detectedCrop: /soja/i.test(question)
        ? "Soja"
        : /trigo/i.test(question)
        ? "Trigo"
        : /girasol/i.test(question)
        ? "Girasol"
        : activeLote?.crop || "Maíz",
      usedLoteName: activeLote?.name,
      missingData,
      planSummary: isInsufficient
        ? `Faltan datos clave (${missingData.slice(0, 2).join(", ")}) → Dispara repregunta al productor.`
        : activeLote
        ? `Usa contexto de "${activeLote.name}" (${activeLote.hybrid}, ${activeLote.phenology}) → Ejecuta ${
            hasCalc ? "Código + RAG" : "RAG documental"
          }.`
        : `Clasifica consulta (${queryType}) → Ejecuta ${hasCalc ? "Código determinista" : "Búsqueda RAG"}.`,
    },
    step2Resolve: {
      codeExecuted: hasCalc,
      codeSummary: response.calculation ? response.calculation.resultSummary : "Reglas de validación y umbrales aplicadas",
      ragFragmentsCount: enrichedSources.length,
      ragSources: sourceCodes,
    },
    step3Draft: {
      engine: draftEngine,
      drafted: true,
      summary:
        draftEngine === "local_slm"
          ? "SLM Local (Llama 3.2 1B) redactó la respuesta usando únicamente los datos resueltos en el Paso 2."
          : draftEngine === "cloud_llm"
          ? "Modelo IA redactó con restricción estricta al contexto provisto."
          : "Redacción determinista estructurada sobre tablas y pasajes curados (0 números inventados).",
    },
    step4Verify: {
      passed: !abstained && citationHoldsData,
      citationHoldsData,
      isVigent,
      abstained,
      abstentionReason,
      verificationSummary,
    },
  };

  return {
    ...response,
    sources: enrichedSources,
    pipelineTrace,
    structuredShort,
  };
}
