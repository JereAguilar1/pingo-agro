import { NextRequest, NextResponse } from "next/server";
import { respond } from "@/lib/respond";
import { isAiConfigured } from "@/lib/ai-provider";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido." }, { status: 400 });
  }

  const question = (body as { question?: unknown })?.question;
  if (typeof question !== "string" || !question.trim()) {
    return NextResponse.json(
      { error: "Falta el campo 'question' (texto no vacío)." },
      { status: 400 }
    );
  }

  if (question.length > 4000) {
    return NextResponse.json(
      { error: "La consulta es demasiado larga (máximo 4000 caracteres)." },
      { status: 400 }
    );
  }

  try {
    const result = await respond(question);
    return NextResponse.json({ response: result, aiConfigured: isAiConfigured() });
  } catch (err) {
    console.error("Error procesando la consulta:", err);
    return NextResponse.json(
      { error: "Ocurrió un error procesando la consulta. Probá de nuevo." },
      { status: 500 }
    );
  }
}
