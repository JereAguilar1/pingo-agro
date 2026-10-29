import { NextRequest, NextResponse } from "next/server";
import { extractLoteFromText } from "@/lib/lote-extraction";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido." }, { status: 400 });
  }

  const text = (body as { text?: unknown })?.text;
  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "Falta el campo 'text' (texto no vacío)." }, { status: 400 });
  }
  if (text.length > 4000) {
    return NextResponse.json({ error: "El texto es demasiado largo." }, { status: 400 });
  }

  try {
    const result = await extractLoteFromText(text);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Error extrayendo datos del lote:", err);
    return NextResponse.json({ error: "No se pudo procesar el audio." }, { status: 500 });
  }
}
