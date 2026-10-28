// Capa de proveedor de IA multi-motor (Groq Llama 3.3, Google Gemini, Anthropic Claude),
// desacoplada de la recuperación documental y usada por el Agente Orquestador y el Redactor.

export interface AiCompletionRequest {
  system: string;
  question: string;
}

export interface AiCompletionResult {
  text: string;
  provider?: "groq" | "gemini" | "anthropic";
}

export function isAiConfigured(): boolean {
  return Boolean(
    process.env.GROQ_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.ANTHROPIC_API_KEY
  );
}

export async function completeWithAi(req: AiCompletionRequest): Promise<AiCompletionResult> {
  // 1. Groq (Llama 3.3 70B Versatile — gratuito y de baja latencia)
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 1024,
        messages: [
          { role: "system", content: req.system },
          { role: "user", content: req.question },
        ],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (typeof text === "string" && text.trim()) {
        return { text: text.trim(), provider: "groq" };
      }
    }
  }

  // 2. Google Gemini API
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: req.system }] },
          contents: [{ role: "user", parts: [{ text: req.question }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
        }),
      }
    );
    if (res.ok) {
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof text === "string" && text.trim()) {
        return { text: text.trim(), provider: "gemini" };
      }
    }
  }

  // 3. Anthropic (Claude)
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    throw new Error("Ninguna API Key de IA (GROQ_API_KEY, GEMINI_API_KEY o ANTHROPIC_API_KEY) está configurada");
  }

  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": anthropicKey,
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
  return { text, provider: "anthropic" };
}
