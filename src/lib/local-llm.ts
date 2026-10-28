import type { InitProgressReport, MLCEngineInterface } from "@mlc-ai/web-llm";
import { SourceFragment } from "./library";

export const DEFAULT_MODEL_ID = "Llama-3.2-1B-Instruct-q4f16_1-MLC";

export type LocalLLMStatus = "unloaded" | "loading" | "ready" | "error";

export interface ProgressCallbackData {
  progress: number;
  text: string;
}

export function isWebGPUSupported(nav?: Navigator): boolean {
  const targetNav = nav ?? (typeof navigator !== "undefined" ? navigator : undefined);
  if (!targetNav) return false;
  return "gpu" in targetNav && Boolean((targetNav as unknown as { gpu: unknown }).gpu);
}

export function formatGroundingPrompt(params: {
  question: string;
  snippets: SourceFragment[];
}): { systemPrompt: string; userPrompt: string } {
  const { question, snippets } = params;

  const systemPrompt = `Sos Surco, un asistente de información técnica para ingenieros agrónomos enfocado en la agricultura extensiva de Tandil y zona (provincia de Buenos Aires).

REGLAS DE ORO OBLIGATORIAS (CERO ALUCINACIÓN):
1. Solo responde usando estrictamente la información contenida en los fragmentos provistos abajo.
2. Si un dato no figura en los fragmentos (ej. dosis no listada, precio, normativa municipal de otro partido, compatibilidad química no mencionada), declara explícitamente: "No dispongo de evidencia documental suficiente en la biblioteca para afirmar este punto."
3. NUNCA inventes dosis comerciales, precios, marcas, resoluciones, títulos de normativas ni autorizaciones.
4. Explica siempre el límite de la evidencia disponible.
5. Responde en español rioplatense profesional y claro.`;

  let snippetsBlock = "";
  if (snippets.length === 0) {
    snippetsBlock = "No se encontraron fragmentos relevantes en la biblioteca documental para esta consulta específica.";
  } else {
    snippetsBlock = snippets
      .map(
        (s, idx) =>
          `[Fragmento ${idx + 1}] Código: ${s.sourceCode} | Fuente: ${s.institution} — "${s.title}" (${s.date ?? ""})\nSección: ${s.section ?? ""}\nLímite oficial: ${s.limitation}\nTexto: ${s.text}`
      )
      .join("\n\n");
  }

  const userPrompt = `A continuación se presentan los fragmentos documentales verificados disponibles:

${snippetsBlock}

Consulta del agrónomo:
"${question}"

Por favor, elaborá una respuesta basada exclusivamente en los fragmentos anteriores. Si los fragmentos no alcanzan para responder, señalá qué datos faltan.`;

  return { systemPrompt, userPrompt };
}

let engineInstance: MLCEngineInterface | null = null;
let currentStatus: LocalLLMStatus = "unloaded";
let currentProgress: ProgressCallbackData = { progress: 0, text: "" };

export function getLocalLLMStatus(): {
  status: LocalLLMStatus;
  progress: ProgressCallbackData;
  modelId: string;
} {
  return {
    status: currentStatus,
    progress: currentProgress,
    modelId: DEFAULT_MODEL_ID,
  };
}

export async function initLocalLLM(
  onProgress?: (data: ProgressCallbackData) => void,
  modelId: string = DEFAULT_MODEL_ID
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!isWebGPUSupported()) {
    currentStatus = "error";
    currentProgress = {
      progress: 0,
      text: "WebGPU no está disponible en este navegador o dispositivo.",
    };
    onProgress?.(currentProgress);
    return false;
  }

  if (engineInstance && currentStatus === "ready") {
    return true;
  }

  try {
    currentStatus = "loading";
    const { CreateMLCEngine } = await import("@mlc-ai/web-llm");

    const handleProgress = (report: InitProgressReport) => {
      currentProgress = {
        progress: report.progress,
        text: report.text,
      };
      onProgress?.(currentProgress);
    };

    engineInstance = await CreateMLCEngine(modelId, {
      initProgressCallback: handleProgress,
    });

    currentStatus = "ready";
    currentProgress = { progress: 1, text: "Modelo Llama 3.2 1B listo para inferencia local" };
    onProgress?.(currentProgress);
    return true;
  } catch (err) {
    console.error("Error al inicializar WebLLM local:", err);
    currentStatus = "error";
    currentProgress = {
      progress: 0,
      text: "Error al descargar o cargar los pesos del modelo.",
    };
    onProgress?.(currentProgress);
    return false;
  }
}

export async function generateLocalGroundedResponse(params: {
  question: string;
  snippets: SourceFragment[];
  onToken?: (partialText: string) => void;
}): Promise<string | null> {
  if (!engineInstance || currentStatus !== "ready") {
    return null;
  }

  const { systemPrompt, userPrompt } = formatGroundingPrompt({
    question: params.question,
    snippets: params.snippets,
  });

  try {
    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userPrompt },
    ];

    const chunks = await engineInstance.chat.completions.create({
      messages,
      temperature: 0.1,
      stream: true,
    });

    let fullAnswer = "";
    for await (const chunk of chunks) {
      const delta = chunk.choices[0]?.delta?.content || "";
      fullAnswer += delta;
      params.onToken?.(fullAnswer);
    }

    return fullAnswer.trim();
  } catch (err) {
    console.error("Error en inferencia local con WebLLM:", err);
    return null;
  }
}

export async function unloadLocalLLM(): Promise<void> {
  if (engineInstance) {
    try {
      await engineInstance.unload();
    } catch {
      // ignore
    }
    engineInstance = null;
  }
  currentStatus = "unloaded";
  currentProgress = { progress: 0, text: "" };
}
