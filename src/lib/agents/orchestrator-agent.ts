// 🧠 Agente Orquestador (OrchestratorAgent):
// 1. Evalúa si el contexto de la consulta está completo; si falta información, genera
//    un Formulario Dinámico (soportando múltiples rondas acumulativas hasta completar el contexto).
// 2. Decide qué Sub-Agentes invocar:
//    - 📚 Sub-Agente Documental (documentación cargada por el usuario + biblioteca oficial)
//    - 🌐 Sub-Agente de Internet (búsqueda web priorizando sitios oficiales)
//    - 🧮 Sub-Agente de Cálculo (matemática determinista exacta)
// 3. Envía los resultados al Agente Redactor y al Agente Verificador antes de responder.

import {
  AssistantResponse,
  ClarificationField,
  FormSubmission,
  ProducerLote,
  UploadedDocument,
} from "../types";
import { respond } from "../respond";
import { runCalcSubAgent } from "./calc-subagent";
import { runDocsSubAgent } from "./docs-subagent";
import { runWebSearchSubAgent } from "./web-subagent";
import { draftAndVerifyAgentResponse } from "./verifier-agent";

export interface OrchestratorInput {
  question: string;
  form?: FormSubmission;
  activeLote?: ProducerLote | null;
  uploadedDocs?: UploadedDocument[];
  fetchFn?: typeof fetch;
}

/**
 * Evalúa si después de recibir un formulario (Ronda 1) todavía falta un dato crítico
 * para completar el contexto antes de llamar a los sub-agentes (Ciclo Multi-Ronda).
 */
function checkMultiRoundFollowUp(
  baseQuestion: string,
  accumulated: Record<string, string>,
  currentRound: number,
  formKind?: string
): {
  missingFields: ClarificationField[];
  promptMessage: string;
} | null {
  // Máximo 2 rondas de repregunta dinámica para no fatigar al usuario
  if (currentRound >= 2) return null;

  const qLower = `${baseQuestion} ${Object.values(accumulated).join(" ")}`.toLowerCase();

  // Caso A: El usuario pidió fertilización / balance de maíz en Ronda 1 indicando cultivo y rinde,
  // pero dejó vacío el análisis de suelo (N en suelo) necesario para el Sub-Agente de Cálculo.
  if (
    (formKind === "fertilization_strategy" || formKind === "dynamic_context") &&
    /ma[ií]z/i.test(accumulated.cultivo || qLower) &&
    accumulated.rindeObjetivo &&
    !accumulated.analisisSuelo?.trim() &&
    !accumulated.nSuelo?.trim()
  ) {
    return {
      promptMessage: `Perfecto, tomé nota de ${accumulated.cultivo || "Maíz"} con rinde objetivo de ${
        accumulated.rindeObjetivo
      }. Para que el Sub-Agente de Cálculo determine los kg exactos de urea y fósforo, completá este último dato de suelo:`,
      missingFields: [
        {
          id: "nSuelo",
          label: "Nitrógeno de nitratos en suelo 0–60 cm (kg N/ha)",
          type: "text",
          placeholder: "Ej. 60",
          required: true,
        },
        {
          id: "pBray",
          label: "Fósforo disponible P Bray 0–20 cm (ppm)",
          type: "text",
          placeholder: "Ej. 14",
        },
      ],
    };
  }

  // Caso B: Consulta dinámica donde en Ronda 1 indicó cultivo/problema pero falta ubicación o estadio
  if (formKind === "dynamic_context" && accumulated.cultivo && !accumulated.estadio?.trim()) {
    return {
      promptMessage: `Gracias. Para ajustar la recomendación técnica en ${accumulated.cultivo}, indicame el estadio fenológico actual y la localidad:`,
      missingFields: [
        {
          id: "estadio",
          label: "Estadio fenológico actual",
          type: "text",
          placeholder: "Ej. V6 (6 hojas) o R1 (floración)",
          required: true,
        },
        {
          id: "localidad",
          label: "Localidad / Partido",
          type: "text",
          placeholder: "Ej. Tandil",
        },
      ],
    };
  }

  return null;
}

export async function runOrchestratorAgent(
  input: OrchestratorInput
): Promise<AssistantResponse> {
  const { question, form, activeLote, uploadedDocs = [], fetchFn } = input;

  const originalQuestion = form?.originalQuestion || question.trim();
  const currentRound = form ? (form.round ?? 1) : 0;
  const accumulatedContext: Record<string, string> = {
    ...(form?.accumulatedData || {}),
    ...(form?.data || {}),
  };

  // Si hay un lote activo, inyectar sus datos base si no fueron sobreescritos en el formulario
  if (activeLote) {
    if (!accumulatedContext.cultivo) accumulatedContext.cultivo = activeLote.crop;
    if (!accumulatedContext.rindeObjetivo)
      accumulatedContext.rindeObjetivo = String(activeLote.targetYieldTonHa);
    if (!accumulatedContext.nSuelo)
      accumulatedContext.nSuelo = String(activeLote.soilNitrateKgHa);
  }

  // 1. Si el usuario acaba de enviar un formulario, verificar si hace falta una Ronda 2
  //    para terminar de completar el contexto antes de ejecutar los sub-agentes
  if (form) {
    const followUp = checkMultiRoundFollowUp(
      originalQuestion,
      accumulatedContext,
      currentRound,
      form.kind
    );
    if (followUp) {
      return {
        kind: "insufficient_info",
        answer: followUp.promptMessage,
        sources: [],
        warnings: [],
        clarificationForm: {
          kind: "dynamic_context",
          round: currentRound + 1,
          originalQuestion,
          accumulatedData: accumulatedContext,
          submitLabel: "Completar contexto y consultar agentes",
          fields: followUp.missingFields,
        },
        mode: "demo",
      };
    }
  }

  // 2. Consultar primero la lógica base de detección de formularios y reglas curadas
  //    (si el usuario subió un documento propio y pregunta sobre él, salteamos los formularios rígidos)
  const asksAboutUploadedDoc =
    uploadedDocs.length > 0 &&
    /documento|archivo|subi|cargad|pdf|resum|que dice/i.test(originalQuestion);

  let baseResponse: AssistantResponse | null = null;
  if (!asksAboutUploadedDoc && form?.kind !== "dynamic_context") {
    baseResponse = await respond(originalQuestion, form, activeLote);

    // Si la evaluación inicial detecta que faltan datos (Ronda 1), enriquecemos el formulario
    // con metadatos multi-ronda del Orquestador y lo devolvemos para que el usuario lo complete
    if (baseResponse.kind === "insufficient_info" && baseResponse.clarificationForm) {
      return {
        ...baseResponse,
        clarificationForm: {
          ...baseResponse.clarificationForm,
          round: 1,
          originalQuestion,
          accumulatedData: accumulatedContext,
        },
      };
    }
  }

  // 3. Ejecutar en paralelo los Sub-Agentes especializados:
  //    📚 DocsSubAgent (documentación cargada + biblioteca oficial)
  //    🧮 CalcSubAgent (cálculos exactos con contexto acumulado)
  //    🌐 WebSearchSubAgent (búsqueda en internet cuando requiere datos externos o complementarios)
  const calcOut = runCalcSubAgent({
    query: originalQuestion,
    context: accumulatedContext,
  });

  const docsOut = await runDocsSubAgent({
    query: originalQuestion,
    context: accumulatedContext,
    uploadedDocs,
  });

  const qNorm = originalQuestion.toLowerCase();
  const needsWebSearch =
    /internet|web|actual|hoy|clima|pronostico|pizarra|precio|novedad|ultim|buscar/i.test(qNorm) ||
    docsOut.sources.length === 0;

  const webOut = needsWebSearch
    ? await runWebSearchSubAgent({
        query: originalQuestion,
        context: accumulatedContext,
        fetchFn,
      })
    : { webSnippets: [], webSources: [] };

  const agentsUsed: ("docs" | "web" | "calc" | "verifier")[] = ["verifier"];
  if (docsOut.sources.length > 0) agentsUsed.unshift("docs");
  if (webOut.webSources.length > 0) agentsUsed.push("web");
  if (calcOut.calculation || baseResponse?.calculation) agentsUsed.push("calc");

  // Si baseResponse ya tenía un cálculo determinista exacto o fuentes específicas del formulario,
  // las combinamos para que el Redactor y el Verificador tengan toda la evidencia
  if (baseResponse?.sources && baseResponse.sources.length > 0) {
    const existingCodes = new Set(docsOut.sources.map((s) => s.sourceCode));
    for (const s of baseResponse.sources) {
      if (!existingCodes.has(s.sourceCode)) {
        docsOut.sources.push(s);
        docsOut.snippetsText.push(`[${s.sourceCode}] ${s.institution} — ${s.title}: ${s.supports}`);
      }
    }
  }

  const effectiveCalcOut = calcOut.calculation
    ? calcOut
    : baseResponse?.calculation
    ? {
        calculation: baseResponse.calculation,
        summaryText: baseResponse.calculation.resultSummary,
      }
    : {};

  // 4. ✍️ Agente Redactor + 🛡️ Agente Verificador
  const verifiedResult = await draftAndVerifyAgentResponse({
    question: originalQuestion,
    context: accumulatedContext,
    docsOut,
    webOut,
    calcOut: effectiveCalcOut,
    fallbackAnswer:
      baseResponse && baseResponse.kind !== "no_evidence" ? baseResponse.answer : undefined,
  });

  const finalKind = effectiveCalcOut.calculation
    ? "calculation"
    : verifiedResult.sources.length > 0
    ? "grounded_answer"
    : baseResponse?.kind || "no_evidence";

  return {
    kind: finalKind,
    answer: verifiedResult.answer,
    calculation: effectiveCalcOut.calculation,
    sources: verifiedResult.sources,
    warnings: baseResponse?.warnings?.length ? baseResponse.warnings : verifiedResult.warnings,
    mode: verifiedResult.mode,
    agentsUsed,
  };
}
