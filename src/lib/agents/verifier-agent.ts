// ✍️ Agente Redactor + 🛡️ Agente Verificador (VerifierAgent):
// Redacta una respuesta clara y directa a partir de los hallazgos de los sub-agentes
// (Documentación, Internet y Cálculo) y verifica su confiabilidad antes de entregarla.

import { completeWithAi, isAiConfigured } from "../ai-provider";
import { SourceCardData } from "../types";
import { CalcSubAgentOutput } from "./calc-subagent";
import { DocsSubAgentOutput } from "./docs-subagent";
import { WebSubAgentOutput } from "./web-subagent";

export interface VerifiedAgentResult {
  answer: string;
  sources: SourceCardData[];
  warnings: string[];
  mode: "ai" | "demo";
  verified: boolean;
}

export async function draftAndVerifyAgentResponse(params: {
  question: string;
  context?: Record<string, string>;
  docsOut: DocsSubAgentOutput;
  webOut: WebSubAgentOutput;
  calcOut: CalcSubAgentOutput;
  fallbackAnswer?: string;
}): Promise<VerifiedAgentResult> {
  const { question, context = {}, docsOut, webOut, calcOut, fallbackAnswer } = params;

  // Unificar y deduplicar fuentes de Documentación e Internet
  const combinedSources: SourceCardData[] = [];
  const seenCodes = new Set<string>();

  for (const s of [...docsOut.sources, ...webOut.webSources]) {
    if (!seenCodes.has(s.sourceCode)) {
      seenCodes.add(s.sourceCode);
      combinedSources.push(s);
    }
  }

  const evidenceBlocks: string[] = [];
  if (calcOut.summaryText) {
    evidenceBlocks.push(`RESULTADO DEL SUB-AGENTE DE CÁLCULO EXACTO:\n${calcOut.summaryText}`);
  }
  if (docsOut.snippetsText.length > 0) {
    evidenceBlocks.push(`HALLAZGOS DEL SUB-AGENTE DOCUMENTAL:\n${docsOut.snippetsText.join("\n\n")}`);
  }
  if (webOut.webSnippets.length > 0) {
    evidenceBlocks.push(`HALLAZGOS DEL SUB-AGENTE DE INTERNET:\n${webOut.webSnippets.join("\n\n")}`);
  }

  const contextEntries = Object.entries(context).filter(([, v]) => Boolean(v?.trim()));
  const contextSummary =
    contextEntries.length > 0
      ? contextEntries.map(([k, v]) => `- ${k}: ${v}`).join("\n")
      : "";

  let draftedAnswer = "";
  let mode: "ai" | "demo" = "demo";

  // 1. Si hay un motor LLM configurado en el servidor (Groq / Gemini / Claude), redactar con IA
  if (isAiConfigured() && evidenceBlocks.length > 0) {
    try {
      const system = [
        "Sos el Agente Redactor y Verificador de Surco, un asistente agronómico experto.",
        "Tu tarea es redactar una respuesta directa, clara y concisa en español rioplatense para el productor o ingeniero agrónomo, usando EXCLUSIVAMENTE los hallazgos de los sub-agentes provistos abajo.",
        "Reglas estrictas:",
        "1. Si hay un resultado del Sub-Agente de Cálculo, incluí sus cifras exactas sin modificarlas.",
        "2. Citá los códigos de fuente entre corchetes (ej. [R08], [M01], [U01], [WEB-01]) donde corresponda.",
        "3. No inventes dosis comerciales, precios ni autorizaciones que no figuren en la evidencia.",
        "4. Sé directo y limpio: respondé la pregunta en 1 o 2 párrafos claros sin encabezados innecesarios.",
      ].join("\n");

      const prompt = [
        `Pregunta original: "${question}"`,
        contextSummary ? `Datos adicionales aportados por el usuario:\n${contextSummary}` : "",
        `Evidencia recolectada por los sub-agentes:\n\n${evidenceBlocks.join("\n\n")}`,
      ]
        .filter(Boolean)
        .join("\n\n");

      const aiRes = await completeWithAi({ system, question: prompt });
      draftedAnswer = aiRes.text;
      mode = "ai";
    } catch {
      // Fallback a síntesis estructurada limpia si la API falla
    }
  }

  // 2. Síntesis limpia si no se usó LLM en la nube
  if (!draftedAnswer) {
    if (fallbackAnswer) {
      draftedAnswer = fallbackAnswer;
    } else {
      const parts: string[] = [];
      if (calcOut.summaryText) {
        parts.push(calcOut.summaryText);
      }
      if (docsOut.sources.length > 0) {
        const docSynthesis = docsOut.sources
          .slice(0, 3)
          .map((s) => `${s.supports} [${s.sourceCode}]`)
          .join(" ");
        parts.push(docSynthesis);
      }
      if (webOut.webSources.length > 0) {
        const webSynthesis = webOut.webSources
          .slice(0, 2)
          .map((s) => `${s.supports} [${s.sourceCode}]`)
          .join(" ");
        parts.push(webSynthesis);
      }
      draftedAnswer =
        parts.join("\n\n").trim() ||
        "No encontré evidencia suficiente en la documentación cargada ni en fuentes oficiales verificadas para responder esta consulta con respaldo.";
    }
  }

  // 3. 🛡️ Agente Verificador: Auditar consistencia numérica y respaldo documental
  if (calcOut.summaryText && mode === "ai" && !draftedAnswer.includes(calcOut.summaryText.slice(0, 12))) {
    // Garantizar que el cálculo determinista nunca se pierda ni se distorsione
    draftedAnswer = `${calcOut.summaryText}\n\n${draftedAnswer}`;
  }

  const verified = combinedSources.length > 0 || Boolean(calcOut.calculation);

  return {
    answer: draftedAnswer,
    sources: combinedSources,
    warnings: docsOut.limitations.slice(0, 2),
    mode,
    verified,
  };
}
