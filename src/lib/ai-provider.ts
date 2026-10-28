// Capa de proveedor de IA, desacoplada de la recuperación documental.
// Se usa SOLO en el servidor: la clave nunca llega al navegador.

export interface AiCompletionRequest {
  system: string;
  question: string;
}

export interface AiCompletionResult {
  text: string;
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Llama al modelo configurado (Claude, vía Anthropic Messages API) para redactar
 * la respuesta a partir de la evidencia ya recuperada. Si no hay clave configurada,
 * el llamador debe usar el modo de demostración en su lugar: esta función nunca
 * debe invocarse sin antes comprobar isAiConfigured().
 */
export async function completeWithAi(req: AiCompletionRequest): Promise<AiCompletionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY no está configurada");
  }

  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: req.system,
      messages: [{ role: "user", content: req.question }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Error del proveedor de IA (${res.status}): ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("El proveedor de IA devolvió una respuesta vacía");
  }
  return { text };
}
