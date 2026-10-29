import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    let audioBlob: Blob | null = null;
    let mimeType = "audio/webm";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") || formData.get("audio");
      if (file && typeof file === "object" && "arrayBuffer" in file) {
        audioBlob = file as Blob;
        mimeType = (file as Blob).type || "audio/webm";
      }
    } else if (contentType.includes("application/json")) {
      const body = await req.json();
      if (typeof body.audioBase64 === "string" && body.audioBase64) {
        const buffer = Buffer.from(body.audioBase64, "base64");
        mimeType = body.mimeType || "audio/webm";
        audioBlob = new Blob([buffer], { type: mimeType });
      }
    }

    if (!audioBlob) {
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo de audio válido." },
        { status: 400 }
      );
    }

    // 1. Intentar con Groq Whisper (ultra rápido y gratuito)
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      try {
        const whisperForm = new FormData();
        const extension = mimeType.includes("mp4") || mimeType.includes("m4a") ? "m4a" : "webm";
        whisperForm.append("file", audioBlob, `audio.${extension}`);
        whisperForm.append("model", "whisper-large-v3-turbo");
        whisperForm.append("language", "es");
        whisperForm.append("temperature", "0");

        const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${groqKey}`,
          },
          body: whisperForm,
        });

        if (groqRes.ok) {
          const data = await groqRes.json();
          if (typeof data.text === "string" && data.text.trim()) {
            return NextResponse.json({
              text: data.text.trim(),
              provider: "groq-whisper",
            });
          }
        } else {
          console.warn("Groq Whisper error:", groqRes.status, await groqRes.text().catch(() => ""));
        }
      } catch (err) {
        console.warn("Fallo llamada a Groq Whisper:", err);
      }
    }

    // 2. Intentar con Gemini Multimodal Audio
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: "Transcribe con precisión todo lo dicho en este audio agronómico en español. Devuelve EXCLUSIVAMENTE el texto transcripto exacto, sin comentarios, sin comillas ni aclaraciones.",
                    },
                    {
                      inlineData: {
                        mimeType,
                        data: base64,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 1024,
              },
            }),
          }
        );

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (typeof text === "string" && text.trim()) {
            return NextResponse.json({
              text: text.trim(),
              provider: "gemini",
            });
          }
        } else {
          console.warn("Gemini audio error:", geminiRes.status, await geminiRes.text().catch(() => ""));
        }
      } catch (err) {
        console.warn("Fallo llamada a Gemini Audio:", err);
      }
    }

    return NextResponse.json(
      {
        error:
          "No hay un servicio de transcripción disponible en el servidor (GROQ_API_KEY o GEMINI_API_KEY requeridos si no se utiliza el reconocimiento de voz del navegador).",
      },
      { status: 503 }
    );
  } catch (err) {
    console.error("Error al transcribir audio:", err);
    return NextResponse.json(
      { error: "Error interno al procesar el audio." },
      { status: 500 }
    );
  }
}
